"""Tests filtres logs sentinelles admin."""
import pytest
from fastapi import HTTPException

from naria_routes import (
    _actor_log_filter,
    _is_duplicate_sentinel_staff,
    _sentinel_log_filter,
    _staff_log_filter,
)


class TestSentinelLogFilters:
    def test_naria_includes_forum_content_type(self):
        filt = _sentinel_log_filter("naria")
        assert "$or" in filt
        types_clause = next(
            c for c in filt["$or"]
            if isinstance(c, dict) and c.get("$and") and any(
                "contentType" in sub for sub in c["$and"]
            )
        )
        content_in = next(
            sub["contentType"]["$in"]
            for sub in types_clause["$and"]
            if "contentType" in sub
        )
        assert "forum" in content_in
        assert "feed_post" in content_in

    def test_naria_staff_community_actions(self):
        filt = _sentinel_log_filter("naria")
        staff_clause = next(
            c for c in filt["$or"]
            if c.get("$and") and any(sub.get("actionSource") == "staff" for sub in c["$and"])
        )
        assert staff_clause is not None

    def test_shumi_excludes_plain_staff_community(self):
        filt = _sentinel_log_filter("shumi")
        for clause in filt["$or"]:
            if isinstance(clause, dict) and "$and" in clause:
                for sub in clause["$and"]:
                    if sub.get("actionSource") == "staff":
                        types = sub.get("$or") or []
                        for t in types:
                            if "contentType" in t:
                                assert "feed_post" not in t["contentType"].get("$in", [])

    def test_shumi_includes_nexus_types(self):
        filt = _sentinel_log_filter("shumi")
        assert any(c.get("actionSource") == "shumi" for c in filt["$or"])

    def test_staff_filter_matches_action_source(self):
        filt = _staff_log_filter()
        assert any(c.get("actionSource") == "staff" for c in filt["$or"])

    def test_actor_filter_by_user_id(self):
        filt = _actor_log_filter(user_id="u123")
        assert filt == {"actorId": "u123"}

    def test_actor_filter_requires_id(self):
        with pytest.raises(HTTPException):
            _actor_log_filter()


class TestSentinelStaffDedup:
    def test_skips_system_naria(self):
        assert _is_duplicate_sentinel_staff({
            "username": "Naria",
            "system_key": "naria",
            "is_system": True,
        })

    def test_skips_admin_named_naria(self):
        assert _is_duplicate_sentinel_staff({"username": "Naria", "role": "admin"})

    def test_keeps_human_moderator(self):
        assert not _is_duplicate_sentinel_staff({"username": "ModPlayer", "role": "moderator"})
