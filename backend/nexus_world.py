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
import online_gate
from nexus_rooms import ROOMS, can_access, get_portal_links  # noqa: F401

logger = logging.getLogger("nexoria.nexus")


def _vip_active(user: dict) -> bool:
    """VIP based on vip_until (never on is_vip alone)."""
    if not user:
        return False
    vu = user.get("vip_until")
    if not vu:
        return False
    try:
        dt = datetime.fromisoformat(vu) if isinstance(vu, str) else vu
    except (ValueError, TypeError):
        return False
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt > datetime.now(timezone.utc)

DEFAULT_ROOM = "place_centrale"
NEXUS_PRESENCE_TTL_SEC = 4 * 3600  # restore last room/position within 4h

STAFF_ROLES = {"admin", "moderator"}
STAFF_ROLE_LABELS = {"admin": "Sage", "moderator": "Modérateur"}
STAFF_ROLE_ORDER = ("admin", "moderator")
WEATHERS = {"clear", "rain", "storm", "eclipse", "aurora"}
CHAT_CHANNELS = {"global", "room", "guild", "whisper", "trade", "event"}

# In-memory state (initialized lazily once ROOMS is loaded)
_players = {}
_rooms_state = {r: {} for r in ROOMS}
_chat_buffer = {r: [] for r in ROOMS}
_room_weather = {r: "clear" for r in ROOMS}
_room_items = {r: [] for r in ROOMS}
_room_world_state = {r: {"boss": None, "rift": None} for r in ROOMS}
_user_sids = {}
_global_state = {"started_at": time.time()}

_db_ref = None
_sio_ref = None
_hooks: dict = {}


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


async def _audit(action: str, actor: dict, target: dict | None = None, payload: dict | None = None):
    """Persist a GM action to gm_audit_log and push live entry to online staff."""
    if _db_ref is None:
        return None
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
    # Live stream to connected Gardiens
    if _sio_ref is not None:
        entry = {k: v for k, v in doc.items()}
        for sid, p in list(_players.items()):
            if p.get("role") in STAFF_ROLES:
                try:
                    await _sio_ref.emit("gm_log:new", entry, to=sid)
                except Exception:
                    pass
    return doc


def _staff_online_payload():
    """Online staff members deduped by user_id, grouped by role grade."""
    seen = set()
    members = []
    by_role = {role: 0 for role in STAFF_ROLE_ORDER}
    for p in _players.values():
        uid = p.get("user_id")
        role = p.get("role")
        if not uid or uid in seen or role not in STAFF_ROLES:
            continue
        if p.get("invisible"):
            continue
        seen.add(uid)
        by_role[role] = by_role.get(role, 0) + 1
        members.append({
            "user_id": uid,
            "username": p.get("username"),
            "role": role,
            "role_label": STAFF_ROLE_LABELS.get(role, role),
            "rank": p.get("rank"),
            "room": p.get("room"),
            "avatar_url": p.get("avatar_url"),
        })
    members.sort(key=lambda m: (STAFF_ROLE_ORDER.index(m["role"]) if m["role"] in STAFF_ROLE_ORDER else 9, m.get("username") or ""))
    return {"total": len(members), "by_role": by_role, "members": members}


def _presence_payload():
    """Returns {total, by_room, active_rooms, staff_online}.
    Dedupes by user_id so multi-tab = 1 hero. Self-heals against orphan
    _rooms_state entries by cross-checking with _user_sids.
    """
    by_room = {}
    visible_uids = set()
    for r, state in _rooms_state.items():
        uids = {
            p["user_id"] for p in state.values()
            if p["user_id"] in _user_sids and not p.get("invisible")
        }
        by_room[r] = len(uids)
        visible_uids |= uids
    total = len(visible_uids)
    active = sum(1 for n in by_room.values() if n > 0)
    return {
        "total": total,
        "by_room": by_room,
        "active_rooms": active,
        "staff_online": _staff_online_payload(),
    }


async def _broadcast_presence(sio):
    try:
        await sio.emit("presence:update", _presence_payload())
    except Exception as e:
        logger.warning(f"presence broadcast failed: {e}")


def _room_payload(room_id: str) -> dict:
    """Room descriptor enriched with portal links and live world entities."""
    base = dict(ROOMS[room_id])
    base["portals"] = get_portal_links(room_id)
    ws = _room_world_state.get(room_id, {})
    base["world_boss"] = ws.get("boss")
    base["active_rift"] = ws.get("rift")
    return base


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
        "active_frame": p.get("active_frame"),
        "active_banner": p.get("active_banner"),
        "active_aura_sku": p.get("active_aura_sku"),
        "active_mount": p.get("active_mount"),
        "is_vip": bool(p.get("is_vip")),
        "tx": p["tx"], "ty": p["ty"], "room": p["room"],
        "muted": bool(p.get("muted")),
        "frozen": bool(p.get("frozen")),
        "invisible": bool(p.get("invisible")),
        "facing": p.get("facing", "SE"),
    }
    return out


def _resolve_spawn(user: dict) -> tuple[str, int, int, str]:
    """Return (room_id, tx, ty, facing) — restore saved presence when recent."""
    room = DEFAULT_ROOM
    spawn = ROOMS[room]["spawn"]
    tx, ty, facing = spawn["tx"], spawn["ty"], "SE"
    pres = user.get("nexus_presence") or {}
    if not pres:
        return room, tx, ty, facing
    try:
        updated = pres.get("updated_at")
        if updated:
            updated_dt = datetime.fromisoformat(str(updated).replace("Z", "+00:00"))
            if updated_dt.tzinfo is None:
                updated_dt = updated_dt.replace(tzinfo=timezone.utc)
            age = (datetime.now(timezone.utc) - updated_dt).total_seconds()
            if age > NEXUS_PRESENCE_TTL_SEC:
                return room, tx, ty, facing
        saved_room = pres.get("room")
        if not saved_room or saved_room not in ROOMS:
            return room, tx, ty, facing
        allowed, _ = can_access(user, saved_room)
        if not allowed:
            return room, tx, ty, facing
        room = saved_room
        cfg = ROOMS[room]
        spawn = cfg["spawn"]
        tx = max(0, min(cfg["tiles_x"] - 1, int(pres.get("tx", spawn["tx"]))))
        ty = max(0, min(cfg["tiles_y"] - 1, int(pres.get("ty", spawn["ty"]))))
        facing = pres.get("facing") or "SE"
    except Exception as e:
        logger.warning(f"[nexus] restore presence failed: {e}")
    return room, tx, ty, facing


async def _persist_nexus_presence(user_id: str, room: str, tx: int, ty: int, facing: str):
    """Save last known Nexus location when the user fully disconnects."""
    if _db_ref is None:
        return
    try:
        await _db_ref.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "nexus_presence": {
                    "room": room,
                    "tx": tx,
                    "ty": ty,
                    "facing": facing,
                    "updated_at": _now_iso(),
                },
            }},
        )
    except Exception as e:
        logger.warning(f"[nexus] persist presence failed: {e}")


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


_watchdog_started = False


async def _remove_player_sid(sid, sio=None):
    """Shared cleanup when a player disconnects (manual kick or socket drop)."""
    p = _players.pop(sid, None)
    if not p:
        return None
    room = p["room"]
    _rooms_state[room].pop(sid, None)
    s = _user_sids.get(p["user_id"])
    if s:
        s.discard(sid)
        if not s:
            _user_sids.pop(p["user_id"], None)
            await _persist_nexus_presence(
                p["user_id"], p["room"], p["tx"], p["ty"], p.get("facing", "SE"),
            )
    if sio is not None:
        await sio.emit("player_leave", {"sid": sid, "user_id": p["user_id"]}, to=room)
        await _broadcast_presence(sio)
    return p


async def set_presence_hidden(user_id: str, hidden: bool):
    """Toggle a connected user's online visibility live (Settings → Serveur).
    Hidden players vanish from peers' world view and the online counter."""
    if _sio_ref is None or not user_id:
        return
    hidden = bool(hidden)
    changed = False
    for sid in list(_user_sids.get(user_id, set())):
        p = _players.get(sid)
        if not p or bool(p.get("invisible")) == hidden:
            continue
        p["invisible"] = hidden
        room = p["room"]
        if sid in _rooms_state.get(room, {}):
            _rooms_state[room][sid]["invisible"] = hidden
        changed = True
        try:
            if hidden:
                await _sio_ref.emit("player_leave", {"sid": sid, "user_id": user_id}, to=room, skip_sid=sid)
            else:
                await _sio_ref.emit("player_join", _lite(p), to=room, skip_sid=sid)
        except Exception as e:
            logger.warning(f"[nexus] set_presence_hidden emit failed: {e}")
    if changed:
        await _broadcast_presence(_sio_ref)


async def disconnect_user(user_id: str):
    """Force-disconnect all Nexus sockets for a user (logout, ban, session purge)."""
    if _sio_ref is None or not user_id:
        return
    sids = list(_user_sids.get(user_id, set()))
    for sid in sids:
        try:
            await _remove_player_sid(sid, _sio_ref)
            await _sio_ref.disconnect(sid)
        except Exception as e:
            logger.warning(f"[nexus] disconnect_user sid={sid} failed: {e}")


async def _session_presence_watchdog():
    """Kick Nexus sockets whose user no longer has a valid session."""
    while True:
        await asyncio.sleep(45)
        if _db_ref is None or _sio_ref is None:
            continue
        now_iso = datetime.now(timezone.utc).isoformat()
        for uid in list(_user_sids.keys()):
            try:
                session = await _db_ref.user_sessions.find_one({
                    "user_id": uid,
                    "expires_at": {"$gt": now_iso},
                })
                if not session:
                    await disconnect_user(uid)
            except Exception as e:
                logger.warning(f"[nexus] session watchdog uid={uid}: {e}")


def _ensure_presence_watchdog():
    global _watchdog_started
    if _watchdog_started:
        return
    _watchdog_started = True
    asyncio.create_task(_session_presence_watchdog())


def build_socketio_app(db, hooks=None):
    """Build & return the ASGI app wrapping the Socket.IO server."""
    global _db_ref, _sio_ref, _hooks
    _db_ref = db
    if hooks:
        _hooks.update(hooks)
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
        allowed, _ = await online_gate.nexus_access_for_user(db, user)
        if not allowed:
            logger.info(f"[nexus] reject {sid}: nexus online gate closed")
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
        room, tx, ty, facing = _resolve_spawn(user)
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
            "active_frame": user.get("active_frame"),
            "active_banner": user.get("active_banner"),
            "active_aura_sku": user.get("active_aura_sku"),
            "active_mount": user.get("active_mount"),
            "is_vip": _vip_active(user),
            "guild_id": guild_id,
            "tx": tx, "ty": ty,
            "room": room,
            "facing": facing,
            "muted": False, "frozen": False,
            "invisible": bool(user.get("appear_offline")),
            "joined_at": time.time(),
        }
        _players[sid] = player
        _user_sids.setdefault(user["user_id"], set()).add(sid)
        _rooms_state[room][sid] = _lite(player)
        await sio.enter_room(sid, room)

        # Send room snapshot to the new player
        await sio.emit("room_joined", {
            "room": _room_payload(room),
            "players": _visible_players_for(player),
            "chat_history": _chat_buffer[room][-40:],
            "weather": _room_weather[room],
            "items": _room_items[room],
            "you": _lite(player),
            "is_staff": player["role"] in STAFF_ROLES,
            "presence": _presence_payload(),
        }, to=sid)

        # Broadcast arrival (skip if invisible)
        if not player["invisible"]:
            # Non-staff peers: only broadcast if non-invisible
            await sio.emit("player_join", _lite(player), to=room, skip_sid=sid)
        # Global presence update (visible to everyone)
        await _broadcast_presence(sio)
        hook = _hooks.get("on_nexus_join")
        if hook:
            try:
                await hook(player["user_id"])
            except Exception as e:
                logger.warning(f"[nexus] on_nexus_join hook failed: {e}")
        _ensure_presence_watchdog()
        logger.info(f"[nexus] {user['username']} ({player['role']}) joined {room}")
        return True

    @sio.event
    async def disconnect(sid):
        p = await _remove_player_sid(sid, sio)
        if p:
            logger.info(f"[nexus] {p.get('username')} left {p.get('room')}")

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
        elif channel == "global" or channel == "trade" or channel == "event":
            # Broadcast to every connected player
            for other_sid in _players:
                await sio.emit("chat", msg, to=other_sid)
        else:
            # Default: room channel (local)
            room = p["room"]
            buf = _chat_buffer[room]
            buf.append(msg)
            del buf[:-60]
            await sio.emit("chat", msg, to=room)

        hook = _hooks.get("on_chat_message")
        if hook:
            try:
                await hook(p["user_id"], channel)
            except Exception as e:
                logger.warning(f"on_chat_message hook failed: {e}")

    @sio.event
    async def boss_attack(sid, data):
        """Strike the world boss in the current room — grants boss_slayer on defeat."""
        p = _players.get(sid)
        if not p:
            return
        room = p["room"]
        ws = _room_world_state.get(room) or {}
        boss = ws.get("boss")
        if not boss or boss.get("hp", 0) <= 0:
            await sio.emit("system_msg", {"kind": "error", "text": "Aucun boss à frapper ici."}, to=sid)
            return
        dmg = max(10, min(500, int((data or {}).get("damage", 0) or (p.get("level", 1) * 8 + 20))))
        boss["hp"] = max(0, boss.get("hp", 0) - dmg)
        attackers = boss.setdefault("attackers", [])
        if p["user_id"] not in attackers:
            attackers.append(p["user_id"])
        if boss["hp"] <= 0:
            defeated = list(attackers)
            ws["boss"] = None
            hook = _hooks.get("on_boss_defeated")
            if hook:
                try:
                    await hook(defeated)
                except Exception as e:
                    logger.warning(f"on_boss_defeated hook failed: {e}")
            for other_sid in _players:
                await sio.emit("world_boss_update", {"room": room, "boss": None}, to=other_sid)
                await sio.emit("system_msg", {
                    "kind": "event",
                    "text": f"⚔ {boss.get('name', 'Boss')} a été vaincu !",
                }, to=other_sid)
        else:
            for other_sid in list(_rooms_state.get(room, {}).keys()):
                await sio.emit("world_boss_update", {"room": room, "boss": boss}, to=other_sid)

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
        # Access check (rank/role restricted rooms)
        try:
            user_doc = await db.users.find_one({"user_id": p["user_id"]}, {
                "_id": 0, "role": 1, "active_title": 1, "rank": 1,
            })
        except Exception:
            user_doc = None
        ok, reason = can_access(user_doc or p, new_room)
        if not ok:
            await sio.emit("system_msg", {"kind": "error", "text": reason}, to=sid)
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
            "room": _room_payload(new_room),
            "players": _visible_players_for(p),
            "chat_history": _chat_buffer[new_room][-40:],
            "weather": _room_weather[new_room],
            "items": _room_items[new_room],
            "you": _lite(p),
            "is_staff": p["role"] in STAFF_ROLES,
            "presence": _presence_payload(),
        }, to=sid)
        if not p.get("invisible"):
            await sio.emit("player_join", _lite(p), to=new_room, skip_sid=sid)
        await _broadcast_presence(sio)

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
        persisted = False
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
                        persisted = True
        except Exception as e:
            logger.warning(f"[nexus] pickup persistence failed: {e}")
        if persisted:
            await push_inventory_updated(p["user_id"], "pickup", {
                "name": item.get("name"),
                "template_id": item.get("template_id"),
                "item_id": item_id,
            })

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
                "room": _room_payload(target["room"]),
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
                "room": _room_payload(gm["room"]),
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

    @sio.event
    async def gm_give_aether(sid, data):
        """Give or take aether from target. Negative amount to remove."""
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        target_user_id = (data or {}).get("target_user_id")
        try:
            amount = int((data or {}).get("amount", 0))
        except (TypeError, ValueError):
            return await _send_err(sid, "Montant invalide.")
        if not target_user_id or amount == 0:
            return await _send_err(sid, "Cible et montant requis.")
        amount = max(-1_000_000, min(1_000_000, amount))
        try:
            user_doc = await db.users.find_one({"user_id": target_user_id}, {"aether": 1, "username": 1})
            if not user_doc:
                return await _send_err(sid, "Utilisateur introuvable.")
            current = int(user_doc.get("aether", 0) or 0)
            new_val = max(0, current + amount)
            await db.users.update_one({"user_id": target_user_id}, {"$set": {"aether": new_val}})
        except Exception as e:
            logger.error(f"[gm_give_aether] {e}")
            return await _send_err(sid, "Échec en base.")
        await _send_ok(sid, f"{user_doc['username']} : {amount:+d}⟡ (= {new_val}⟡)")
        await _audit("give_aether", gm,
                     {"user_id": target_user_id, "username": user_doc.get("username")},
                     {"amount": amount, "new_balance": new_val})
        # Try notify target if connected
        try:
            from notifications import push_notification
            import discord_rewards
            await push_notification(db, target_user_id, "aether",
                                    "Le Conseil intervient",
                                    f"Un Gardien a ajusté votre Aether de {amount:+d}.",
                                    sound="chime", icon="Coins")
            if amount != 0:
                discord_rewards.schedule_reward_notify(
                    db, target_user_id, "Game Master",
                    aether=amount,
                    extra=[f"Solde : {new_val} Aether"],
                )
        except Exception:
            pass

    @sio.event
    async def gm_give_item(sid, data):
        """Spawn an item directly in target's inventory."""
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        target_user_id = (data or {}).get("target_user_id")
        name = (data or {}).get("name", "").strip()[:80]
        rarity = (data or {}).get("rarity", "rare")
        icon = (data or {}).get("icon", "✨")
        if not target_user_id or not name:
            return await _send_err(sid, "Cible et nom de la relique requis.")
        try:
            await db.inventory.insert_one({
                "inv_id": f"inv_{uuid.uuid4().hex[:12]}",
                "user_id": target_user_id,
                "template_id": "gm_grant",
                "name": name, "rarity": rarity, "icon": icon,
                "obtained_at": _now_iso(),
                "source": "gm_grant",
                "granted_by": gm["username"],
            })
        except Exception as e:
            logger.error(f"[gm_give_item] {e}")
            return await _send_err(sid, "Échec en base.")
        await _send_ok(sid, f"Relique « {name} » remise.")
        await _audit("give_item", gm, {"user_id": target_user_id},
                     {"name": name, "rarity": rarity, "icon": icon})
        try:
            from notifications import push_notification
            await push_notification(db, target_user_id, "item",
                                    "Don du Conseil",
                                    f"Vous recevez : {icon} {name} ({rarity}).",
                                    sound="chime", icon="Gift")
        except Exception:
            pass
        await push_inventory_updated(target_user_id, "gm_give", {
            "name": name,
            "rarity": rarity,
            "icon": icon,
        })

    @sio.event
    async def gm_prison(sid, data):
        """Send a player to a temporary prison (server-side state).
        Players in prison are frozen + muted. duration in minutes (0 = release).
        """
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        target_user_id = (data or {}).get("target_user_id")
        try:
            duration_min = int((data or {}).get("duration_min", 30))
        except (TypeError, ValueError):
            duration_min = 30
        target = _find_target_by_user_id(target_user_id)
        if not target:
            return await _send_err(sid, "Cible introuvable.")
        if target["role"] in STAFF_ROLES and target["user_id"] != gm["user_id"]:
            return await _send_err(sid, "Impossible d'emprisonner un Gardien.")
        release = duration_min <= 0
        target["frozen"] = not release
        target["muted"] = not release
        _rooms_state[target["room"]][target["sid"]] = _lite(target)
        await sio.emit("player_status", {
            "sid": target["sid"], "user_id": target["user_id"],
            "frozen": target["frozen"], "muted": target["muted"],
        }, to=target["room"])
        await sio.emit("system_msg", {
            "kind": "warn" if not release else "info",
            "text": (f"Vous êtes en prison ({duration_min}min)." if not release else "Vous êtes libéré."),
        }, to=target["sid"])
        await _send_ok(sid, f"{target['username']} {'emprisonné' if not release else 'libéré'}.")
        await _audit("prison" if not release else "release", gm, target,
                     {"duration_min": duration_min if not release else 0})
        if not release:
            # Auto-release after duration
            async def _later_release(sid_target, uid):
                await asyncio.sleep(max(60, duration_min * 60))
                p2 = _players.get(sid_target)
                if not p2 or p2["user_id"] != uid:
                    return
                p2["frozen"] = False
                p2["muted"] = False
                _rooms_state[p2["room"]][sid_target] = _lite(p2)
                try:
                    await sio.emit("player_status", {
                        "sid": sid_target, "user_id": p2["user_id"],
                        "frozen": False, "muted": False,
                    }, to=p2["room"])
                    await sio.emit("system_msg", {
                        "kind": "info", "text": "Votre peine est terminée. Vous êtes libéré.",
                    }, to=sid_target)
                except Exception:
                    pass
            asyncio.create_task(_later_release(target["sid"], target["user_id"]))

    @sio.event
    async def gm_world_boss(sid, data):
        """Spawn a world boss in the current room — broadcast event."""
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        name = (data or {}).get("name", "Archonte du Néant").strip()[:60] or "Archonte"
        hp = max(100, min(1_000_000, int((data or {}).get("hp", 10000) or 10000)))
        boss = {
            "boss_id": f"boss_{uuid.uuid4().hex[:10]}",
            "name": name, "hp": hp, "max_hp": hp,
            "spawned_by": gm["username"],
            "spawned_at": time.time(),
            "tx": ROOMS[gm["room"]]["spawn"]["tx"],
            "ty": ROOMS[gm["room"]]["spawn"]["ty"] + 2,
            "room": gm["room"],
        }
        _room_world_state[gm["room"]]["boss"] = boss
        # Announce globally (toast) + sync canvas in the boss room
        for other_sid in _players:
            await sio.emit("world_boss_spawn", boss, to=other_sid)
        for other_sid in list(_rooms_state[gm["room"]].keys()):
            await sio.emit("world_boss_update", {"room": gm["room"], "boss": boss}, to=other_sid)
        await _send_ok(sid, f"Boss invoqué : {name} ({hp} PV)")
        await _audit("world_boss", gm, None, {"name": name, "hp": hp, "room": gm["room"]})

    @sio.event
    async def gm_rift(sid, data):
        """Open a dimensional rift — visual effect broadcast."""
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        room_id = (data or {}).get("room") or gm["room"]
        if room_id not in ROOMS:
            return await _send_err(sid, "Salle invalide.")
        rift = {
            "ts": time.time(), "room": room_id,
            "by_username": gm["username"],
        }
        _room_world_state[room_id]["rift"] = rift
        await sio.emit("rift_open", rift, to=room_id)
        for other_sid in list(_rooms_state[room_id].keys()):
            await sio.emit("rift_update", {"room": room_id, "rift": rift}, to=other_sid)
        await _send_ok(sid, "Faille dimensionnelle ouverte.")
        await _audit("rift", gm, None, {"room": room_id})

    @sio.event
    async def gm_observe(sid, data):
        """Subscribe the GM to the target's room events (silent surveillance)."""
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        target_user_id = (data or {}).get("target_user_id")
        target = _find_target_by_user_id(target_user_id)
        if not target:
            return await _send_err(sid, "Cible introuvable.")
        # If different room, move GM to target's room invisible
        if gm["room"] != target["room"]:
            old_room = gm["room"]
            _rooms_state[old_room].pop(sid, None)
            await sio.leave_room(sid, old_room)
            await sio.emit("player_leave", {"sid": sid, "user_id": gm["user_id"]}, to=old_room)
            gm["room"] = target["room"]
            gm["invisible"] = True
            gm["tx"], gm["ty"] = target["tx"], target["ty"]
            await sio.enter_room(sid, target["room"])
            _rooms_state[target["room"]][sid] = _lite(gm)
            await sio.emit("room_joined", {
                "room": _room_payload(target["room"]),
                "players": _visible_players_for(gm),
                "chat_history": _chat_buffer[target["room"]][-40:],
                "weather": _room_weather[target["room"]],
                "items": _room_items[target["room"]],
                "you": _lite(gm),
                "is_staff": True,
                "presence": _presence_payload(),
            }, to=sid)
        else:
            gm["invisible"] = True
            gm["tx"], gm["ty"] = target["tx"], target["ty"]
            _rooms_state[gm["room"]][sid] = _lite(gm)
            await sio.emit("player_move", {
                "sid": sid, "user_id": gm["user_id"],
                "tx": gm["tx"], "ty": gm["ty"], "facing": gm.get("facing", "SE"), "teleport": True,
            }, to=gm["room"])
        await _send_ok(sid, f"Vous observez {target['username']} (invisible).")
        await _audit("observe", gm, target, {})

    @sio.event
    async def gm_reset_room(sid, data):
        """Clear spawned items, boss and rift in a room."""
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        room_id = (data or {}).get("room") or gm["room"]
        if room_id not in ROOMS:
            return await _send_err(sid, "Salle invalide.")
        for item in list(_room_items.get(room_id, [])):
            await sio.emit("item_removed", {"item_id": item["item_id"]}, to=room_id)
        _room_items[room_id] = []
        _room_world_state[room_id]["boss"] = None
        _room_world_state[room_id]["rift"] = None
        for other_sid in list(_rooms_state[room_id].keys()):
            await sio.emit("world_boss_update", {"room": room_id, "boss": None}, to=other_sid)
            await sio.emit("rift_update", {"room": room_id, "rift": None}, to=other_sid)
        await sio.emit("system_msg", {
            "kind": "warn",
            "text": f"La zone {ROOMS[room_id]['name']} a été réinitialisée par un Gardien.",
        }, to=room_id)
        await _send_ok(sid, f"Salle {ROOMS[room_id]['name']} réinitialisée.")
        await _audit("reset_room", gm, None, {"room": room_id})

    @sio.event
    async def gm_invasion(sid, data):
        """Spawn ephemeral invader entities around the room center."""
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        room_id = gm["room"]
        count = max(3, min(12, int((data or {}).get("count", 6) or 6)))
        spawn = ROOMS[room_id]["spawn"]
        icons = ["👾", "💀", "🦂", "🔥"]
        for i in range(count):
            tx = max(1, min(ROOMS[room_id]["tiles_x"] - 2, spawn["tx"] + (i % 4) - 2))
            ty = max(1, min(ROOMS[room_id]["tiles_y"] - 2, spawn["ty"] + (i // 4) - 1))
            item = {
                "item_id": f"inv_{uuid.uuid4().hex[:10]}",
                "name": "Ombre envahissante",
                "icon": icons[i % len(icons)],
                "rarity": "mythic",
                "tx": tx, "ty": ty,
                "ephemeral": True,
            }
            _room_items[room_id].append(item)
            await sio.emit("item_spawned", item, to=room_id)
        await sio.emit("system_msg", {
            "kind": "warn",
            "text": f"⚔️ Invasion ! {count} entités hostiles dans {ROOMS[room_id]['name']}.",
        }, to=room_id)
        for other_sid in _players:
            if _players[other_sid].get("role") not in STAFF_ROLES:
                await sio.emit("system_msg", {
                    "kind": "warn",
                    "text": f"⚔️ Invasion détectée dans {ROOMS[room_id]['name']} !",
                }, to=other_sid)
        await _send_ok(sid, f"Invasion lancée ({count} entités).")
        await _audit("invasion", gm, None, {"room": room_id, "count": count})

    @sio.event
    async def gm_godmode(sid, data):
        """Toggle noclip / fly / god mode for the acting Gardien."""
        gm = _require_staff(sid)
        if not gm:
            return await _send_err(sid, "Action réservée aux Gardiens.")
        enabled = bool((data or {}).get("enabled", True))
        gm["godmode"] = enabled
        gm["noclip"] = enabled
        gm["fly"] = enabled
        _rooms_state[gm["room"]][sid] = _lite(gm)
        await sio.emit("player_status", {
            "sid": sid, "godmode": enabled, "noclip": enabled, "fly": enabled,
        }, to=gm["room"])
        await _send_ok(sid, f"Mode dieu {'activé' if enabled else 'désactivé'}.")
        await _audit("godmode", gm, None, {"enabled": enabled})

    return socketio.ASGIApp(sio, socketio_path="api/nexus/socket.io")


async def push_inventory_updated(user_id: str, source: str, detail: dict | None = None):
    """Notify client(s) that inventory or shop holdings changed — no page refresh needed."""
    payload = {
        "source": source,
        "ts": _now_iso(),
        **(detail or {}),
    }
    await push_to_user(user_id, "inventory:updated", payload)


async def push_profile_updated(user_id: str, fields: dict):
    """Push profile/cosmetic changes to the user and broadcast to their Nexus room."""
    if not fields:
        return
    payload = {"user_id": user_id, "ts": _now_iso(), **fields}
    await push_to_user(user_id, "profile:updated", payload)
    if _sio_ref is None:
        return
    for sid, p in list(_players.items()):
        if p.get("user_id") != user_id:
            continue
        p.update(fields)
        _rooms_state[p["room"]][sid] = _lite(p)
        try:
            await _sio_ref.emit("player_profile", {"sid": sid, **fields}, to=p["room"])
        except Exception as e:
            logger.warning(f"player_profile broadcast failed: {e}")


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
        except Exception as e:
            logger.warning(f"push_to_user emit failed for sid={s} event={event}: {e}")


def get_online_user_ids():
    """User IDs currently connected to the Nexus realtime layer."""
    return set(_user_sids.keys())


def staff_online_summary():
    """Public snapshot of online staff (for REST when Socket.IO is disconnected)."""
    return _staff_online_payload()


def online_summary():
    """For the lobby REST endpoint."""
    return [
        {
            "id": ROOMS[r]["id"],
            "name": ROOMS[r]["name"],
            "description": ROOMS[r]["description"],
            "icon": ROOMS[r].get("icon", "🌀"),
            "group": ROOMS[r].get("group", "misc"),
            "max_players": ROOMS[r]["max_players"],
            "theme": ROOMS[r].get("theme"),
            "online": len(state),
            "weather": _room_weather[r],
            "portals_to": ROOMS[r].get("portals_to", []),
        }
        for r, state in _rooms_state.items()
    ]
