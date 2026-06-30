"""Tests helpers accès beta."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import beta_access


def test_beta_key_grants_access_for_owner_after_use():
    doc = {
        "key": "BETA-ABCD-1234",
        "active": True,
        "used_by_user_id": "user_abc",
        "uses": 1,
        "max_uses": 1,
    }
    assert beta_access.beta_key_is_available(doc) is False
    assert beta_access.beta_key_grants_access(doc, "user_abc") is True
    assert beta_access.beta_key_grants_access(doc, "user_other") is False


def test_beta_key_grants_access_when_still_available():
    doc = {"key": "BETA-ABCD-1234", "active": True, "uses": 0, "max_uses": 1}
    assert beta_access.beta_key_grants_access(doc, None) is True
