"""Filtre file modération — cas réels uniquement."""
from naria_moderation import NON_MODERATION_ACTION_TYPES, merge_mongo_filters, moderation_cases_filter


def test_non_moderation_includes_role_and_forum_admin():
    assert "role_grant" in NON_MODERATION_ACTION_TYPES
    assert "forum_pin" in NON_MODERATION_ACTION_TYPES
    assert "score_reset" in NON_MODERATION_ACTION_TYPES


def test_moderation_cases_filter_excludes_admin_actions():
    filt = moderation_cases_filter()
    assert filt["$and"][0]["actionType"]["$nin"]
    assert "role_change" in filt["$and"][0]["actionType"]["$nin"]
    assert "hide" not in filt["$and"][0]["actionType"]["$nin"]


def test_merge_mongo_filters():
    merged = merge_mongo_filters(moderation_cases_filter(), {"status": "pending_review"})
    assert "$and" in merged
    parts = merged["$and"]
    assert len(parts) == 2
