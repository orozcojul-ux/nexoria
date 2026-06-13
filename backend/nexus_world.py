"""NEXORIA Nexus Online V2 — premium 2D isometric MMORPG social hub.

A Socket.IO server mounted on the FastAPI ASGI app providing:
- Isometric world: real-time position updates with grid-based tile coords
- Player presence (join/leave) with per-player state (muted/frozen/invisible)
- Local chat with chat bubbles broadcast above avatars
- Game Master controls (kick, ban, mute, freeze, teleport, announce,
  spawn item, weather, invisible mode) restricted to staff roles
- World weather state per room (clear/rain/storm/eclipse/aurora)
- Spawned items list per room (collectible, ephemeral)
- MongoDB persistence: every GM action audited in `gm_audit_log`

Auth is verified via the existing NEXORIA session token passed in
Socket.IO handshake (auth: {token}). All connections re-validate on connect
and re-check on every privileged event.
"""
import asyncio
import logging
import time
import uuid
from datetime import datetime, timezone, timedelta

import socketio

from auth import get_user_by_token

logger = logging.getLogger("nexoria.nexus")

# ---------- Rooms ----------
ROOMS = {
    "place_centrale": {
        "id": "place_centrale",
        "name": "Place Centrale",
        "description": "Le cœur cosmique de NEXORIA — point de rendez-vous de tous les héros",
        "tiles_x": 24, "tiles_y": 24,
        "spawn": {"tx": 12, "ty": 12},
        "theme": "cosmic",
        "max_players": 50,
    },
    "taverne_etoilee": {
        "id": "taverne_etoilee",
        "name": "Taverne Étoilée",
        "description": "Là où les héros se reposent entre deux quêtes",
        "tiles_x": 20, "tiles_y": 18,
        "spawn": {"tx": 10, "ty": 9},
        "theme": "tavern",
        "max_players": 30,
    },
    "arene": {
        "id": "arene",
        "name": "Arène des Présages",
        "description": "Une scène ouverte pour les événements live",
        "tiles_x": 28, "tiles_y": 28,
        "spawn": {"tx": 14, "ty": 14},
        "theme": "arena",
        "max_players": 100,
    },
}
DEFAULT_ROOM = "place_centrale"

STAFF_ROLES = {"admin", "moderator"}
WEATHERS = {"clear", "rain", "storm", "eclipse", "aurora"}
CHAT_CHANNELS = {"global", "room", "guild", "whisper", "trade", "event"}

# In-memory state
_players = {}                       # sid → full player record
_rooms_state = {r: {} for r in ROOMS}   # room_id → {sid: lite}
_chat_buffer = {r: [] for r in ROOMS}   # room_id → [last 60 msgs]
_room_weather = {r: "clear" for r in ROOMS}   # room_id → weather str
_room_items = {r: [] for r in ROOMS}    # room_id → [spawned items]
_user_sids = {}                     # user_id → set(sid) for fast lookups + multi-tab support
_global_state = {"started_at": time.time()}

_db_ref = None  # set in build_socketio_app
_sio_ref = None  # set in build_socketio_app — needed for cross-module push


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


async def _audit(action: str, actor: dict, target: dict | None = None, payload: dict | None = None):
    """Persist a GM action to gm_audit_log."""
    if _db_ref is None:
        return
    doc = {
        "audit_id": f"gm_{uuid.uuid4().hex[:12]}",
        "action": action,
        "actor_user_id": actor.get("user_id"),
        "actor_username": actor.get("username"),
        "actor_role": actor.get("role"),
        "target_user_id": (target or {}).get("user_id"),
        "target_username": (target or {}).get("username"),
        "payload": payload or {},
        "created_at": _now_iso(),
    }
    try:
        await _db_ref.gm_audit_log.insert_one(doc)
    except Exception as e:
        logger.warning(f"[gm_audit] insert failed: {e}")


def _lite(p: dict, viewer_role: str = "user") -> dict:
    """Public-safe slice. Invisible players are hidden from non-staff viewers."""
    out = {
        "sid": p["sid"], "user_id": p["user_id"], "username": p["username"],
        "class_id": p["class_id"], "class_name": p["class_name"],
        "level": p["level"], "role": p["role"],
        "active_title": p.get("active_title"),
        "rank": p.get("rank"),
        "guild_id": p.get("guild_id"),
        "avatar_url": p.get("avatar_url"),
        "tx": p["tx"], "ty": p["ty"], "room": p["room"],
        "muted": bool(p.get("muted")),
        "frozen": bool(p.get("frozen")),
        "invisible": bool(p.get("invisible")),
        "facing": p.get("facing", "SE"),
    }
    return out


def _visible_players_for(viewer: dict):
    """Returns the list of player_lite a given viewer sees in their room."""
    if not viewer:
        return []
    room = viewer["room"]
    viewer_role = viewer.get("role", "user")
    out = []
    for sid, p in _rooms_state[room].items():
        if p.get("invisible") and viewer_role not in STAFF_ROLES and sid != viewer["sid"]:
            continue
        out.append(p)
    return out


def build_socketio_app(db):
    """Build & return the ASGI app wrapping the Socket.IO server."""
    global _db_ref, _sio_ref
    _db_ref = db
    sio = socketio.AsyncServer(
        async_mode="asgi",
        cors_allowed_origins="*",
        ping_interval=25, ping_timeout=20,
        max_http_buffer_size=10_000,
    )
    _sio_ref = sio

    # -------------- Connection lifecycle --------------
    @sio.event
    async def connect(sid, environ, auth):
        token = (auth or {}).get("token")
        if not token:
            logger.info(f"[nexus] reject {sid}: no token")
            return False
        user = await get_user_by_token(token, db)
        if not user:
            logger.info(f"[nexus] reject {sid}: invalid token")
            return False
        # Ban check
        bu = user.get("banned_until")
        if bu:
            try:
                bu_dt = datetime.fromisoformat(bu) if isinstance(bu, str) else bu
                if bu_dt.tzinfo is None:
                    bu_dt = bu_dt.replace(tzinfo=timezone.utc)
                if bu_dt > datetime.now(timezone.utc):
                    return False
            except Exception:
                pass

        # Look up guild membership
        guild_id = None
        try:
            guild = await db.guilds.find_one({"members.user_id": user["user_id"]}, {"guild_id": 1})
            if guild:
                guild_id = guild.get("guild_id")
        except Exception:
            pass

        room = DEFAULT_ROOM
        spawn = ROOMS[room]["spawn"]
        player = {
            "sid": sid,
            "user_id": user["user_id"],
            "username": user["username"],
            "class_id": user.get("class_id", "explorer"),
            "class_name": user.get("class_name", "Explorateur"),
            "level": user.get("level", 1),
            "role": user.get("role", "user"),
            "active_title": user.get("active_title", "novice"),
            "rank": user.get("rank", "Novice"),
            "avatar_url": user.get("avatar_url"),
            "guild_id": guild_id,
            "tx": spawn["tx"], "ty": spawn["ty"],
            "room": room,
            "facing": "SE",
            "muted": False, "frozen": False, "invisible": False,
            "joined_at": time.time(),
        }
        _players[sid] = player
        _user_sids.setdefault(user["user_id"], set()).add(sid)
        _rooms_state[room][sid] = _lite(player)
        await sio.enter_room(sid, room)

        # Send room snapshot to the new player
        await sio.emit("room_joined", {
            "room": ROOMS[room],
            "players": _visible_players_for(player),
            "chat_history": _chat_buffer[room][-40:],
            "weather": _room_weather[room],
            "items": _room_items[room],
            "you": _lite(player),
            "is_staff": player["role"] in STAFF_ROLES,
        }, to=sid)

        # Broadcast arrival (skip if invisible)
        if not player["invisible"]:
            # Non-staff peers: only broadcast if non-invisible
            await sio.emit("player_join", _lite(player), to=room, skip_sid=sid)
        logger.info(f"[nexus] {user['username']} ({player['role']}) joined {room}")
        return True

    @sio.event
    async def disconnect(sid):
        p = _players.pop(sid, None)
        if not p:
            return
        room = p["room"]
        _rooms_state[room].pop(sid, None)
        s = _user_sids.get(p["user_id"])
        if s:
            s.discard(sid)
            if not s:
                _user_sids.pop(p["user_id"], None)
        await sio.emit("player_leave", {"sid": sid, "user_id": p["user_id"]}, to=room)
        logger.info(f"[nexus] {p['username']} left {room}")

    # -------------- Movement --------------
    @sio.event
    async def move(sid, data):
        """data = {tx, ty, facing}. Tile coordinates."""
        p = _players.get(sid)
        if not p or p.get("frozen"):
            return
        room_cfg = ROOMS[p["room"]]
        try:
            tx = int(data.get("tx", p["tx"]))
            ty = int(data.get("ty", p["ty"]))
        except (TypeError, ValueError):
            return
        tx = max(0, min(room_cfg["tiles_x"] - 1, tx))
        ty = max(0, min(room_cfg["tiles_y"] - 1, ty))
        # Prevent jumping more than 2 tiles per emit
        if abs(tx - p["tx"]) > 2 or abs(ty - p["ty"]) > 2:
            return
        facing = data.get("facing")
        if facing in ("N", "S", "E", "W", "NE", "NW", "SE", "SW"):
            p["facing"] = facing
        p["tx"], p["ty"] = tx, ty
        _rooms_state[p["room"]][sid] = _lite(p)
        # Invisible players don't broadcast movement
        if not p.get("invisible"):
            await sio.emit("player_move", {
                "sid": sid, "user_id": p["user_id"], "tx": tx, "ty": ty, "facing": p["facing"],
            }, to=p["room"], skip_sid=sid)
        else:
            # Only broadcast to staff in the room
            for other_sid, other in _rooms_state[p["room"]].items():
                if other_sid != sid and other.get("role") in STAFF_ROLES:
                    await sio.emit("player_move", {
                        "sid": sid, "user_id": p["user_id"], "tx": tx, "ty": ty, "facing": p["facing"],
                    }, to=other_sid)

    # -------------- Chat --------------
    # -------------- Chat (multi-channel) --------------
    @sio.event
    async def chat(sid, data):
        p = _players.get(sid)
        if not p:
            return
        if p.get("muted"):
            await sio.emit("system_msg", {"kind": "muted", "text": "Vous êtes réduit au silence."}, to=sid)
            return
        text = (data or {}).get("text", "").strip()
        if not text or len(text) > 280:
            return
        channel = (data or {}).get("channel", "room")
        if channel not in CHAT_CHANNELS:
            channel = "room"
        target_user_id = (data or {}).get("target_user_id")

        # Event channel is staff-only (server-wide live event announcements)
        if channel == "event" and p["role"] not in STAFF_ROLES:
            await sio.emit("system_msg", {"kind": "error", "text": "Canal Événement réservé aux Gardiens."}, to=sid)
            return

        msg = {
            "ts": time.time(),
            "channel": channel,
            "user_id": p["user_id"],
            "username": p["username"],
            "role": p["role"],
            "class_name": p["class_name"],
            "level": p["level"],
            "text": text,
        }
        if channel == "whisper":
            if not target_user_id:
                return
            target_sids = list(_user_sids.get(target_user_id, set()))
            if not target_sids:
                await sio.emit("system_msg", {"kind": "error", "text": "Destinataire hors-ligne."}, to=sid)
                return
            target_p = next((_players[ts] for ts in target_sids if ts in _players), None)
            msg["target_user_id"] = target_user_id
            msg["target_username"] = target_p["username"] if target_p else target_user_id
            # Echo to sender + send to all of target's sids
            await sio.emit("chat", msg, to=sid)
            for ts in target_sids:
                await sio.emit("chat", msg, to=ts)
            return
        if channel == "guild":
            if not p.get("guild_id"):
                await sio.emit("system_msg", {"kind": "error", "text": "Vous n'avez pas de guilde."}, to=sid)
                return
            msg["guild_id"] = p["guild_id"]
            for other_sid, other in _players.items():
                if other.get("guild_id") == p["guild_id"]:
                    await sio.emit("chat", msg, to=other_sid)
            return
        if channel == "global" or channel == "trade" or channel == "event":
            # Broadcast to every connected player
            for other_sid in _players:
                await sio.emit("chat", msg, to=other_sid)
            return
        # Default: room channel (local)
        room = p["room"]
        buf = _chat_buffer[room]
        buf.append(msg)
        del buf[:-60]
        await sio.emit("chat", msg, to=room)

    @sio.event
    async def change_room(sid, data):
        p = _players.get(sid)
        if not p:
            return
        new_room = data.get("room")
        if new_room not in ROOMS or new_room == p["room"]:
            return
        if len(_rooms_state[new_room]) >= ROOMS[new_room]["max_players"]:
            await sio.emit("error_msg", {"reason": "room_full"}, to=sid)
            return
        old_room = p["room"]
        _rooms_state[old_room].pop(sid, None)
        await sio.leave_room(sid, old_room)
        await sio.emit("player_leave", {"sid": sid, "user_id": p["user_id"]}, to=old_room)

        spawn = ROOMS[new_room]["spawn"]
        p["room"] = new_room
        p["tx"], p["ty"] = spawn["tx"], spawn["ty"]
        _rooms_state[new_room][sid] = _lite(p)
        await sio.enter_room(sid, new_room)
        await sio.emit("room_joined", {
            "room": ROOMS[new_room],
            "players": _visible_players_for(p),
            "chat_history": _chat_buffer[new_room][-40:],
            "weather": _room_weather[new_room],
            "items": _room_items[new_room],
            "you": _lite(p),
            "is_staff": p["role"] in STAFF_ROLES,
        }, to=sid)
        if not p.get("invisible"):
            await sio.emit("player_join", _lite(p), to=new_room, skip_sid=sid)

    @sio.event
    async def pickup_item(sid, data):
        p = _players.get(sid)
        if not p:
            return
        item_id = (data or {}).get("item_id")
        room = p["room"]
        items = _room_items[room]
        item = next((it for it in items if it["item_id"] == item_id), None)
        if not item:
            return
        # Distance check (tiles)
        if abs(item["tx"] - p["tx"]) > 1 or abs(item["ty"] - p["ty"]) > 1:
            await sio.emit("system_msg", {"kind": "info", "text": "Approchez-vous de la relique pour la ramasser."}, to=sid)
            return
        _room_items[room] = [it for it in items if it["item_id"] != item_id]
        await sio.emit("item_removed", {"item_id": item_id}, to=room)
        await sio.emit("system_msg", {
            "kind": "pickup",
            "text": f"Vous avez ramassé : {item['name']}",
            "item": item,
        }, to=sid)
        # Persist item to user inventory if game data id present
        try:
            if item.get("template_id") and _db_ref is not None:
                from game_data import ITEM_TEMPLATES
                tpl = next((t for t in ITEM_TEMPLATES if t["id"] == item["template_id"]), None)
                if tpl:
                    existing = await _db_ref.inventory.find_one({"user_id": p["user_id"], "name": tpl["name"], "rarity": tpl["rarity"]})
                    if not existing:
                        await _db_ref.inventory.insert_one({
                            "inv_id": f"inv_{uuid.uuid4().hex[:12]}",
                            "user_id": p["user_id"],
                            "template_id": tpl["id"],
                            "name": tpl["name"],
                            "rarity": tpl["rarity"],
                            "icon": tpl.get("icon", "✨"),
                            "obtained_at": _now_iso(),
                            "source": "nexus_spawn",
                        })
        except Exception as e:
            logger.warning(f"[nexus] pickup persistence failed: {e}")

    # ====================================================================
    # ============== GAME MASTER (STAFF-ONLY) COMMANDS ===================
    # ====================================================================
    def _require_staff(sid):
        p = _players.get(sid)
        if not p or p.get("role") not in STAFF_ROLES:
            return None
        return p

    def _find_target_by_user_id(user_id: str):
        for sid, p in _players.items():
            if p["user_id"] == user_id:
                return p
        return None

    async def _send_err(sid, text):
        await sio.emit("system_msg", {"kind": "error", "text": text}, to=sid)

    async def _send_ok(sid, text):
        await sio.emit("system_msg", {"kind": "ok", "text": text}, to=sid)

    @sio.event
    async def gm_announce(sid, data):
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        text = (data or {}).get("text", "").strip()
        if not text or len(text) > 240:
            return await _send_err(sid, "Annonce invalide (1-240 caractères).")
        payload = {
            "ts": time.time(),
            "by_username": gm["username"], "by_role": gm["role"],
            "text": text,
        }
        # Broadcast to every room
        for room_id in ROOMS:
            await sio.emit("gm_announce", payload, to=room_id)
        await _audit("announce", gm, None, {"text": text})

    @sio.event
    async def gm_teleport(sid, data):
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        target_user_id = (data or {}).get("target_user_id")
        tx, ty = data.get("tx"), data.get("ty")
        target = _find_target_by_user_id(target_user_id) if target_user_id else None
        # If no target user, teleport self
        room_id = (target or gm)["room"]
        room_cfg = ROOMS[room_id]
        try:
            tx = int(tx)
            ty = int(ty)
        except (TypeError, ValueError):
            return await _send_err(sid, "Coordonnées invalides.")
        tx = max(0, min(room_cfg["tiles_x"] - 1, tx))
        ty = max(0, min(room_cfg["tiles_y"] - 1, ty))
        subject = target or gm
        subject["tx"], subject["ty"] = tx, ty
        _rooms_state[room_id][subject["sid"]] = _lite(subject)
        await sio.emit("player_move", {
            "sid": subject["sid"], "user_id": subject["user_id"], "tx": tx, "ty": ty,
            "facing": subject.get("facing", "SE"), "teleport": True,
        }, to=room_id)
        await _send_ok(sid, f"Téléporté : {subject['username']} → ({tx},{ty})")
        await _audit("teleport", gm, subject, {"tx": tx, "ty": ty})

    @sio.event
    async def gm_kick(sid, data):
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        target_user_id = (data or {}).get("target_user_id")
        reason = (data or {}).get("reason", "").strip()[:120]
        target = _find_target_by_user_id(target_user_id)
        if not target:
            return await _send_err(sid, "Cible introuvable dans le Nexus.")
        if target["role"] in STAFF_ROLES and target["user_id"] != gm["user_id"]:
            return await _send_err(sid, "Impossible d'expulser un autre Gardien.")
        target_sid = target["sid"]
        await sio.emit("kicked", {"reason": reason or "Expulsé du Nexus par un Gardien."}, to=target_sid)
        await _audit("kick", gm, target, {"reason": reason})
        # Disconnect after a short delay so the client receives the toast
        async def _later_disconnect(s):
            await asyncio.sleep(1.5)
            await sio.disconnect(s)
        asyncio.create_task(_later_disconnect(target_sid))

    @sio.event
    async def gm_mute(sid, data):
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        target_user_id = (data or {}).get("target_user_id")
        muted = bool((data or {}).get("muted", True))
        target = _find_target_by_user_id(target_user_id)
        if not target:
            return await _send_err(sid, "Cible introuvable.")
        if target["role"] in STAFF_ROLES and target["user_id"] != gm["user_id"]:
            return await _send_err(sid, "Impossible de museler un Gardien.")
        target["muted"] = muted
        _rooms_state[target["room"]][target["sid"]] = _lite(target)
        await sio.emit("player_status", {
            "sid": target["sid"], "user_id": target["user_id"], "muted": muted,
        }, to=target["room"])
        await sio.emit("system_msg", {
            "kind": "warn" if muted else "info",
            "text": "Vous avez été réduit au silence par un Gardien." if muted else "Votre voix vous est rendue.",
        }, to=target["sid"])
        await _send_ok(sid, f"{target['username']} {'muet' if muted else 'libéré'}.")
        await _audit("mute" if muted else "unmute", gm, target, {"muted": muted})

    @sio.event
    async def gm_freeze(sid, data):
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        target_user_id = (data or {}).get("target_user_id")
        frozen = bool((data or {}).get("frozen", True))
        target = _find_target_by_user_id(target_user_id)
        if not target:
            return await _send_err(sid, "Cible introuvable.")
        if target["role"] in STAFF_ROLES and target["user_id"] != gm["user_id"]:
            return await _send_err(sid, "Impossible de figer un Gardien.")
        target["frozen"] = frozen
        _rooms_state[target["room"]][target["sid"]] = _lite(target)
        await sio.emit("player_status", {
            "sid": target["sid"], "user_id": target["user_id"], "frozen": frozen,
        }, to=target["room"])
        await sio.emit("system_msg", {
            "kind": "warn" if frozen else "info",
            "text": "Vos pieds se sont changés en pierre." if frozen else "Vous pouvez à nouveau marcher.",
        }, to=target["sid"])
        await _send_ok(sid, f"{target['username']} {'figé' if frozen else 'libéré'}.")
        await _audit("freeze" if frozen else "unfreeze", gm, target, {"frozen": frozen})

    @sio.event
    async def gm_invisible(sid, data):
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        invisible = bool((data or {}).get("invisible", True))
        gm["invisible"] = invisible
        room = gm["room"]
        _rooms_state[room][sid] = _lite(gm)
        # Notify non-staff peers
        if invisible:
            for other_sid, other in _rooms_state[room].items():
                if other_sid != sid and other.get("role") not in STAFF_ROLES:
                    await sio.emit("player_leave", {"sid": sid, "user_id": gm["user_id"]}, to=other_sid)
        else:
            for other_sid, other in _rooms_state[room].items():
                if other_sid != sid and other.get("role") not in STAFF_ROLES:
                    await sio.emit("player_join", _lite(gm), to=other_sid)
        await _send_ok(sid, "Vous êtes invisible." if invisible else "Vous redevenez visible.")
        await _audit("invisible_on" if invisible else "invisible_off", gm, None, {})

    @sio.event
    async def gm_weather(sid, data):
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        weather = (data or {}).get("weather", "clear")
        room_id = (data or {}).get("room") or gm["room"]
        if weather not in WEATHERS or room_id not in ROOMS:
            return await _send_err(sid, "Paramètres météo invalides.")
        _room_weather[room_id] = weather
        await sio.emit("weather", {"room": room_id, "weather": weather}, to=room_id)
        await _send_ok(sid, f"Météo de {ROOMS[room_id]['name']} → {weather}")
        await _audit("weather", gm, None, {"room": room_id, "weather": weather})

    @sio.event
    async def gm_spawn_item(sid, data):
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        room_id = gm["room"]
        room_cfg = ROOMS[room_id]
        name = (data or {}).get("name", "Relique inconnue").strip()[:60] or "Relique"
        rarity = (data or {}).get("rarity", "rare")
        icon = (data or {}).get("icon", "✨")
        template_id = (data or {}).get("template_id")
        try:
            tx = int((data or {}).get("tx", gm["tx"]))
            ty = int((data or {}).get("ty", gm["ty"]))
        except (TypeError, ValueError):
            tx, ty = gm["tx"], gm["ty"]
        tx = max(0, min(room_cfg["tiles_x"] - 1, tx))
        ty = max(0, min(room_cfg["tiles_y"] - 1, ty))
        item = {
            "item_id": f"sp_{uuid.uuid4().hex[:10]}",
            "name": name, "rarity": rarity, "icon": icon,
            "tx": tx, "ty": ty,
            "spawned_by": gm["username"],
            "spawned_at": time.time(),
            "template_id": template_id,
        }
        _room_items[room_id].append(item)
        # Cap stored items per room
        if len(_room_items[room_id]) > 30:
            _room_items[room_id] = _room_items[room_id][-30:]
        await sio.emit("item_spawned", item, to=room_id)
        await _send_ok(sid, f"Relique invoquée : {name}")
        await _audit("spawn_item", gm, None, {"item": item})

    @sio.event
    async def gm_ban(sid, data):
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        target_user_id = (data or {}).get("target_user_id")
        duration_hours = int((data or {}).get("duration_hours", 24))
        reason = (data or {}).get("reason", "").strip()[:200] or "Comportement inapproprié"
        target = _find_target_by_user_id(target_user_id)
        if not target:
            return await _send_err(sid, "Cible introuvable dans le Nexus.")
        if target["role"] in STAFF_ROLES:
            return await _send_err(sid, "Impossible de bannir un Gardien.")
        # Moderator can only ban regular users
        if gm["role"] == "moderator" and target["role"] != "user":
            return await _send_err(sid, "Réservé aux Archontes.")
        until = datetime.now(timezone.utc) + timedelta(hours=max(1, min(duration_hours, 24 * 365)))
        try:
            await db.users.update_one(
                {"user_id": target["user_id"]},
                {"$set": {"banned_until": until.isoformat(), "ban_reason": reason}},
            )
            # Invalidate sessions
            await db.user_sessions.delete_many({"user_id": target["user_id"]})
            await db.ban_history.insert_one({
                "ban_id": f"ban_{uuid.uuid4().hex[:12]}",
                "user_id": target["user_id"],
                "banned_by": gm["user_id"],
                "banned_by_username": gm["username"],
                "reason": reason,
                "duration_hours": duration_hours,
                "until": until.isoformat(),
                "created_at": _now_iso(),
                "source": "nexus_gm",
            })
        except Exception as e:
            logger.error(f"[gm_ban] db failed: {e}")
            return await _send_err(sid, "Échec du bannissement (DB).")
        await sio.emit("kicked", {
            "reason": f"Banni du Nexus pour {duration_hours}h : {reason}",
        }, to=target["sid"])
        await _send_ok(sid, f"{target['username']} banni {duration_hours}h.")
        await _audit("ban", gm, target, {"hours": duration_hours, "reason": reason, "until": until.isoformat()})
        async def _later_disconnect(s):
            await asyncio.sleep(1.5)
            await sio.disconnect(s)
        asyncio.create_task(_later_disconnect(target["sid"]))

    # ============== NEW: TP swap, inspect, popup notification ==============
    @sio.event
    async def gm_tp_to_player(sid, data):
        """Move the GM to the target's tile."""
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        target = _find_target_by_user_id((data or {}).get("target_user_id"))
        if not target:
            return await _send_err(sid, "Cible introuvable.")
        # If different room, move GM to target's room first
        if gm["room"] != target["room"]:
            old_room = gm["room"]
            _rooms_state[old_room].pop(sid, None)
            await sio.leave_room(sid, old_room)
            await sio.emit("player_leave", {"sid": sid, "user_id": gm["user_id"]}, to=old_room)
            gm["room"] = target["room"]
            await sio.enter_room(sid, target["room"])
            gm["tx"], gm["ty"] = target["tx"], target["ty"]
            _rooms_state[target["room"]][sid] = _lite(gm)
            await sio.emit("room_joined", {
                "room": ROOMS[target["room"]],
                "players": _visible_players_for(gm),
                "chat_history": _chat_buffer[target["room"]][-40:],
                "weather": _room_weather[target["room"]],
                "items": _room_items[target["room"]],
                "you": _lite(gm),
                "is_staff": True,
            }, to=sid)
            if not gm.get("invisible"):
                await sio.emit("player_join", _lite(gm), to=target["room"], skip_sid=sid)
        else:
            gm["tx"], gm["ty"] = target["tx"], target["ty"]
            _rooms_state[gm["room"]][sid] = _lite(gm)
            await sio.emit("player_move", {
                "sid": sid, "user_id": gm["user_id"],
                "tx": gm["tx"], "ty": gm["ty"], "facing": gm["facing"], "teleport": True,
            }, to=gm["room"])
        await _send_ok(sid, f"Téléporté vers {target['username']}")
        await _audit("tp_to_player", gm, target, {"tx": target["tx"], "ty": target["ty"]})

    @sio.event
    async def gm_tp_player_to_me(sid, data):
        """Move target player to the GM's tile (cross-room teleport)."""
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        target = _find_target_by_user_id((data or {}).get("target_user_id"))
        if not target:
            return await _send_err(sid, "Cible introuvable.")
        if target["room"] != gm["room"]:
            old_room = target["room"]
            _rooms_state[old_room].pop(target["sid"], None)
            await sio.leave_room(target["sid"], old_room)
            await sio.emit("player_leave", {"sid": target["sid"], "user_id": target["user_id"]}, to=old_room)
            target["room"] = gm["room"]
            await sio.enter_room(target["sid"], gm["room"])
            target["tx"], target["ty"] = gm["tx"], gm["ty"]
            _rooms_state[gm["room"]][target["sid"]] = _lite(target)
            await sio.emit("room_joined", {
                "room": ROOMS[gm["room"]],
                "players": _visible_players_for(target),
                "chat_history": _chat_buffer[gm["room"]][-40:],
                "weather": _room_weather[gm["room"]],
                "items": _room_items[gm["room"]],
                "you": _lite(target),
                "is_staff": target["role"] in STAFF_ROLES,
            }, to=target["sid"])
            if not target.get("invisible"):
                await sio.emit("player_join", _lite(target), to=gm["room"], skip_sid=target["sid"])
        else:
            target["tx"], target["ty"] = gm["tx"], gm["ty"]
            _rooms_state[gm["room"]][target["sid"]] = _lite(target)
            await sio.emit("player_move", {
                "sid": target["sid"], "user_id": target["user_id"],
                "tx": target["tx"], "ty": target["ty"], "facing": target["facing"], "teleport": True,
            }, to=gm["room"])
        await sio.emit("system_msg", {
            "kind": "warn", "text": f"Vous avez été convoqué par {gm['username']}.",
        }, to=target["sid"])
        await _send_ok(sid, f"{target['username']} convoqué.")
        await _audit("tp_player_to_me", gm, target, {"tx": gm["tx"], "ty": gm["ty"]})

    @sio.event
    async def gm_inspect(sid, data):
        """Inspect a target player: returns inventory, stats, history."""
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        target_user_id = (data or {}).get("target_user_id")
        if not target_user_id:
            return await _send_err(sid, "Cible manquante.")
        try:
            user_doc = await db.users.find_one({"user_id": target_user_id}, {
                "_id": 0, "password_hash": 0, "google_id": 0, "discord_id": 0,
            }) or {}
            inv = await db.inventory.find({"user_id": target_user_id}, {"_id": 0}) \
                .sort("obtained_at", -1).limit(100).to_list(100)
            history = await db.chronicles.find({"user_id": target_user_id}, {"_id": 0}) \
                .sort("created_at", -1).limit(50).to_list(50)
            sanctions = await db.ban_history.find({"user_id": target_user_id}, {"_id": 0}) \
                .sort("created_at", -1).limit(20).to_list(20)
            purchases = await db.shop_purchases.find({"user_id": target_user_id}, {"_id": 0}) \
                .sort("purchased_at", -1).limit(30).to_list(30)
        except Exception as e:
            logger.error(f"[gm_inspect] {e}")
            return await _send_err(sid, "Échec de l'inspection.")
        await sio.emit("gm_inspect_result", {
            "target_user_id": target_user_id,
            "user": user_doc,
            "inventory": inv,
            "history": history,
            "sanctions": sanctions,
            "purchases": purchases,
        }, to=sid)
        await _audit("inspect", gm, {"user_id": target_user_id, "username": user_doc.get("username")}, {})

    @sio.event
    async def gm_popup_notify(sid, data):
        """Sends a popup notification to every connected player (modal)."""
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        title = (data or {}).get("title", "Décret du Conseil").strip()[:80] or "Décret du Conseil"
        body = (data or {}).get("body", "").strip()[:400]
        kind = (data or {}).get("kind", "info")  # info | warn | event
        if not body:
            return await _send_err(sid, "Message vide.")
        payload = {
            "ts": time.time(), "title": title, "body": body, "kind": kind,
            "by_username": gm["username"], "by_role": gm["role"],
        }
        for other_sid in _players:
            await sio.emit("gm_popup", payload, to=other_sid)
        await _send_ok(sid, "Notification envoyée à tous les héros.")
        await _audit("popup_notify", gm, None, {"title": title, "body": body, "kind": kind})

    return socketio.ASGIApp(sio, socketio_path="api/nexus/socket.io")


async def push_to_user(user_id: str, event: str, payload: dict):
    """Push a Socket.IO event to every connected sid of a given user_id.
    Used by `notifications.push_notification` to deliver real-time updates.
    """
    if _sio_ref is None:
        return
    sids = list(_user_sids.get(user_id, set()))
    for s in sids:
        try:
            await _sio_ref.emit(event, payload, to=s)
        except Exception:
            pass


def online_summary():
    """For the lobby REST endpoint."""
    return [
        {
            **ROOMS[r],
            "online": len(state),
            "weather": _room_weather[r],
        }
        for r, state in _rooms_state.items()
    ]
