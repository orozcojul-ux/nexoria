"""NEXORIA batch 3 feature tests: World Map, Admin Shop CRUD, optimistic shop ownership,
badges (merchant, polyglot, badge-notification), chest no-duplicates + refund + rarity weights,
profile customization (avatar/active_banner)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nexoria-hero.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@nexoria.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")


def _bearer(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    s.cookies.clear()
    return s


# Fresh user fixture (its own scope for batch3 to test from-zero badges)
@pytest.fixture(scope="module")
def fresh_user():
    sess = requests.Session()
    uniq = uuid.uuid4().hex[:8]
    payload = {
        "email": f"TEST_b3_{uniq}@nexoria-test.com",
        "username": f"TEST_b3_{uniq}",
        "password": "TestPass123!",
        "class_id": "mage",
    }
    r = sess.post(f"{API}/auth/register", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    b = _bearer(data["session_token"])
    b.user_data = data
    b.username = payload["username"]
    return b


@pytest.fixture(scope="module")
def admin_sess():
    sess = requests.Session()
    r = sess.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return _bearer(r.json()["session_token"])


# ---------- World Map ----------
class TestWorldMap:
    def test_get_world_heroes_shape(self, fresh_user):
        r = fresh_user.get(f"{API}/world/heroes", timeout=15)
        assert r.status_code == 200, r.text
        heroes = r.json()
        assert isinstance(heroes, list)
        assert len(heroes) > 0
        # find current user in the map
        me_user = fresh_user.user_data
        mine = next((h for h in heroes if h["user_id"] == me_user["user_id"]), None)
        assert mine is not None, "Current user must appear on the world map"
        # required fields
        for key in ("x", "y", "class_id", "role", "online", "username"):
            assert key in mine, f"Missing field {key} on world hero entry"
        assert isinstance(mine["x"], int) and 0 <= mine["x"] <= 100
        assert isinstance(mine["y"], int) and 0 <= mine["y"] <= 100
        assert isinstance(mine["online"], bool)

    def test_world_anonymous_access(self):
        # Public endpoint? Try without auth
        r = requests.get(f"{API}/world/heroes", timeout=15)
        # Whether public or auth-only, must NOT be 500
        assert r.status_code in (200, 401, 403), f"Unexpected {r.status_code}: {r.text}"


# ---------- Admin Shop CRUD ----------
class TestAdminShopCRUD:
    def test_admin_shop_list_includes_static_and_source(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/shop", timeout=15)
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list) and len(items) > 0
        # static items present
        statics = [i for i in items if i.get("source") == "static"]
        assert len(statics) > 0, "Expected static items with source='static'"
        for i in statics:
            assert "sku" in i and "price" in i and "category" in i

    def test_user_cannot_admin_shop(self, fresh_user):
        r = fresh_user.get(f"{API}/admin/shop", timeout=15)
        assert r.status_code in (401, 403)

    def test_admin_shop_create_update_delete(self, admin_sess):
        uniq = uuid.uuid4().hex[:6]
        sku = f"test_b3_{uniq}"
        # CREATE
        payload = {
            "sku": sku,
            "name": "TEST B3 Item",
            "price": 10,
            "category": "cosmetic",
            "icon": "Sparkles",
            "rarity": "common",
            "description": "Created by batch3 test",
        }
        r = admin_sess.post(f"{API}/admin/shop", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["sku"] == sku and created["price"] == 10

        # Verify via GET (persistence)
        r = admin_sess.get(f"{API}/admin/shop", timeout=15)
        all_items = r.json()
        mine = next((i for i in all_items if i.get("sku") == sku), None)
        assert mine is not None, "Custom item not present after creation"
        assert mine.get("source") == "custom"

        # UPDATE
        upd = {**payload, "name": "TEST B3 Item Updated", "price": 25}
        r = admin_sess.put(f"{API}/admin/shop/{sku}", json=upd, timeout=15)
        assert r.status_code == 200, r.text

        r = admin_sess.get(f"{API}/admin/shop", timeout=15)
        mine = next((i for i in r.json() if i.get("sku") == sku), None)
        assert mine["name"] == "TEST B3 Item Updated"
        assert mine["price"] == 25

        # Duplicate SKU rejected
        r = admin_sess.post(f"{API}/admin/shop", json=payload, timeout=15)
        assert r.status_code == 400

        # Updating a STATIC sku must be rejected
        r = admin_sess.put(f"{API}/admin/shop/banner_dragon", json=upd, timeout=15)
        assert r.status_code in (400, 404), f"Static item edit must fail, got {r.status_code}"

        # DELETE custom
        r = admin_sess.delete(f"{API}/admin/shop/{sku}", timeout=15)
        assert r.status_code == 200

        # Confirm gone
        r = admin_sess.get(f"{API}/admin/shop", timeout=15)
        assert not any(i.get("sku") == sku for i in r.json())

        # Static delete rejected
        r = admin_sess.delete(f"{API}/admin/shop/banner_dragon", timeout=15)
        assert r.status_code == 400


# ---------- Shop buy → optimistic + merchant badge + duplicate rejection ----------
class TestShopPurchase:
    def test_first_purchase_grants_merchant_badge_and_locks_cosmetic(self, fresh_user, admin_sess):
        # Give user enough aether via admin edit
        me_id = fresh_user.user_data["user_id"]
        r = admin_sess.put(f"{API}/admin/users/{me_id}",
                           json={"aether": 5000},
                           timeout=15)
        assert r.status_code == 200, r.text

        # List shop items, find an affordable cosmetic
        r = fresh_user.get(f"{API}/shop/items", timeout=15)
        assert r.status_code == 200
        items = r.json()
        cosmetics = [i for i in items if i.get("category") == "cosmetic"]
        cosmetics.sort(key=lambda x: x.get("price", 999999))
        assert len(cosmetics) > 0
        target = cosmetics[0]
        sku = target["sku"]

        # Verify no merchant badge yet
        prof = fresh_user.get(f"{API}/profile/{fresh_user.username}", timeout=15).json()
        existing_badges = [b.get("badge_id") for b in (prof.get("badges") or [])]
        assert "merchant" not in existing_badges, f"Merchant badge should not exist pre-purchase: {existing_badges}"

        # First purchase
        r = fresh_user.post(f"{API}/shop/purchase/{sku}", timeout=15)
        assert r.status_code == 200, r.text

        # Merchant badge granted
        prof = fresh_user.get(f"{API}/profile/{fresh_user.username}", timeout=15).json()
        post_badges = [b.get("badge_id") for b in (prof.get("badges") or [])]
        assert "merchant" in post_badges, f"merchant badge missing after first purchase. Got: {post_badges}"

        # Re-buying same cosmetic returns 400 with proper message
        r = fresh_user.post(f"{API}/shop/purchase/{sku}", timeout=15)
        assert r.status_code == 400
        msg = r.json().get("detail", "")
        assert "déjà" in msg.lower() or "already" in msg.lower(), f"Unexpected error msg: {msg}"

        # GET shop inventory reflects ownership immediately
        r = fresh_user.get(f"{API}/shop/inventory", timeout=15)
        if r.status_code == 200:
            owned = r.json().get("cosmetics", [])
            assert any(c.get("sku") == sku for c in owned), "Cosmetic not in /shop/inventory.cosmetics after buy"


# ---------- Polyglot badge ----------
class TestPolyglotBadge:
    def test_changing_language_twice_grants_polyglot(self, fresh_user):
        # Switch language twice (fr default -> en -> es)
        r = fresh_user.put(f"{API}/profile", json={"language": "en"}, timeout=15)
        assert r.status_code == 200, r.text
        r = fresh_user.put(f"{API}/profile", json={"language": "es"}, timeout=15)
        assert r.status_code == 200, r.text

        prof = fresh_user.get(f"{API}/profile/{fresh_user.username}", timeout=15).json()
        badges = [b.get("badge_id") for b in (prof.get("badges") or [])]
        assert "polyglot" in badges, f"polyglot badge missing after 2 lang changes. Got: {badges}"


# ---------- Badge notification on grant ----------
class TestBadgeNotification:
    def test_first_step_creates_notification(self):
        # Brand-new user → post 1 → first_step badge → notification
        sess = requests.Session()
        uniq = uuid.uuid4().hex[:8]
        payload = {
            "email": f"TEST_bn_{uniq}@nexoria-test.com",
            "username": f"TEST_bn_{uniq}",
            "password": "TestPass123!",
            "class_id": "mage",
        }
        r = sess.post(f"{API}/auth/register", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        b = _bearer(r.json()["session_token"])

        # Create first post
        r = b.post(f"{API}/posts", json={"content": "TEST first post badge notif"}, timeout=15)
        assert r.status_code == 200

        # Check notifications
        r = b.get(f"{API}/notifications", timeout=15)
        if r.status_code == 404:
            pytest.skip("/api/notifications endpoint not present")
        assert r.status_code == 200, r.text
        body = r.json()
        notifs = body.get("items", body) if isinstance(body, dict) else body
        # Expect at least one badge-type notification (first_step)
        badge_notifs = [n for n in notifs if isinstance(n, dict) and (n.get("type") == "badge" or n.get("kind") == "badge")]
        assert len(badge_notifs) >= 1, f"No badge notification. Got: {notifs}"


# ---------- Chest no-duplicate + refund ----------
class TestChestDuplicateAndRefund:
    def test_chest_returns_no_duplicates_or_refunds(self, fresh_user, admin_sess):
        # Top up aether for many opens via admin user edit
        me_id = fresh_user.user_data["user_id"]
        r = admin_sess.put(f"{API}/admin/users/{me_id}",
                           json={"aether": 10000},
                           timeout=15)
        assert r.status_code == 200, r.text

        # Open multiple chests and verify items returned have no duplicates
        # (relative to user's pre-existing inventory).
        ever_seen = set()
        for _ in range(5):
            inv_before = {(it["name"], it["rarity"])
                          for it in fresh_user.get(f"{API}/inventory", timeout=15).json()}
            r = fresh_user.post(f"{API}/inventory/open-chest", timeout=15)
            if r.status_code != 200:
                break
            data = r.json()
            for it in data.get("items", []):
                key = (it["name"], it["rarity"])
                assert key not in inv_before, f"Chest returned dup of pre-owned: {key}"
                ever_seen.add(key)
            # If refunded — verify shape
            if data.get("refunded"):
                assert data["refunded"] == 50

    def test_chest_rarity_weights_tuned(self):
        # Sanity: verify weights in game_data make rare items rare. Sum of rare+ < 30.
        # Test via direct import to avoid 500 chests.
        try:
            import sys
            sys.path.insert(0, "/app/backend")
            from game_data import RARITIES
        except Exception as e:
            pytest.skip(f"Cannot import game_data: {e}")
        total = sum(r["weight"] for r in RARITIES.values())
        common_weight = RARITIES["common"]["weight"]
        # Common should dominate (>60% of probability mass)
        assert common_weight / total > 0.60, f"Common too rare: {common_weight}/{total}"
        # Mythic + Divine + Cosmic combined < 1% of probability mass
        ultra = (RARITIES["mythic"]["weight"] + RARITIES["divine"]["weight"] + RARITIES["cosmic"]["weight"]) / total
        assert ultra < 0.01, f"Ultra-rare too common: {ultra:.4f}"


# ---------- Profile customization (avatar + banner) ----------
class TestProfileCustomization:
    def test_update_avatar_url(self, fresh_user):
        r = fresh_user.put(f"{API}/profile",
                           json={"avatar_url": "https://cdn.nexoria.example/avatar.png"},
                           timeout=15)
        assert r.status_code == 200
        me = fresh_user.get(f"{API}/auth/me", timeout=15).json()
        assert me["avatar_url"] == "https://cdn.nexoria.example/avatar.png"

    def test_active_banner_requires_ownership(self, fresh_user):
        # Try to equip a banner the user does NOT own → must be 400
        r = fresh_user.put(f"{API}/profile",
                           json={"active_banner": "banner_dragon"},
                           timeout=15)
        assert r.status_code == 400, f"Expected 400 for un-owned banner, got {r.status_code}: {r.text}"
