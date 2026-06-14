"""
NEXORIA Phase 2 — Backend endpoint tests for newly refactored pages
(Classes, Events, Leaderboards, Guilds).
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nexoria-hero.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@nexoria.com"
ADMIN_PWD = "NexoriaAdmin2026!"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PWD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    assert s.cookies.get("session_token"), "session_token cookie missing"
    return s


# ── Classes ────────────────────────────────────────────────────────────────
class TestClasses:
    def test_game_classes_returns_10(self, session):
        r = session.get(f"{BASE_URL}/api/game/classes", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 10, f"expected 10 classes, got {len(data)}"
        for c in data:
            assert "id" in c and "name" in c and "icon" in c
            assert "color" in c and "tagline" in c
            assert "stat_bonus" in c and isinstance(c["stat_bonus"], dict)


# ── Events / Boss / Season / Rifts ─────────────────────────────────────────
class TestEventsWidgets:
    def test_widgets_events(self, session):
        r = session.get(f"{BASE_URL}/api/widgets/events", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_boss(self, session):
        r = session.get(f"{BASE_URL}/api/boss", timeout=10)
        assert r.status_code == 200
        body = r.json()
        # Either none or dict with name/progress/target
        if body:
            assert isinstance(body, dict)

    def test_seasons_current(self, session):
        r = session.get(f"{BASE_URL}/api/seasons/current", timeout=10)
        assert r.status_code == 200

    def test_widgets_rifts_map(self, session):
        r = session.get(f"{BASE_URL}/api/widgets/rifts-map", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ── Leaderboard ────────────────────────────────────────────────────────────
class TestLeaderboard:
    @pytest.mark.parametrize("cat", ["xp", "rank", "reputation", "aether"])
    def test_leaderboard_categories(self, session, cat):
        r = session.get(f"{BASE_URL}/api/leaderboard/{cat}", timeout=10)
        # Accept 200; some categories might not be configured -> still test 200
        assert r.status_code == 200, f"{cat}: {r.status_code} {r.text[:200]}"
        body = r.json()
        assert isinstance(body, (list, dict))


# ── Guilds ─────────────────────────────────────────────────────────────────
class TestGuilds:
    def test_guilds_list(self, session):
        r = session.get(f"{BASE_URL}/api/guilds", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, (list, dict))

    def test_guilds_invites_mine(self, session):
        r = session.get(f"{BASE_URL}/api/guilds/invites/mine", timeout=10)
        assert r.status_code in (200, 204)


# ── Regression ─────────────────────────────────────────────────────────────
class TestRegression:
    def test_nexus_rooms_public_22(self):
        r = requests.get(f"{BASE_URL}/api/nexus/rooms-public", timeout=10)
        assert r.status_code == 200
        rooms = r.json()
        assert isinstance(rooms, list)
        assert len(rooms) == 22, f"expected 22 rooms, got {len(rooms)}"

    def test_admin_login_works(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": ADMIN_PWD},
                          timeout=10)
        assert r.status_code == 200
        data = r.json()
        # cookie should also be present
        assert any(c.name == "session_token" for c in r.cookies)
        assert "user_id" in data or "user" in data
