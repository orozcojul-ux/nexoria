"""NEXORIA Nexus Online — real-time social world.

A Socket.IO server mounted on the same FastAPI ASGI app, broadcasting:
- player position updates
- local chat messages
- presence (join/leave)
- per-room state

All connections are authenticated using the existing NEXORIA session token
(passed in the Socket.IO auth handshake). The room state lives in memory —
the goal is realtime, not persistence. Chat is ephemeral (last 50 messages
buffered per room).
"""
import logging
import time
import socketio
from auth import get_user_by_token

logger = logging.getLogger("nexoria.nexus")

# Define the rooms available in this MVP. Designed to be extended later.
ROOMS = {
    "place_centrale": {
        "id": "place_centrale",
        "name": "Place Centrale",
        "description": "Le cœur cosmique de NEXORIA — point de rendez-vous de tous les héros",
        "width": 1200, "height": 700,
        "spawn": {"x": 600, "y": 350},
        "theme": "cosmic",
        "max_players": 50,
    },
    "taverne_etoilee": {
        "id": "taverne_etoilee",
        "name": "Taverne Étoilée",
        "description": "Là où les héros se reposent entre deux quêtes",
        "width": 1000, "height": 600,
        "spawn": {"x": 500, "y": 300},
        "theme": "tavern",
        "max_players": 30,
    },
    "arene": {
        "id": "arene",
        "name": "Arène des Présages",
        "description": "Une scène ouverte pour les événements live",
        "width": 1400, "height": 800,
        "spawn": {"x": 700, "y": 400},
        "theme": "arena",
        "max_players": 100,
    },
}
DEFAULT_ROOM = "place_centrale"

# In-memory state: sid → player snapshot ; room → {sid: player}
_players = {}            # sid → {user_id, username, class_id, class_name, level, role, active_title, x, y, room}
_rooms_state = {r: {} for r in ROOMS}   # room_id → {sid: player_lite}
_chat_buffer = {r: [] for r in ROOMS}   # room_id → list of last 50 msgs


def build_socketio_app(db):
    """Build and return an ASGI app that wraps a Socket.IO server.

    Mounted at root '/' on the main FastAPI app so the full socket.io path
    matches the ingress-routable /api/nexus/socket.io directly (avoids
    Starlette Mount prefix-stripping quirks).
    """
    sio = socketio.AsyncServer(
        async_mode="asgi",
        cors_allowed_origins="*",
        ping_interval=25, ping_timeout=20,
        max_http_buffer_size=10_000,
    )

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
        from datetime import datetime, timezone
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
            "avatar_url": user.get("avatar_url"),
            "x": spawn["x"], "y": spawn["y"],
            "room": room,
            "joined_at": time.time(),
        }
        _players[sid] = player
        _rooms_state[room][sid] = _lite(player)
        await sio.enter_room(sid, room)
        # Send the room state + recent chat to the new player
        await sio.emit("room_joined", {
            "room": ROOMS[room],
            "players": list(_rooms_state[room].values()),
            "chat_history": _chat_buffer[room][-30:],
            "you": _lite(player),
        }, to=sid)
        # Announce arrival to everyone else
        await sio.emit("player_join", _lite(player), to=room, skip_sid=sid)
        logger.info(f"[nexus] {user['username']} joined {room} ({len(_rooms_state[room])} players)")
        return True

    @sio.event
    async def disconnect(sid):
        p = _players.pop(sid, None)
        if not p:
            return
        room = p["room"]
        _rooms_state[room].pop(sid, None)
        await sio.emit("player_leave", {"sid": sid, "user_id": p["user_id"], "username": p["username"]}, to=room)
        logger.info(f"[nexus] {p['username']} left {room}")

    @sio.event
    async def move(sid, data):
        """data = {x, y}. Throttled implicitly by client."""
        p = _players.get(sid)
        if not p:
            return
        x = float(data.get("x", p["x"]))
        y = float(data.get("y", p["y"]))
        room_cfg = ROOMS[p["room"]]
        # Clamp inside room bounds with a 20px margin
        x = max(20, min(room_cfg["width"] - 20, x))
        y = max(20, min(room_cfg["height"] - 20, y))
        p["x"] = x; p["y"] = y
        # update lite snapshot
        _rooms_state[p["room"]][sid] = _lite(p)
        await sio.emit("player_move", {"sid": sid, "user_id": p["user_id"], "x": x, "y": y}, to=p["room"], skip_sid=sid)

    @sio.event
    async def chat(sid, data):
        p = _players.get(sid)
        if not p:
            return
        text = (data or {}).get("text", "").strip()
        if not text or len(text) > 280:
            return
        msg = {
            "ts": time.time(),
            "user_id": p["user_id"],
            "username": p["username"],
            "role": p["role"],
            "class_name": p["class_name"],
            "level": p["level"],
            "text": text,
        }
        room = p["room"]
        buf = _chat_buffer[room]
        buf.append(msg)
        del buf[:-50]
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
        await sio.emit("player_leave", {"sid": sid, "user_id": p["user_id"], "username": p["username"]}, to=old_room)
        # Move to new room
        spawn = ROOMS[new_room]["spawn"]
        p["room"] = new_room
        p["x"] = spawn["x"]; p["y"] = spawn["y"]
        _rooms_state[new_room][sid] = _lite(p)
        await sio.enter_room(sid, new_room)
        await sio.emit("room_joined", {
            "room": ROOMS[new_room],
            "players": list(_rooms_state[new_room].values()),
            "chat_history": _chat_buffer[new_room][-30:],
            "you": _lite(p),
        }, to=sid)
        await sio.emit("player_join", _lite(p), to=new_room, skip_sid=sid)

    return socketio.ASGIApp(sio, socketio_path="api/nexus/socket.io")


def _lite(p: dict) -> dict:
    """Public-safe slice of a player record sent to other clients."""
    return {
        "sid": p["sid"], "user_id": p["user_id"], "username": p["username"],
        "class_id": p["class_id"], "class_name": p["class_name"],
        "level": p["level"], "role": p["role"],
        "active_title": p["active_title"], "avatar_url": p.get("avatar_url"),
        "x": p["x"], "y": p["y"], "room": p["room"],
    }


def online_summary():
    """For the lobby REST endpoint."""
    return [
        {
            **ROOMS[r],
            "online": len(state),
        }
        for r, state in _rooms_state.items()
    ]
