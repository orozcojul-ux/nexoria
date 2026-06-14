"""Iteration 12 — Dashboard stats + enriched badges validation."""
import os
import requests
import pytest

def _read_frontend_env():
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return None

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _read_frontend_env() or "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not configured"
ADMIN = {"email": "admin@nexoria.com", "password": "NexoriaAdmin2026!"}


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    j = r.json()
    # Either JWT or session_token cookie should be available
    if j.get("token"):
        s.headers["Authorization"] = f"Bearer {j['token']}"
    elif j.get("access_token"):
        s.headers["Authorization"] = f"Bearer {j['access_token']}"
    return s


# ---------- /api/stats/public ----------
class TestStatsPublic:
    def test_stats_public_shape(self):
        r = requests.get(f"{BASE_URL}/api/stats/public", timeout=15)
        assert r.status_code == 200, r.text[:200]
        j = r.json()
        for k in ["heroes", "heroes_online", "guilds", "events",
                  "new_signups", "visits_today", "server_stability"]:
            assert k in j, f"missing key {k} -> {j}"
        # Type sanity
        assert isinstance(j["heroes"], int)
        assert isinstance(j["heroes_online"], int)
        assert isinstance(j["guilds"], int)
        assert isinstance(j["events"], int)
        assert isinstance(j["new_signups"], int)
        assert isinstance(j["visits_today"], int)
        assert isinstance(j["server_stability"], (int, float))
        assert 0 <= j["server_stability"] <= 100


# ---------- Enriched badges ----------
class TestEnrichedBadges:
    def _assert_enriched(self, badges):
        assert isinstance(badges, list)
        # Admin should have at least 1 badge
        assert len(badges) >= 1, "admin should have at least one badge"
        required = {"badge_id", "id", "name", "icon", "rarity", "description", "category"}
        for b in badges:
            missing = required - set(b.keys())
            assert not missing, f"badge missing keys {missing}: {b}"
            assert b["name"] != "undefined"
            assert isinstance(b["name"], str) and b["name"].strip() != ""
            assert isinstance(b["icon"], str) and b["icon"].strip() != ""
            assert isinstance(b["rarity"], str) and b["rarity"].strip() != ""

    def test_badges_mine(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/badges/mine", timeout=15)
        assert r.status_code == 200, r.text[:200]
        self._assert_enriched(r.json())

    def test_badges_by_username(self, admin_session):
        me = admin_session.get(f"{BASE_URL}/api/auth/me", timeout=15).json()
        uname = me.get("username") or "ArchonteSupreme"
        r = admin_session.get(f"{BASE_URL}/api/badges/user/{uname}", timeout=15)
        assert r.status_code == 200, f"username={uname} status={r.status_code} body={r.text[:200]}"
        self._assert_enriched(r.json())

    def test_profile_by_username_includes_enriched_badges(self, admin_session):
        me = admin_session.get(f"{BASE_URL}/api/auth/me", timeout=15).json()
        uname = me.get("username") or "ArchonteSupreme"
        r = admin_session.get(f"{BASE_URL}/api/profile/{uname}", timeout=15)
        assert r.status_code == 200, r.text[:200]
        j = r.json()
        assert "badges" in j, f"keys={list(j.keys())[:20]}"
        if j["badges"]:
            self._assert_enriched(j["badges"])

    def test_user_card_includes_enriched_badges(self, admin_session):
        me = admin_session.get(f"{BASE_URL}/api/auth/me", timeout=15).json()
        uid = me.get("user_id") or me.get("id")
        assert uid, f"no user_id from /auth/me: {me}"
        r = admin_session.get(f"{BASE_URL}/api/users/{uid}/card", timeout=15)
        assert r.status_code == 200, r.text[:200]
        j = r.json()
        assert "badges" in j
        if j["badges"]:
            self._assert_enriched(j["badges"])


# ---------- Regression ----------
class TestRegression:
    def test_nexus_rooms_public_22(self):
        r = requests.get(f"{BASE_URL}/api/nexus/rooms-public", timeout=15)
        assert r.status_code == 200
        j = r.json()
        rooms = j if isinstance(j, list) else j.get("rooms", j)
        assert isinstance(rooms, list)
        assert len(rooms) == 22, f"expected 22 rooms, got {len(rooms)}"

    def test_leaderboard_xp(self):
        r = requests.get(f"{BASE_URL}/api/leaderboard/xp", timeout=15)
        assert r.status_code == 200
        j = r.json()
        rows = j if isinstance(j, list) else j.get("leaderboard", j.get("entries", []))
        assert isinstance(rows, list)

    def test_boss_endpoint(self):
        r = requests.get(f"{BASE_URL}/api/boss", timeout=15)
        assert r.status_code == 200
        j = r.json()
        # Boss could be null or a dict
        assert isinstance(j, (dict, type(None)))

    def test_login_sets_session_cookie(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=15)
        assert r.status_code == 200
        # Either JWT in body OR session_token cookie set
        body = r.json()
        has_jwt = bool(body.get("token") or body.get("access_token"))
        has_cookie = any(c.name == "session_token" for c in s.cookies)
        assert has_jwt or has_cookie, f"neither JWT nor session_token cookie present (keys={list(body.keys())})"
