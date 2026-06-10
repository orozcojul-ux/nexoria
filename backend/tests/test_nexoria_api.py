"""NEXORIA Backend API tests covering auth, game, posts, quests, oracle, admin."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nexoria-hero.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@nexoria.com"
ADMIN_PASSWORD = "NexoriaAdmin2026!"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def s_anon():
    return requests.Session()


@pytest.fixture(scope="session")
def s_user():
    """Register a fresh test user once for all tests."""
    sess = requests.Session()
    uniq = uuid.uuid4().hex[:8]
    payload = {
        "email": f"TEST_{uniq}@nexoria-test.com",
        "username": f"TEST_{uniq}",
        "password": "TestPass123!",
        "class_id": "mage",
    }
    r = sess.post(f"{API}/auth/register", json=payload, timeout=30)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    sess.user_payload = payload
    sess.user_data = r.json()
    return sess


@pytest.fixture(scope="session")
def s_admin():
    sess = requests.Session()
    r = sess.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    sess.user_data = r.json()
    return sess


# ---------- Health / Game data ----------
class TestHealth:
    def test_root(self, s_anon):
        r = s_anon.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "online"

    def test_classes(self, s_anon):
        r = s_anon.get(f"{API}/game/classes", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, (list, dict))
        n = len(data) if isinstance(data, list) else len(data.keys())
        assert n == 10, f"Expected 10 classes, got {n}"

    def test_skills(self, s_anon):
        r = s_anon.get(f"{API}/game/skills", timeout=15)
        assert r.status_code == 200
        data = r.json()
        n = len(data) if isinstance(data, list) else len(data.keys())
        assert n == 8, f"Expected 8 skills, got {n}"

    def test_badges(self, s_anon):
        r = s_anon.get(f"{API}/game/badges", timeout=15)
        assert r.status_code == 200
        data = r.json()
        n = len(data) if isinstance(data, list) else len(data.keys())
        assert n >= 25, f"Expected ~30 badges, got {n}"


# ---------- Auth ----------
class TestAuth:
    def test_register_and_session(self, s_user):
        u = s_user.user_data
        assert "user_id" in u
        assert u["email"] == s_user.user_payload["email"].lower()
        assert u["class_id"] == "mage"
        assert "password_hash" not in u
        # cookie set
        assert "session_token" in s_user.cookies.get_dict()

    def test_me(self, s_user):
        r = s_user.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == s_user.user_payload["email"].lower()

    def test_me_unauth(self, s_anon):
        sess = requests.Session()
        r = sess.get(f"{API}/auth/me", timeout=15)
        assert r.status_code in (401, 403)

    def test_register_duplicate_email(self, s_user):
        r = requests.post(f"{API}/auth/register", json={
            **s_user.user_payload,
            "username": s_user.user_payload["username"] + "x"
        }, timeout=15)
        assert r.status_code == 400

    def test_login_invalid(self, s_anon):
        r = requests.post(f"{API}/auth/login", json={"email": "nobody@nexoria-test.com", "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_login_then_logout(self):
        sess = requests.Session()
        uniq = uuid.uuid4().hex[:8]
        reg = sess.post(f"{API}/auth/register", json={
            "email": f"TEST_logout_{uniq}@nexoria-test.com",
            "username": f"TEST_lo_{uniq}",
            "password": "Test123!",
            "class_id": "warrior",
        }, timeout=15)
        assert reg.status_code == 200
        r = sess.post(f"{API}/auth/logout", timeout=15)
        assert r.status_code == 200
        # session_token cookie cleared
        me = sess.get(f"{API}/auth/me", timeout=15)
        # Cookie may still be present locally but invalid - or cleared
        assert me.status_code in (401, 403)

    def test_google_session_invalid(self, s_anon):
        r = requests.post(f"{API}/auth/google/session", json={"session_id": "INVALID_DEADBEEF"}, timeout=15)
        assert r.status_code in (400, 401, 422)


# ---------- Profile ----------
class TestProfile:
    def test_update_profile(self, s_user):
        r = s_user.put(f"{API}/profile", json={"bio": "Hero of NEXORIA", "quote": "Ad Astra"}, timeout=15)
        assert r.status_code == 200
        me = s_user.get(f"{API}/auth/me", timeout=15).json()
        assert me["bio"] == "Hero of NEXORIA"
        assert me["quote"] == "Ad Astra"


# ---------- Posts / Feed / Reactions / Comments ----------
class TestPosts:
    def test_create_post_grants_xp_and_badge(self, s_user):
        before = s_user.get(f"{API}/auth/me", timeout=15).json()
        xp_before = before["xp"]
        r = s_user.post(f"{API}/posts", json={"content": "TEST post first"}, timeout=15)
        assert r.status_code == 200
        post = r.json()
        assert "post_id" in post
        assert post["content"] == "TEST post first"
        after = s_user.get(f"{API}/auth/me", timeout=15).json()
        assert after["xp"] >= xp_before + 20
        # first_step badge granted
        badges = s_user.get(f"{API}/badges/mine", timeout=15).json()
        assert any(b.get("badge_id") == "first_step" for b in badges)

    def test_feed_contains_post(self, s_user):
        r = s_user.get(f"{API}/feed", timeout=15)
        assert r.status_code == 200
        feed = r.json()
        assert isinstance(feed, list)
        assert len(feed) > 0
        assert any("TEST post first" in p.get("content", "") for p in feed)
        # author enriched
        first = feed[0]
        assert "author" in first or "username" in first

    def test_react_and_comment(self, s_user):
        # create a post to interact with
        post = s_user.post(f"{API}/posts", json={"content": "TEST reactable post"}, timeout=15).json()
        pid = post["post_id"]
        r = s_user.post(f"{API}/posts/{pid}/react", timeout=15)
        assert r.status_code == 200
        assert r.json().get("reacted") is True
        # toggle
        r2 = s_user.post(f"{API}/posts/{pid}/react", timeout=15)
        assert r2.json().get("reacted") is False
        # comment
        r3 = s_user.post(f"{API}/posts/{pid}/comments", json={"content": "TEST comment"}, timeout=15)
        assert r3.status_code == 200
        rc = s_user.get(f"{API}/posts/{pid}/comments", timeout=15)
        assert rc.status_code == 200
        assert len(rc.json()) >= 1

    def test_level_progression_many_posts(self, s_user):
        """Post many times to ensure XP/level increases (and creator badge after 10)."""
        before = s_user.get(f"{API}/auth/me", timeout=15).json()
        for i in range(12):
            s_user.post(f"{API}/posts", json={"content": f"TEST grind {i}"}, timeout=15)
        after = s_user.get(f"{API}/auth/me", timeout=15).json()
        assert after["xp"] > before["xp"]
        badges = [b.get("badge_id") for b in s_user.get(f"{API}/badges/mine", timeout=15).json()]
        assert "creator" in badges, f"creator badge not granted, have {badges}"


# ---------- Quests ----------
class TestQuests:
    def test_quests_list(self, s_user):
        r = s_user.get(f"{API}/quests", timeout=15)
        assert r.status_code == 200
        quests = r.json()
        assert isinstance(quests, list)
        assert len(quests) >= 6
        types = {q["type"] for q in quests}
        assert "daily" in types or "weekly" in types

    def test_daily_login(self, s_user):
        r = s_user.post(f"{API}/quests/daily-login", timeout=15)
        assert r.status_code == 200


# ---------- Skills ----------
class TestSkills:
    def test_allocate_skill(self):
        """Use a fresh user with 1 skill_point."""
        sess = requests.Session()
        uniq = uuid.uuid4().hex[:8]
        sess.post(f"{API}/auth/register", json={
            "email": f"TEST_skill_{uniq}@nexoria-test.com",
            "username": f"TEST_sk_{uniq}",
            "password": "Test123!",
            "class_id": "explorer",
        }, timeout=15)
        # fetch a skill_id
        skills = sess.get(f"{API}/game/skills", timeout=15).json()
        skill_id = (skills[0]["id"] if isinstance(skills, list) else list(skills.keys())[0])
        r = sess.post(f"{API}/skills/allocate", json={"skill_id": skill_id}, timeout=15)
        assert r.status_code in (200, 201), f"{r.status_code}: {r.text}"
        me = sess.get(f"{API}/auth/me", timeout=15).json()
        assert me["skill_points"] == 0


# ---------- Inventory & Kingdom ----------
class TestInventoryKingdom:
    def test_open_chest_and_inventory(self, s_user):
        # Ensure enough aether — initial = 100
        me = s_user.get(f"{API}/auth/me", timeout=15).json()
        if me["aether"] < 50:
            pytest.skip("Not enough aether")
        r = s_user.post(f"{API}/inventory/open-chest", timeout=15)
        assert r.status_code == 200, r.text
        items = r.json()
        # could return dict or list
        if isinstance(items, dict) and "items" in items:
            items = items["items"]
        assert isinstance(items, list) and len(items) >= 1
        inv = s_user.get(f"{API}/inventory", timeout=15).json()
        assert isinstance(inv, list) and len(inv) >= 1

    def test_kingdom_upgrade_castle(self, s_user):
        # castle is level 1 from start; upgrading should work or fail with not enough aether
        r = s_user.post(f"{API}/kingdom/upgrade/castle", timeout=15)
        # Acceptable: 200 success OR 400 if too poor — but we want to assert endpoint exists
        assert r.status_code in (200, 400), f"{r.status_code}: {r.text}"


# ---------- Leaderboards & Hall ----------
class TestLeaderboards:
    @pytest.mark.parametrize("cat", ["xp", "level", "reputation", "aether"])
    def test_leaderboard(self, s_anon, cat):
        r = s_anon.get(f"{API}/leaderboard/{cat}", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_hall(self, s_anon):
        r = s_anon.get(f"{API}/hall-of-legends", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Chronicle & Badges ----------
class TestChronicleBadges:
    def test_chronicle(self, s_user):
        r = s_user.get(f"{API}/chronicle", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # at least creation entry

    def test_badges_mine(self, s_user):
        r = s_user.get(f"{API}/badges/mine", timeout=15)
        assert r.status_code == 200
        ids = [b.get("badge_id") for b in r.json()]
        assert "founder" in ids


# ---------- Rifts & Boss ----------
class TestRiftsBoss:
    def test_rift_check(self, s_user):
        r = s_user.get(f"{API}/rifts/check", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "rift" in body

    def test_boss(self, s_anon):
        r = s_anon.get(f"{API}/boss", timeout=15)
        assert r.status_code == 200
        boss = r.json()
        assert "name" in boss
        assert "progress" in boss
        assert "target" in boss


# ---------- Oracle (Claude Sonnet 4.5) ----------
class TestOracle:
    def test_oracle_consult(self, s_user):
        r = s_user.post(f"{API}/oracle/consult", json={"question": "Quel chemin dois-je suivre pour devenir un héros légendaire ?"}, timeout=60)
        assert r.status_code == 200, f"{r.status_code}: {r.text}"
        resp = r.json().get("response", "")
        assert isinstance(resp, str)
        assert len(resp) > 30, f"Oracle response too short (fallback?): {resp!r}"
        # heuristic: a real Claude response will mostly not contain the literal phrase "indisponible" or empty fallback
        # we just ensure it's substantial
        print(f"Oracle response sample: {resp[:200]}")

    def test_oracle_quest(self, s_user):
        r = s_user.post(f"{API}/oracle/quest", timeout=60)
        assert r.status_code == 200, r.text
        quest = r.json()
        assert isinstance(quest, dict)


# ---------- Admin ----------
class TestAdmin:
    def test_admin_stats_forbidden_for_user(self, s_user):
        r = s_user.get(f"{API}/admin/stats", timeout=15)
        assert r.status_code in (401, 403)

    def test_admin_stats_ok(self, s_admin):
        r = s_admin.get(f"{API}/admin/stats", timeout=15)
        assert r.status_code == 200
        body = r.json()
        for k in ["users", "posts", "comments", "badges_granted"]:
            assert k in body

    def test_admin_users(self, s_admin):
        r = s_admin.get(f"{API}/admin/users", timeout=15)
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list) and len(users) >= 1
        # password_hash must not leak
        for u in users:
            assert "password_hash" not in u
