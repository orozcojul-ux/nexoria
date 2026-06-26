"""Unit tests — beta tester class change entitlement."""
from beta_access import (
    BETA_CLASS_CHANGES_ALLOWED,
    beta_class_change_available,
    beta_class_changes_used,
    is_beta_key_tester,
)


def test_is_beta_key_tester_requires_key():
    assert not is_beta_key_tester({"beta_access": True})
    assert not is_beta_key_tester({"beta_key_used": "BETA-AAAA-BBBB"})
    assert is_beta_key_tester({"beta_access": True, "beta_key_used": "BETA-AAAA-BBBB"})


def test_beta_class_change_available_once():
    user = {"beta_access": True, "beta_key_used": "BETA-AAAA-BBBB", "beta_class_changes_used": 0}
    assert beta_class_change_available(user) is True
    user["beta_class_changes_used"] = BETA_CLASS_CHANGES_ALLOWED
    assert beta_class_change_available(user) is False


def test_non_beta_has_no_beta_slot():
    assert beta_class_change_available({"beta_access": False}) is False
    assert beta_class_changes_used({}) == 0
