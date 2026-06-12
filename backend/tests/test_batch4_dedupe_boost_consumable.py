"""NEXORIA batch 4 — Inventory dedupe (migration + endpoint), boost re-purchase block,
consumable stacking via quantity, all-owned chest refund regression."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nexoria-hero.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@nexoria.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "NexoriaAdmin2026!")


def _bearer(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    s.cookies.clear()
    return s


@pytest.fixture(scope="module")
def admin_sess():
    sess = requests.Session()
    r = sess.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return _bearer(r.json()["session_token"])


def _register_user(prefix="b4"):
    uniq = uuid.uuid4().hex[:8]
    payload = {
        "email": f"TEST_{prefix}_{uniq}@nexoria-test.com",
        "username": f"TEST_{prefix}_{uniq}",
        "password": "TestPass123!",
        "class_id": "mage",
    }
    r = requests.post(f"{API}/auth/register", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    b = _bearer(data["session_token"])
    b.user_id = data.get("user_id") or data.get("user", {}).get("user_id")
    assert b.user_id, f"No user_id in register response: {data}"
    b.email = payload["email"]
    return b


def _topup(admin_sess, user_id, aether):
    r = admin_sess.put(f"{API}/admin/users/{user_id}", json={"aether": aether}, timeout=30)
    assert r.status_code == 200, r.text


def _balance(sess):
    r = sess.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 200, r.text
    return r.json().get("aether", 0)


# ---------- 1. Inventory dedupe (auto on GET + manual endpoint) ----------
class TestInventoryDedupe:
    def test_inventory_get_returns_no_duplicates(self, admin_sess):
        """Migration ran at startup; GET /api/inventory should now show no (name, rarity) duplicates per user."""
        r = admin_sess.get(f"{API}/inventory", timeout=20)
        assert r.status_code == 200, r.text
        items = r.json()
        seen = set()
        for it in items:
            key = (it.get("name"), it.get("rarity"))
            assert key not in seen, f"Duplicate found in inventory: {key}"
            seen.add(key)

    def test_dedupe_endpoint_exists_and_returns_removed(self, admin_sess):
        r = admin_sess.post(f"{API}/inventory/dedupe", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "removed" in data
        assert isinstance(data["removed"], int)
        # After migration, should be idempotent → 0
        assert data["removed"] == 0


# ---------- 2. Open chest all_owned → refund ----------
class TestChestAllOwnedRefund:
    def test_admin_chest_returns_refund_or_items_no_balance_loss_on_all_owned(self, admin_sess):
        """Admin likely owns many items. Open chest: if items==[], must return refunded=50 and balance unchanged."""
        before = _balance(admin_sess)
        # ensure enough aether
        if before < 50:
            r = admin_sess.put(f"{API}/admin/users/{admin_sess.headers.get('X-Admin-Id', '')}", json={"aether": 100})
            # not critical; fallback: skip if can't open
            before = _balance(admin_sess)
        if before < 50:
            pytest.skip("Admin has insufficient Aether for chest test")

        r = admin_sess.post(f"{API}/inventory/open-chest", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        after = _balance(admin_sess)
        if data.get("reason") == "all_owned":
            assert data.get("items") == []
            assert data.get("refunded") == 50
            assert after == before, f"Aether changed on all_owned: {before} -> {after}"
        else:
            # Got items → cost debited
            assert isinstance(data.get("items"), list) and len(data["items"]) > 0
            assert after == before - 50


# ---------- 3. Boost re-purchase blocked while active ----------
class TestBoostRebuyBlocked:
    def test_second_boost_purchase_returns_400_and_refunds(self, admin_sess):
        user = _register_user("b4boost")
        _topup(admin_sess, user.user_id, 5000)

        # pick a real boost SKU from shop
        r = user.get(f"{API}/shop/items", timeout=15)
        assert r.status_code == 200, r.text
        items = r.json()
        boosts = [i for i in items if i.get("category") == "boost"]
        assert len(boosts) > 0, "No boost items available in shop"
        boost = boosts[0]
        sku = boost["sku"]
        price = boost["price"]

        # 1st purchase OK
        balance_before_1 = _balance(user)
        r1 = user.post(f"{API}/shop/purchase/" + sku, timeout=20)
        assert r1.status_code == 200, r1.text
        balance_after_1 = _balance(user)
        assert balance_after_1 == balance_before_1 - price, \
            f"First boost purchase didn't debit price: {balance_before_1} -> {balance_after_1} (price={price})"

        # 2nd purchase of SAME boost while active → 400
        balance_before_2 = _balance(user)
        r2 = user.post(f"{API}/shop/purchase/" + sku, timeout=20)
        assert r2.status_code == 400, f"Expected 400, got {r2.status_code}: {r2.text}"
        detail = r2.json().get("detail", "")
        assert detail.startswith("Un effet"), f"Unexpected detail: {detail}"

        # Aether NOT charged on rejection
        balance_after_2 = _balance(user)
        assert balance_after_2 == balance_before_2, \
            f"Aether changed on rejected boost: {balance_before_2} -> {balance_after_2}"


# ---------- 4. Consumable stacking via quantity ----------
class TestConsumableStacking:
    def test_buying_consumable_twice_stacks_quantity(self, admin_sess):
        user = _register_user("b4cons")
        _topup(admin_sess, user.user_id, 5000)

        # Find a non-rift consumable (summon_rift creates a rift row, not a stack)
        r = user.get(f"{API}/shop/items", timeout=15)
        assert r.status_code == 200, r.text
        items = r.json()
        cons = [i for i in items if i.get("category") == "consumable" and i.get("sku") != "summon_rift"]
        assert len(cons) > 0
        # Prefer scroll_rename
        c = next((x for x in cons if x["sku"] == "scroll_rename"), cons[0])
        sku = c["sku"]
        price = c["price"]

        balance_before = _balance(user)

        # 1st buy
        r1 = user.post(f"{API}/shop/purchase/" + sku, timeout=20)
        assert r1.status_code == 200, r1.text

        # 2nd buy — should succeed and stack
        r2 = user.post(f"{API}/shop/purchase/" + sku, timeout=20)
        assert r2.status_code == 200, f"Second consumable buy failed: {r2.status_code} {r2.text}"

        balance_after = _balance(user)
        assert balance_after == balance_before - (price * 2), \
            f"Both purchases not debited: {balance_before} -> {balance_after} (expected -{price * 2})"

        # GET /shop/inventory → owned.consumables has SINGLE row with quantity=2
        r3 = user.get(f"{API}/shop/inventory", timeout=15)
        assert r3.status_code == 200, r3.text
        inv = r3.json()
        cons_rows = [c for c in inv.get("consumables", []) if c.get("sku") == sku]
        assert len(cons_rows) == 1, f"Expected 1 stacked row for {sku}, got {len(cons_rows)}: {cons_rows}"
        assert cons_rows[0].get("quantity") == 2, f"Expected quantity=2, got {cons_rows[0].get('quantity')}"

        # 3rd buy → quantity = 3
        r4 = user.post(f"{API}/shop/purchase/" + sku, timeout=20)
        assert r4.status_code == 200, r4.text
        r5 = user.get(f"{API}/shop/inventory", timeout=15)
        cons_rows2 = [c for c in r5.json().get("consumables", []) if c.get("sku") == sku]
        assert len(cons_rows2) == 1
        assert cons_rows2[0].get("quantity") == 3


# ---------- 5. Regression — cosmetic/kingdom duplicate purchase still blocked ----------
class TestCosmeticKingdomDuplicateBlocked:
    def test_cosmetic_duplicate_returns_400(self, admin_sess):
        user = _register_user("b4cos")
        _topup(admin_sess, user.user_id, 5000)

        r = user.get(f"{API}/shop/items", timeout=15)
        items = r.json()
        cosm = next((i for i in items if i.get("category") == "cosmetic"), None)
        assert cosm, "No cosmetic in shop"

        r1 = user.post(f"{API}/shop/purchase/" + cosm["sku"], timeout=20)
        assert r1.status_code == 200, r1.text

        r2 = user.post(f"{API}/shop/purchase/" + cosm["sku"], timeout=20)
        assert r2.status_code == 400
        assert "déjà" in r2.json().get("detail", "")

    def test_kingdom_duplicate_returns_400(self, admin_sess):
        user = _register_user("b4kgd")
        _topup(admin_sess, user.user_id, 5000)

        r = user.get(f"{API}/shop/items", timeout=15)
        items = r.json()
        kgd = next((i for i in items if i.get("category") == "kingdom"), None)
        assert kgd, "No kingdom item in shop"

        r1 = user.post(f"{API}/shop/purchase/" + kgd["sku"], timeout=20)
        assert r1.status_code == 200, r1.text

        r2 = user.post(f"{API}/shop/purchase/" + kgd["sku"], timeout=20)
        assert r2.status_code == 400
        assert "déjà" in r2.json().get("detail", "")
