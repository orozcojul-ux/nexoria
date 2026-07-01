"""Tests for Naria system user helpers."""
from naria_system import (
    NARIA_SYSTEM_KEY,
    NARIA_USERNAME,
    build_naria_document,
    is_official_sentinel,
    is_system_user,
    player_users_filter,
    strip_system_fields,
)


def test_build_naria_document_has_required_fields():
    doc = build_naria_document()
    assert doc["username"] == NARIA_USERNAME
    assert doc["system_key"] == NARIA_SYSTEM_KEY
    assert doc["can_login"] is False
    assert doc["is_system"] is True
    assert doc["show_in_team"] is True
    assert doc["show_in_community_team"] is True
    assert doc["password_hash"]


def test_is_system_user():
    assert is_system_user({"system_key": "naria"})
    assert is_system_user({"is_system": True, "username": "X"})
    assert not is_system_user({"username": "Hero"})


def test_is_official_sentinel():
    assert is_official_sentinel({"system_key": "naria"})
    assert not is_official_sentinel({"role": "admin"})


def test_strip_system_fields():
    raw = {
        "username": "Naria",
        "email": "naria@system.nexoria",
        "system_key": "naria",
        "can_login": False,
        "level": 99,
    }
    pub = strip_system_fields(raw)
    assert "email" not in pub
    assert "system_key" not in pub
    assert pub.get("is_official_sentinel") is True


def test_player_users_filter_excludes_naria():
    filt = player_users_filter()
    assert filt["system_key"] == {"$ne": "naria"}
    assert filt["is_system"] == {"$ne": True}
