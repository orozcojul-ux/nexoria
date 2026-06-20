"""NEXORIA Nexus Online V2.1 — multi-channel chat, new GM actions, push notifications.

Covers:
- Multi-channel chat (global/room/guild/trade/event) routing
- Event channel staff-only enforcement
- gm_tp_to_player, gm_tp_player_to_me (same-room + cross-room)
- gm_inspect returns user (no password_hash), inventory, history, sanctions, purchases
- gm_popup_notify broadcasts gm_popup to all players + audit
- Role enforcement on all new GM events
- push_to_user → notification:new (triggered via /api/follow)
- connect handshake exposes guild_id in player_lite
- Multi-tab _user_sids tracking
"""
import asyncio
import os
import uuid

import pytest
import requests
import socketio

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nexoria-hero.preview.emergentagent.com").rstrip("/")
SOCKET_PATH = "/api/nexus/socket.io"

ADMIN_EMAIL = "admin@nexoria.com"
ADMIN_PASSWORD = "NexoriaAdmin2026!"


# ---------- helpers ----------
def _login(email: str, password: str):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login {r.status_code}: {r.text[:200]}"
    token = s.cookies.get("session_token")
    return token, r.json().get("user_id")


def _register_user():
    suffix = uuid.uuid4().hex[:8]
    email = f"TEST_v21_{suffix}@example.com"
    username = f"TV21{suffix}"
    s = requests.Session()
    r = s.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": email, "username": username, "password": "TestPass123!", "class_id": "explorer"},
        timeout=20,
    )
    assert r.status_code in (200, 201), f"register {r.status_code}: {r.text[:200]}"
    return s.cookies.get("session_token"), r.json().get("user_id"), email, username


class _Bag:
    def __init__(self):
        self.events = []
        self.room_joined = None

    def attach(self, sio: socketio.AsyncClient):
        @sio.event
        async def room_joined(data):
            self.room_joined = data
            self.events.append(("room_joined", data))

        @sio.on("notification:new")
        async def on_notif(data):
            self.events.append(("notification:new", data))

        for ev in ("chat", "system_msg", "player_move", "player_join", "player_leave",
                   "gm_inspect_result", "gm_popup", "weather", "gm_announce"):
            sio.on(ev, lambda d, _e=ev: self.events.append((_e, d)))

    def by(self, t):
        return [d for k, d in self.events if k == t]


async def _connect(token):
    sio = socketio.AsyncClient(reconnection=False, logger=False, engineio_logger=False)
    bag = _Bag()
    bag.attach(sio)
    await sio.connect(BASE_URL, socketio_path=SOCKET_PATH, auth={"token": token},
                      transports=["websocket"], wait_timeout=12)
    for _ in range(40):
        if bag.room_joined:
            break
        await asyncio.sleep(0.1)
    return sio, bag


# =============================================================
# Multi-channel chat
# =============================================================
@pytest.mark.asyncio
class TestMultiChannelChat:
    async def test_global_channel_broadcasts_to_all(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, _, _, _ = _register_user()
        admin_sio, admin_bag = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            tag = f"GLOBAL_{uuid.uuid4().hex[:5]}"
            admin_bag.events.clear()
            await user_sio.emit("chat", {"channel": "global", "text": tag})
            await asyncio.sleep(1.0)
            chats = admin_bag.by("chat")
            match = [c for c in chats if c.get("text") == tag]
            assert match, f"global chat not received: {chats}"
            assert match[0].get("channel") == "global", f"channel field missing/incorrect: {match[0]}"
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()

    async def test_trade_channel_broadcasts_to_all(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, _, _, _ = _register_user()
        admin_sio, admin_bag = await _connect(admin_tok)
        user_sio, _ = await _connect(user_tok)
        try:
            tag = f"TRADE_{uuid.uuid4().hex[:5]}"
            admin_bag.events.clear()
            await user_sio.emit("chat", {"channel": "trade", "text": tag})
            await asyncio.sleep(1.0)
            match = [c for c in admin_bag.by("chat") if c.get("text") == tag]
            assert match and match[0].get("channel") == "trade"
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()

    async def test_event_channel_rejects_non_staff(self):
        user_tok, _, _, _ = _register_user()
        user_sio, user_bag = await _connect(user_tok)
        try:
            user_bag.events.clear()
            await user_sio.emit("chat", {"channel": "event", "text": "user trying event"})
            await asyncio.sleep(0.8)
            sysmsgs = user_bag.by("system_msg")
            assert any(m.get("kind") == "error" for m in sysmsgs), f"no rejection: {sysmsgs}"
            # No chat broadcast back
            assert not any(c.get("text") == "user trying event" for c in user_bag.by("chat"))
        finally:
            await user_sio.disconnect()

    async def test_event_channel_works_for_admin(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, _, _, _ = _register_user()
        admin_sio, _ = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            tag = f"EVENT_{uuid.uuid4().hex[:5]}"
            user_bag.events.clear()
            await admin_sio.emit("chat", {"channel": "event", "text": tag})
            await asyncio.sleep(1.0)
            match = [c for c in user_bag.by("chat") if c.get("text") == tag]
            assert match and match[0].get("channel") == "event"
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()

    async def test_guild_chat_rejects_when_no_guild(self):
        user_tok, _, _, _ = _register_user()
        user_sio, user_bag = await _connect(user_tok)
        try:
            user_bag.events.clear()
            await user_sio.emit("chat", {"channel": "guild", "text": "hi guild"})
            await asyncio.sleep(0.8)
            assert any(m.get("kind") == "error" for m in user_bag.by("system_msg"))
        finally:
            await user_sio.disconnect()

    async def test_room_channel_default(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, _, _, _ = _register_user()
        admin_sio, admin_bag = await _connect(admin_tok)
        user_sio, _ = await _connect(user_tok)
        try:
            tag = f"ROOM_{uuid.uuid4().hex[:5]}"
            admin_bag.events.clear()
            # No channel field => defaults to room
            await user_sio.emit("chat", {"text": tag})
            await asyncio.sleep(0.9)
            match = [c for c in admin_bag.by("chat") if c.get("text") == tag]
            assert match
            assert match[0].get("channel") == "room", f"expected channel=room, got {match[0].get('channel')}"
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()


# =============================================================
# Handshake guild_id + multi-tab _user_sids
# =============================================================
@pytest.mark.asyncio
class TestHandshakeAndMultiTab:
    async def test_player_lite_has_guild_id_field(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        sio, bag = await _connect(admin_tok)
        try:
            you = bag.room_joined["you"]
            assert "guild_id" in you, f"guild_id missing from player_lite: {you}"
        finally:
            await sio.disconnect()

    async def test_multi_tab_same_user(self):
        """Same user connecting twice should both receive room_joined."""
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        sio1, bag1 = await _connect(admin_tok)
        sio2, bag2 = await _connect(admin_tok)
        try:
            assert bag1.room_joined is not None and bag2.room_joined is not None
        finally:
            await sio1.disconnect()
            await sio2.disconnect()


# =============================================================
# gm_tp_to_player / gm_tp_player_to_me
# =============================================================
@pytest.mark.asyncio
class TestGMTeleportSwap:
    async def test_gm_tp_to_player_same_room(self):
        admin_tok, admin_uid = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, user_uid, _, _ = _register_user()
        admin_sio, admin_bag = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            # Move user to a known tile
            await user_sio.emit("move", {"tx": 5, "ty": 5, "facing": "E"})
            await asyncio.sleep(0.6)
            admin_bag.events.clear()
            user_bag.events.clear()
            await admin_sio.emit("gm_tp_to_player", {"target_user_id": user_uid})
            await asyncio.sleep(1.0)
            # Admin should appear at user's tile (player_move teleport=True)
            moves = [m for m in user_bag.by("player_move") if m.get("user_id") == admin_uid and m.get("teleport")]
            assert moves, f"admin teleport not broadcast: {user_bag.events}"
            # Audit
            r = requests.get(f"{BASE_URL}/api/admin/gm-audit?action=tp_to_player&limit=20",
                             cookies={"session_token": admin_tok}, timeout=15)
            assert r.status_code == 200
            assert any(row.get("target_user_id") == user_uid for row in r.json())
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()

    async def test_gm_tp_to_player_cross_room(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, user_uid, _, _ = _register_user()
        admin_sio, admin_bag = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            # User moves to taverne
            user_bag.events.clear()
            await user_sio.emit("change_room", {"room": "taverne_etoilee"})
            await asyncio.sleep(1.0)
            # Now admin TPs to user (cross-room)
            admin_bag.events.clear()
            await admin_sio.emit("gm_tp_to_player", {"target_user_id": user_uid})
            await asyncio.sleep(1.5)
            # Admin should receive a new room_joined for taverne
            rjs = [d for k, d in admin_bag.events if k == "room_joined"]
            assert any(d.get("room", {}).get("id") == "taverne_etoilee" for d in rjs), \
                f"admin not re-joined to taverne: {[d.get('room', {}).get('id') for d in rjs]}"
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()

    async def test_gm_tp_player_to_me(self):
        admin_tok, admin_uid = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, user_uid, _, _ = _register_user()
        admin_sio, admin_bag = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            await admin_sio.emit("move", {"tx": 3, "ty": 4, "facing": "N"})
            await asyncio.sleep(0.5)
            user_bag.events.clear()
            await admin_sio.emit("gm_tp_player_to_me", {"target_user_id": user_uid})
            await asyncio.sleep(1.0)
            # Target received system_msg warn
            warns = [m for m in user_bag.by("system_msg") if m.get("kind") == "warn"]
            assert warns, f"no warn msg sent to target: {user_bag.by('system_msg')}"
            # Audit
            r = requests.get(f"{BASE_URL}/api/admin/gm-audit?action=tp_player_to_me&limit=20",
                             cookies={"session_token": admin_tok}, timeout=15)
            assert any(row.get("target_user_id") == user_uid for row in r.json())
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()

    async def test_user_cannot_use_tp_swap(self):
        admin_tok, admin_uid = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, _, _, _ = _register_user()
        admin_sio, _ = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            user_bag.events.clear()
            await user_sio.emit("gm_tp_to_player", {"target_user_id": admin_uid})
            await user_sio.emit("gm_tp_player_to_me", {"target_user_id": admin_uid})
            await asyncio.sleep(1.0)
            errors = [m for m in user_bag.by("system_msg") if m.get("kind") == "error"]
            assert len(errors) >= 2, f"expected 2 errors, got {errors}"
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()


# =============================================================
# gm_inspect
# =============================================================
@pytest.mark.asyncio
class TestGMInspect:
    async def test_inspect_returns_full_payload(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, user_uid, _, _ = _register_user()
        admin_sio, admin_bag = await _connect(admin_tok)
        user_sio, _ = await _connect(user_tok)
        try:
            admin_bag.events.clear()
            await admin_sio.emit("gm_inspect", {"target_user_id": user_uid})
            await asyncio.sleep(1.2)
            results = admin_bag.by("gm_inspect_result")
            assert results, f"no inspect_result received: {admin_bag.events}"
            res = results[-1]
            assert res.get("target_user_id") == user_uid
            for key in ("user", "inventory", "history", "sanctions", "purchases"):
                assert key in res, f"missing key {key} in inspect_result"
            # password_hash must not be present
            assert "password_hash" not in (res.get("user") or {}), "password_hash leaked!"
            assert isinstance(res["inventory"], list)
            assert isinstance(res["history"], list)
            # Audit row written
            r = requests.get(f"{BASE_URL}/api/admin/gm-audit?action=inspect&limit=20",
                             cookies={"session_token": admin_tok}, timeout=15)
            assert any(row.get("target_user_id") == user_uid for row in r.json())
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()

    async def test_user_cannot_inspect(self):
        admin_tok, admin_uid = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        user_tok, _, _, _ = _register_user()
        admin_sio, _ = await _connect(admin_tok)
        user_sio, user_bag = await _connect(user_tok)
        try:
            user_bag.events.clear()
            await user_sio.emit("gm_inspect", {"target_user_id": admin_uid})
            await asyncio.sleep(0.9)
            assert not user_bag.by("gm_inspect_result"), "non-staff received inspect result!"
            assert any(m.get("kind") == "error" for m in user_bag.by("system_msg"))
        finally:
            await admin_sio.disconnect()
            await user_sio.disconnect()


# =============================================================
# gm_popup_notify
# =============================================================
@pytest.mark.asyncio
class TestGMPopupNotify:
    async def test_popup_broadcasts_to_all(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        u1_tok, _, _, _ = _register_user()
        u2_tok, _, _, _ = _register_user()
        admin_sio, _ = await _connect(admin_tok)
        u1_sio, u1_bag = await _connect(u1_tok)
        u2_sio, u2_bag = await _connect(u2_tok)
        try:
            title = f"DECRET_{uuid.uuid4().hex[:5]}"
            body = "Tous les héros doivent se présenter."
            u1_bag.events.clear()
            u2_bag.events.clear()
            await admin_sio.emit("gm_popup_notify", {"title": title, "body": body, "kind": "warn"})
            await asyncio.sleep(1.2)
            assert any(p.get("title") == title for p in u1_bag.by("gm_popup")), \
                f"u1 missed popup: {u1_bag.by('gm_popup')}"
            assert any(p.get("title") == title for p in u2_bag.by("gm_popup")), \
                f"u2 missed popup: {u2_bag.by('gm_popup')}"
            # Audit
            r = requests.get(f"{BASE_URL}/api/admin/gm-audit?action=popup_notify&limit=20",
                             cookies={"session_token": admin_tok}, timeout=15)
            assert any((row.get("payload") or {}).get("title") == title for row in r.json())
        finally:
            await admin_sio.disconnect()
            await u1_sio.disconnect()
            await u2_sio.disconnect()

    async def test_user_cannot_popup(self):
        user_tok, _, _, _ = _register_user()
        user_sio, user_bag = await _connect(user_tok)
        try:
            user_bag.events.clear()
            await user_sio.emit("gm_popup_notify", {"title": "X", "body": "Hack", "kind": "info"})
            await asyncio.sleep(0.8)
            assert any(m.get("kind") == "error" for m in user_bag.by("system_msg"))
        finally:
            await user_sio.disconnect()

    async def test_popup_empty_body_rejected(self):
        admin_tok, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        admin_sio, admin_bag = await _connect(admin_tok)
        try:
            admin_bag.events.clear()
            await admin_sio.emit("gm_popup_notify", {"title": "T", "body": "", "kind": "info"})
            await asyncio.sleep(0.6)
            errs = [m for m in admin_bag.by("system_msg") if m.get("kind") == "error"]
            assert errs, "empty body should be rejected"
        finally:
            await admin_sio.disconnect()


# =============================================================
# push_to_user → notification:new (triggered via follow)
# =============================================================
@pytest.mark.asyncio
class TestPushNotification:
    async def test_friend_request_triggers_notification_event(self):
        """When user A sends friend request to B, B should receive notification:new via socket."""
        tokA, _, _, _ = _register_user()
        tokB, uidB, _, usernameB = _register_user()
        # Connect B
        sioB, bagB = await _connect(tokB)
        try:
            bagB.events.clear()
            r = requests.post(
                f"{BASE_URL}/api/friends/request",
                json={"target_username": usernameB},
                cookies={"session_token": tokA}, timeout=15,
            )
            assert r.status_code in (200, 201), f"friend request failed: {r.status_code} {r.text[:200]}"
            await asyncio.sleep(2.0)
            notifs = bagB.by("notification:new")
            assert notifs, f"B did not receive notification:new event: {bagB.events}"
            doc = notifs[-1]
            assert doc.get("user_id") == uidB
            assert doc.get("kind") == "friend_request"
            assert "notif_id" in doc
            assert "title" in doc and "message" in doc
        finally:
            await sioB.disconnect()
