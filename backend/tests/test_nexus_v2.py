"""NEXORIA Nexus Online V2 — Socket.IO + GM Panel test suite.

Covers:
- Socket.IO handshake (auth via session_token, reject no token)
- chat broadcast + length/empty filtering
- move event (tile coords + bounds clamp + jump limit)
- All GM events: announce, teleport, kick, mute, freeze, weather,
  spawn_item, ban, invisible — including role enforcement
- gm_audit_log persistence in MongoDB
- REST /api/admin/gm-audit (staff only / 403 for user)
- REST /api/nexus/rooms (rooms list + weather + online)
"""
import asyncio
import os
import time
import uuid
import pytest
import requests
import socketio

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nexoria-hero.preview.emergentagent.com").rstrip("/")
SOCKET_PATH = "/api/nexus/socket.io"

ADMIN_EMAIL = "admin@nexoria.com"
ADMIN_PASSWORD = "NexoriaAdmin2026!"


# ---------- helpers ----------
def _login(email: str, password: str) -> tuple[str, str]:
    """Returns (session_token, user_id) by hitting /api/auth/login."""
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    token = s.cookies.get("session_token")
    assert token, "no session_token cookie returned"
    user_id = r.json().get("user_id")
    assert user_id
    return token, user_id


def _register_user() -> tuple[str, str, str]:
    """Register a fresh regular user. Returns (token, user_id, email)."""
    suffix = uuid.uuid4().hex[:8]
    email = f"TEST_user_{suffix}@example.com"
    username = f"TESTU{suffix}"
    s = requests.Session()
    r = s.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": email, "username": username, "password": "TestPass123!", "class_id": "explorer"},
        timeout=20,
    )
    assert r.status_code in (200, 201), f"register failed: {r.status_code} {r.text[:300]}"
    token = s.cookies.get("session_token")
    user_id = r.json().get("user_id")
    assert token and user_id
    return token, user_id, email


class _SioBag:
    """Captures emitted events per socket for assertions."""
    def __init__(self):
        self.events: list[tuple[str, dict]] = []
        self.room_joined = None
        self.kicked = None

    def attach(self, sio: socketio.AsyncClient):
        @sio.event
        async def room_joined(data):
            self.room_joined = data
            self.events.append(("room_joined", data))

        @sio.on("player_join")
        async def on_pj(data): self.events.append(("player_join", data))

        @sio.on("player_leave")
        async def on_pl(data): self.events.append(("player_leave", data))

        @sio.on("player_move")
        async def on_pm(data): self.events.append(("player_move", data))

        @sio.on("player_status")
        async def on_ps(data): self.events.append(("player_status", data))

        @sio.on("chat")
        async def on_chat(data): self.events.append(("chat", data))

        @sio.on("gm_announce")
        async def on_ga(data): self.events.append(("gm_announce", data))

        @sio.on("weather")
        async def on_w(data): self.events.append(("weather", data))

        @sio.on("item_spawned")
        async def on_is(data): self.events.append(("item_spawned", data))

        @sio.on("system_msg")
        async def on_sm(data): self.events.append(("system_msg", data))

        @sio.on("kicked")
        async def on_k(data):
            self.kicked = data
            self.events.append(("kicked", data))

    def by_type(self, t):
        return [d for (k, d) in self.events if k == t]


async def _connect(token: str | None) -> tuple[socketio.AsyncClient, _SioBag]:
    sio = socketio.AsyncClient(reconnection=False, logger=False, engineio_logger=False)
    bag = _SioBag()
    bag.attach(sio)
    auth = {"token": token} if token else {}
    await sio.connect(BASE_URL, socketio_path=SOCKET_PATH, auth=auth, transports=["websocket"], wait_timeout=12)
    # wait for room_joined
    for _ in range(40):
        if bag.room_joined:
            break
        await asyncio.sleep(0.1)
    return sio, bag


# =============================================================
# REST endpoints
# =============================================================
class TestRestEndpoints:
    def test_rooms_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/nexus/rooms", timeout=15)
        assert r.status_code in (401, 403)

    def test_rooms_admin(self):
        token, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        r = requests.get(f"{BASE_URL}/api/nexus/rooms", cookies={"session_token": token}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 3
        ids = {x["id"] for x in data}
        assert ids == {"place_centrale", "taverne_etoilee", "arene"}
        for room in data:
            assert "weather" in room
            assert "online" in room
            assert isinstance(room["online"], int)

    def test_gm_audit_forbidden_for_user(self):
        utok, _, _ = _register_user()
        r = requests.get(f"{BASE_URL}/api/admin/gm-audit", cookies={"session_token": utok}, timeout=15)
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text[:200]}"

    def test_gm_audit_ok_for_admin(self):
        token, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        r = requests.get(f"{BASE_URL}/api/admin/gm-audit?limit=10", cookies={"session_token": token}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)


# =============================================================
# Socket.IO connect lifecycle
# =============================================================
@pytest.mark.asyncio
class TestSocketConnect:
    async def test_reject_without_token(self):
        sio = socketio.AsyncClient(reconnection=False)
        with pytest.raises(Exception):
            await sio.connect(BASE_URL, socketio_path=SOCKET_PATH, auth={}, transports=["websocket"], wait_timeout=8)
        try:
            await sio.disconnect()
        except Exception:
            pass

    async def test_admin_connects(self):
        token, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        sio, bag = await _connect(token)
        try:
            assert bag.room_joined is not None
            assert bag.room_joined["is_staff"] is True
            assert "room" in bag.room_joined and bag.room_joined["room"]["id"] == "place_centrale"
            assert bag.room_joined["weather"] in {"clear", "rain", "storm", "eclipse", "aurora"}
        finally:
            await sio.disconnect()


# =============================================================
# Chat & Move
# =============================================================
@pytest.mark.asyncio
class TestChatAndMove:
    async def test_chat_broadcast_and_filters(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, _, _ = _register_user()
        admin_sio, admin_bag = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            user_bag.events.clear()
            admin_bag.events.clear()
            await user_sio.emit("chat", {"text": "Bonjour Nexus!"})
            await asyncio.sleep(1.0)
            chats = admin_bag.by_type("chat")
            assert any(c.get("text") == "Bonjour Nexus!" for c in chats), f"chat not received by admin: {admin_bag.events}"

            # Empty / too long should be ignored
            admin_bag.events.clear()
            await user_sio.emit("chat", {"text": ""})
            await user_sio.emit("chat", {"text": "x" * 500})
            await asyncio.sleep(0.7)
            chats2 = admin_bag.by_type("chat")
            assert len(chats2) == 0, f"empty/too-long chat leaked: {chats2}"
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()

    async def test_move_clamps_and_broadcasts(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, user_id, _ = _register_user()
        admin_sio, admin_bag = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            start_tx = user_bag.room_joined["you"]["tx"]
            start_ty = user_bag.room_joined["you"]["ty"]
            admin_bag.events.clear()
            # legal move (1 tile)
            await user_sio.emit("move", {"tx": start_tx + 1, "ty": start_ty, "facing": "E"})
            await asyncio.sleep(0.7)
            moves = admin_bag.by_type("player_move")
            assert any(m.get("user_id") == user_id and m.get("tx") == start_tx + 1 for m in moves), \
                f"valid move not broadcast: {moves}"

            # illegal jump (>2 tiles) — should be ignored
            admin_bag.events.clear()
            await user_sio.emit("move", {"tx": start_tx + 50, "ty": start_ty + 50, "facing": "E"})
            await asyncio.sleep(0.5)
            illegal = [m for m in admin_bag.by_type("player_move") if m.get("user_id") == user_id]
            assert len(illegal) == 0, f"big jump leaked: {illegal}"
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()


# =============================================================
# GM events — role enforcement + persistence
# =============================================================
@pytest.mark.asyncio
class TestGMEvents:
    async def test_user_gm_events_denied(self):
        """A regular user emitting GM events must NOT execute them."""
        user_tok, user_id, _ = _register_user()
        admin_tok, admin_uid = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_sio, user_bag = await _connect(user_tok)
        admin_sio, admin_bag = await _connect(admin_tok)
        try:
            user_bag.events.clear()
            admin_bag.events.clear()
            # User tries every GM event
            for evt, payload in [
                ("gm_announce", {"text": "PIRATE"}),
                ("gm_kick", {"target_user_id": admin_uid}),
                ("gm_mute", {"target_user_id": admin_uid, "muted": True}),
                ("gm_freeze", {"target_user_id": admin_uid, "frozen": True}),
                ("gm_teleport", {"target_user_id": admin_uid, "tx": 1, "ty": 1}),
                ("gm_weather", {"weather": "storm"}),
                ("gm_spawn_item", {"name": "Hack"}),
                ("gm_invisible", {"invisible": True}),
                ("gm_ban", {"target_user_id": admin_uid, "duration_hours": 1}),
            ]:
                await user_sio.emit(evt, payload)
            await asyncio.sleep(1.5)
            # No GM action should have executed
            assert len(admin_bag.by_type("gm_announce")) == 0
            assert len(admin_bag.by_type("weather")) == 0
            assert len(admin_bag.by_type("item_spawned")) == 0
            # Admin should not have been kicked/banned
            assert admin_bag.kicked is None
            # System messages indicating denial sent to user
            sysmsgs = user_bag.by_type("system_msg")
            assert any(m.get("kind") == "error" for m in sysmsgs), f"no denial msg sent: {sysmsgs}"
        finally:
            await user_sio.disconnect()
            await admin_sio.disconnect()

    async def test_gm_announce_and_audit(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, _, _ = _register_user()
        admin_sio, admin_bag = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            unique = f"AUDIT_TEST_{uuid.uuid4().hex[:6]}"
            user_bag.events.clear()
            await admin_sio.emit("gm_announce", {"text": unique})
            await asyncio.sleep(1.2)
            assert any(a.get("text") == unique for a in user_bag.by_type("gm_announce")), \
                f"announce not received: {user_bag.events}"
            # Audit row written
            r = requests.get(
                f"{BASE_URL}/api/admin/gm-audit?action=announce&limit=20",
                cookies={"session_token": admin_tok}, timeout=15,
            )
            assert r.status_code == 200
            rows = r.json()
            assert any(unique in (row.get("payload") or {}).get("text", "") for row in rows), \
                "announce audit row not persisted"
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()

    async def test_gm_teleport_and_audit(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, user_id, _ = _register_user()
        admin_sio, admin_bag = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            user_bag.events.clear()
            await admin_sio.emit("gm_teleport", {"target_user_id": user_id, "tx": 5, "ty": 7})
            await asyncio.sleep(1.0)
            tps = [m for m in user_bag.by_type("player_move") if m.get("user_id") == user_id and m.get("teleport")]
            assert tps, f"teleport not broadcast: {user_bag.events}"
            assert tps[-1]["tx"] == 5 and tps[-1]["ty"] == 7
            # Audit
            r = requests.get(f"{BASE_URL}/api/admin/gm-audit?action=teleport&limit=20", cookies={"session_token": admin_tok}, timeout=15)
            assert any(row.get("target_user_id") == user_id for row in r.json()), "teleport audit missing"
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()

    async def test_gm_mute_blocks_chat_and_audit(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, user_id, _ = _register_user()
        admin_sio, admin_bag = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            await admin_sio.emit("gm_mute", {"target_user_id": user_id, "muted": True})
            await asyncio.sleep(1.0)
            # User receives player_status with muted=true
            statuses = user_bag.by_type("player_status")
            assert any(s.get("user_id") == user_id and s.get("muted") for s in statuses), f"no mute status: {statuses}"
            # Muted user cannot send chat
            admin_bag.events.clear()
            await user_sio.emit("chat", {"text": "I am muted but trying"})
            await asyncio.sleep(0.7)
            heard = [c for c in admin_bag.by_type("chat") if c.get("user_id") == user_id]
            assert len(heard) == 0, f"muted chat leaked: {heard}"
            # Audit
            r = requests.get(f"{BASE_URL}/api/admin/gm-audit?action=mute&limit=20", cookies={"session_token": admin_tok}, timeout=15)
            assert any(row.get("target_user_id") == user_id for row in r.json())
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()

    async def test_gm_freeze_blocks_move_and_audit(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, user_id, _ = _register_user()
        admin_sio, admin_bag = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            start_tx = user_bag.room_joined["you"]["tx"]
            start_ty = user_bag.room_joined["you"]["ty"]
            await admin_sio.emit("gm_freeze", {"target_user_id": user_id, "frozen": True})
            await asyncio.sleep(0.9)
            admin_bag.events.clear()
            await user_sio.emit("move", {"tx": start_tx + 1, "ty": start_ty, "facing": "E"})
            await asyncio.sleep(0.6)
            moves = [m for m in admin_bag.by_type("player_move") if m.get("user_id") == user_id]
            assert len(moves) == 0, f"frozen user moved: {moves}"
            r = requests.get(f"{BASE_URL}/api/admin/gm-audit?action=freeze&limit=20", cookies={"session_token": admin_tok}, timeout=15)
            assert any(row.get("target_user_id") == user_id for row in r.json())
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()

    async def test_gm_weather_and_audit(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, _, _ = _register_user()
        admin_sio, _ = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            user_bag.events.clear()
            await admin_sio.emit("gm_weather", {"weather": "storm"})
            await asyncio.sleep(0.9)
            ws = user_bag.by_type("weather")
            assert any(w.get("weather") == "storm" for w in ws), f"weather not broadcast: {ws}"
            r = requests.get(f"{BASE_URL}/api/admin/gm-audit?action=weather&limit=20", cookies={"session_token": admin_tok}, timeout=15)
            assert any((row.get("payload") or {}).get("weather") == "storm" for row in r.json())
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()

    async def test_gm_spawn_item_and_audit(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, _, _ = _register_user()
        admin_sio, _ = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            user_bag.events.clear()
            tag = f"Relique-{uuid.uuid4().hex[:5]}"
            await admin_sio.emit("gm_spawn_item", {"name": tag, "rarity": "epic", "icon": "✨", "tx": 10, "ty": 10})
            await asyncio.sleep(0.9)
            spawned = [s for s in user_bag.by_type("item_spawned") if s.get("name") == tag]
            assert spawned, f"item not spawned: {user_bag.events}"
            r = requests.get(f"{BASE_URL}/api/admin/gm-audit?action=spawn_item&limit=20", cookies={"session_token": admin_tok}, timeout=15)
            assert any(((row.get("payload") or {}).get("item") or {}).get("name") == tag for row in r.json())
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()

    async def test_gm_invisible_hides_from_user(self):
        admin_tok, admin_uid = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, _, _ = _register_user()
        admin_sio, _ = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            user_bag.events.clear()
            await admin_sio.emit("gm_invisible", {"invisible": True})
            await asyncio.sleep(0.9)
            leaves = [l for l in user_bag.by_type("player_leave") if l.get("user_id") == admin_uid]
            assert leaves, f"non-staff did not see player_leave on invisible ON: {user_bag.events}"
            user_bag.events.clear()
            await admin_sio.emit("gm_invisible", {"invisible": False})
            await asyncio.sleep(0.9)
            joins = [j for j in user_bag.by_type("player_join") if j.get("user_id") == admin_uid]
            assert joins, "non-staff did not see player_join on invisible OFF"
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()

    async def test_gm_kick_disconnects_target(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, user_id, _ = _register_user()
        admin_sio, _ = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            await admin_sio.emit("gm_kick", {"target_user_id": user_id, "reason": "test"})
            await asyncio.sleep(3.0)
            assert user_bag.kicked is not None, "target did not receive kicked event"
            r = requests.get(f"{BASE_URL}/api/admin/gm-audit?action=kick&limit=20", cookies={"session_token": admin_tok}, timeout=15)
            assert any(row.get("target_user_id") == user_id for row in r.json())
        finally:
            try: await admin_sio.disconnect()
            except: pass
            try: await user_sio.disconnect()
            except: pass

    async def test_gm_ban_persists_and_disconnects(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, user_id, user_email = _register_user()
        admin_sio, _ = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            await admin_sio.emit("gm_ban", {"target_user_id": user_id, "duration_hours": 1, "reason": "TEST_BAN"})
            await asyncio.sleep(3.0)
            assert user_bag.kicked is not None, "banned target did not receive kicked event"
            r = requests.get(f"{BASE_URL}/api/admin/gm-audit?action=ban&limit=20", cookies={"session_token": admin_tok}, timeout=15)
            assert any(row.get("target_user_id") == user_id for row in r.json())
        finally:
            try: await admin_sio.disconnect()
            except: pass
            try: await user_sio.disconnect()
            except: pass


# =============================================================
# Pickup item
# =============================================================
@pytest.mark.asyncio
class TestPickupItem:
    async def test_pickup_adjacent_item(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, user_id, _ = _register_user()
        admin_sio, _ = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            tx, ty = user_bag.room_joined["you"]["tx"], user_bag.room_joined["you"]["ty"]
            user_bag.events.clear()
            await admin_sio.emit("gm_spawn_item", {"name": "TestRelic", "rarity": "rare", "tx": tx, "ty": ty})
            await asyncio.sleep(0.9)
            spawned = user_bag.by_type("item_spawned")
            assert spawned
            item_id = spawned[-1]["item_id"]
            user_bag.events.clear()
            await user_sio.emit("pickup_item", {"item_id": item_id})
            await asyncio.sleep(0.9)
            sysmsgs = user_bag.by_type("system_msg")
            assert any(m.get("kind") == "pickup" for m in sysmsgs), f"pickup msg missing: {sysmsgs}"
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()
