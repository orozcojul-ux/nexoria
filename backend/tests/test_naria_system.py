"""Tests for system sentinel helpers."""
from naria_system import (
    NARIA_SYSTEM_KEY,
    NARIA_USERNAME,
    SENTINEL_REGISTRY,
    SHUMI_LEGACY_SYSTEM_KEY,
    SHUMI_LEGACY_USERNAME,
    SHUMI_SYSTEM_KEY,
    SHUMI_USERNAME,
    apply_shumi_display_identity,
    build_naria_document,
    build_shumi_document,
    is_moderation_actor_user,
    is_official_sentinel,
    is_shumi_sentinel,
    is_system_user,
    merge_official_sentinel_team_row,
    player_users_filter,
    strip_system_fields,
)


def test_sentinelle_title_in_catalog():
    from game_data import all_title_ids, SYSTEM_TITLES
    assert "sentinelle" in all_title_ids()
    assert "sentinelle" in SYSTEM_TITLES


def test_build_naria_document_has_required_fields():
    doc = build_naria_document()
    assert doc["username"] == NARIA_USERNAME
    assert doc["system_key"] == NARIA_SYSTEM_KEY
    assert doc["class_id"] == "chronomancer"
    assert doc["class_name"] == "Chronomancien"
    assert doc["can_login"] is False
    assert doc["is_system"] is True
    assert doc["show_in_team"] is True
    assert doc["show_in_community_team"] is True
    assert doc["is_moderation_actor"] is True
    assert doc["password_hash"]


def test_build_shumi_document_has_required_fields():
    doc = build_shumi_document()
    assert doc["username"] == SHUMI_USERNAME
    assert doc["system_key"] == SHUMI_SYSTEM_KEY
    assert doc["class_id"] == "assassin"
    assert doc["class_name"] == "Assassin"
    assert doc["can_login"] is False
    assert doc["is_moderation_actor"] is True
    assert doc["show_in_community_team"] is True


def test_is_system_user():
    assert is_system_user({"system_key": "naria"})
    assert is_system_user({"system_key": "shumi"})
    assert is_system_user({"is_system": True, "username": "X"})
    assert not is_system_user({"username": "Hero"})


def test_is_official_sentinel():
    assert is_official_sentinel({"system_key": "naria"})
    assert is_official_sentinel({"system_key": "shumi"})
    assert is_official_sentinel({"system_key": SHUMI_LEGACY_SYSTEM_KEY})
    assert not is_official_sentinel({"role": "admin"})


def test_legacy_vigile_displays_as_shumi_on_team_row():
    legacy = {
        "user_id": "usr_vigile",
        "username": SHUMI_LEGACY_USERNAME,
        "system_key": SHUMI_LEGACY_SYSTEM_KEY,
        "is_moderation_actor": True,
        "is_system": True,
        "role": "sentinelle",
        "show_in_community_team": True,
    }
    assert is_shumi_sentinel(legacy)
    row = merge_official_sentinel_team_row(legacy, None, "Owner")
    assert row["username"] == SHUMI_USERNAME
    assert row["display_name"] == SHUMI_USERNAME
    assert row["system_key"] == SHUMI_SYSTEM_KEY


def test_apply_shumi_display_identity():
    out = apply_shumi_display_identity({"username": SHUMI_LEGACY_USERNAME, "display_name": SHUMI_LEGACY_USERNAME})
    assert out["username"] == SHUMI_USERNAME
    assert out["display_name"] == SHUMI_USERNAME


def test_legacy_vigile_bio_sanitized_on_team_row():
    legacy = {
        "user_id": "usr_vigile",
        "username": SHUMI_LEGACY_USERNAME,
        "system_key": SHUMI_LEGACY_SYSTEM_KEY,
        "is_moderation_actor": True,
        "is_system": True,
        "role": "sentinelle",
        "show_in_community_team": True,
        "bio": "Vigile applique les règles du Nexus et veille au respect de la communauté.",
        "level": 99,
    }
    row = merge_official_sentinel_team_row(legacy, None, "Owner")
    assert "Vigile" not in row["team_bio"]
    assert row["team_bio"].startswith("Shumi")


def test_is_moderation_actor_user():
    assert is_moderation_actor_user({"system_key": "shumi"})
    assert is_moderation_actor_user({"system_key": "naria"})


def test_moderation_actor_routing():
    from naria_system import moderation_actor_system_key, NARIA_SYSTEM_KEY, SHUMI_SYSTEM_KEY
    assert moderation_actor_system_key("forum_thread") == NARIA_SYSTEM_KEY
    assert moderation_actor_system_key("profile") == NARIA_SYSTEM_KEY
    assert moderation_actor_system_key("feed_post") == NARIA_SYSTEM_KEY
    assert moderation_actor_system_key("feed_comment") == NARIA_SYSTEM_KEY
    assert moderation_actor_system_key("news_comment") == NARIA_SYSTEM_KEY
    assert moderation_actor_system_key("friend_message") == NARIA_SYSTEM_KEY
    assert moderation_actor_system_key("nexus_room_chat") == SHUMI_SYSTEM_KEY
    assert moderation_actor_system_key("guild_chat") == SHUMI_SYSTEM_KEY


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


def test_player_users_filter_excludes_system_sentinels():
    filt = player_users_filter()
    assert set(SENTINEL_REGISTRY.keys()).issubset(set(filt["system_key"]["$nin"]))
    assert filt["is_system"] == {"$ne": True}
