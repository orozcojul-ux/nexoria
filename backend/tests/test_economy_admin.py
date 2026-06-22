"""Economy admin dashboard — access control and adjust-ecus."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nexoria-hero.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@nexoria.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "NexoriaAdmin2026!")


def _rand(prefix="TEST_eco"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    data = r.json()
    if data.get("role") != "admin":
        pytest.skip("Login user is not admin")
    return s, data


def _register(prefix="TEST_eco"):
    s = requests.Session()
    uname = _rand(prefix)
    email = f"{uname}@test.nexoria"
    r = s.post(f"{API}/auth/register", json={
        "email": email, "username": uname, "password": "TestPass1!", "class_id": "warrior"
    }, timeout=15)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    d = r.json()
    return s, d, email


class TestEconomyAdminAccess:
    def test_normal_user_blocked_from_summary(self):
        _, user_doc, _ = _register("TEST_eco_user")
        token = user_doc["session_token"]
        s = requests.Session()
        s.headers["Authorization"] = f"Bearer {token}"
        r = s.get(f"{API}/admin/economy/summary", timeout=15)
        assert r.status_code == 403, f"Expected 403, got {r.status_code} {r.text}"

    def test_admin_can_load_summary(self, admin_session):
        admin_s, _ = admin_session
        r = admin_s.get(f"{API}/admin/economy/summary", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "total_ecus_in_circulation" in data
        assert "ecus_created_today" in data
        assert isinstance(data.get("by_source"), list)
        assert isinstance(data.get("alerts"), list)

    def test_admin_can_list_transactions(self, admin_session):
        admin_s, _ = admin_session
        r = admin_s.get(f"{API}/admin/economy/transactions", params={"limit": 10, "page": 1}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "items" in data
        assert "total" in data
        assert "pages" in data

    def test_admin_can_load_top_richest(self, admin_session):
        admin_s, _ = admin_session
        r = admin_s.get(f"{API}/admin/economy/top-richest", timeout=15)
        assert r.status_code == 200, r.text
        assert isinstance(r.json().get("items"), list)

    def test_admin_can_load_items_summary(self, admin_session):
        admin_s, _ = admin_session
        r = admin_s.get(f"{API}/admin/economy/items-summary", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "most_owned_items" in data
        assert "top_crafts" in data


class TestEconomyAdjustEcus:
    def test_adjust_ecus_requires_reason(self, admin_session):
        admin_s, _ = admin_session
        _, user_doc, _ = _register("TEST_eco_adj")
        r = admin_s.post(f"{API}/admin/economy/adjust-ecus", json={
            "user_id": user_doc["user_id"],
            "amount": 50,
            "reason": "ab",
        }, timeout=15)
        assert r.status_code == 422, f"Expected validation error: {r.status_code} {r.text}"

    def test_adjust_ecus_add_and_log(self, admin_session):
        admin_s, _ = admin_session
        _, user_doc, _ = _register("TEST_eco_grant")
        uid = user_doc["user_id"]
        reason = f"test-compensation-{uuid.uuid4().hex[:6]}"

        r = admin_s.post(f"{API}/admin/economy/adjust-ecus", json={
            "user_id": uid,
            "amount": 42,
            "reason": reason,
        }, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert body.get("balance_after", 0) >= 42

        tx = admin_s.get(f"{API}/admin/economy/transactions", params={
            "user_id": uid,
            "limit": 5,
        }, timeout=15)
        assert tx.status_code == 200
        items = tx.json().get("items") or []
        assert any(reason in (t.get("reason") or "") for t in items), "Transaction not logged"

    def test_normal_user_cannot_adjust(self):
        user_s, user_doc, _ = _register("TEST_eco_no_adj")
        token = user_doc["session_token"]
        s = requests.Session()
        s.headers["Authorization"] = f"Bearer {token}"
        r = s.post(f"{API}/admin/economy/adjust-ecus", json={
            "user_id": user_doc["user_id"],
            "amount": 100,
            "reason": "hack attempt",
        }, timeout=15)
        assert r.status_code == 403


class TestEconomyHelpers:
    def test_infer_economy_source(self):
        from economy_transactions import infer_economy_source

        assert infer_economy_source("Récompense quête journalière") == "quest"
        assert infer_economy_source("Roue du Nexus") == "wheel"
        assert infer_economy_source("Forge — palier 2") == "craft"
        assert infer_economy_source("xyz random") == "unknown"
        assert infer_economy_source("anything", explicit="shop") == "shop"
