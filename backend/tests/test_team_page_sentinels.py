"""Tests page équipe — Sentinelles et modérateur en test."""
from unittest.mock import AsyncMock, MagicMock

import pytest

from team_page import build_team_members, merge_team_member, normalize_member_profile


@pytest.mark.anyio
async def test_build_team_includes_official_sentinels():
    naria = {
        "user_id": "usr_naria",
        "username": "Naria",
        "system_key": "naria",
        "role": "sentinelle",
        "is_system": True,
        "show_in_community_team": True,
        "level": 99,
        "class_name": "Sentinelle",
    }
    shumi = {
        "user_id": "usr_shumi",
        "username": "Shumi",
        "system_key": "shumi",
        "role": "sentinelle",
        "is_system": True,
        "show_in_community_team": True,
        "level": 99,
        "class_name": "Sentinelle",
    }
    mod = {
        "user_id": "usr_mod",
        "username": "ModHero",
        "role": "moderator",
        "level": 20,
        "class_id": "paladin",
        "class_name": "Paladin",
    }

    db = MagicMock()
    db.users.find = MagicMock(return_value=MagicMock(
        to_list=AsyncMock(return_value=[mod]),
    ))
    db.team_page_profiles.find = MagicMock(return_value=MagicMock(
        to_list=AsyncMock(return_value=[
            {"user_id": "usr_mod", "moderator_trial": True, "visible": True, "sort_order": 50},
        ]),
    ))

    import naria_system as ns

    async def fake_find(db_, key):
        return {"naria": naria, "shumi": shumi}.get(key)

    original = ns.find_system_sentinel
    ns.find_system_sentinel = fake_find
    try:
        rows = await build_team_members(db, "Owner")
    finally:
        ns.find_system_sentinel = original

    ids = {r["user_id"] for r in rows}
    assert "usr_naria" in ids
    assert "usr_shumi" in ids
    assert "usr_mod" in ids

    mod_row = next(r for r in rows if r["user_id"] == "usr_mod")
    assert mod_row["team_moderator_trial"] is True


def test_merge_sentinelle_trial_on_official_sentinel():
    from naria_system import merge_official_sentinel_team_row

    shumi = {
        "user_id": "usr_shumi",
        "username": "Shumi",
        "system_key": "shumi",
        "role": "sentinelle",
        "bio": "Bio",
        "location": "Le Nexus",
        "country_code": "us",
    }
    profile = normalize_member_profile({"user_id": "usr_shumi", "sentinelle_trial": True, "visible": True})
    row = merge_official_sentinel_team_row(shumi, profile, "Owner")
    assert row["team_sentinelle_trial"] is True
    assert row["team_country_code"] == "us"
    assert row["team_nationality"] == "USA"


def test_official_sentinels_default_country_flags():
    from naria_system import merge_official_sentinel_team_row

    naria = {
        "user_id": "usr_naria",
        "username": "Naria",
        "system_key": "naria",
        "role": "sentinelle",
        "location": "Le Nexus",
        "country_code": "fr",
    }
    shumi = {
        "user_id": "usr_shumi",
        "username": "Shumi",
        "system_key": "shumi",
        "role": "sentinelle",
        "location": "Le Nexus",
        "country_code": "us",
    }

    naria_row = merge_official_sentinel_team_row(naria, None, "Owner")
    shumi_row = merge_official_sentinel_team_row(shumi, None, "Owner")

    assert naria_row["team_country_code"] == "fr"
    assert naria_row["team_nationality"] == "France"
    assert shumi_row["team_country_code"] == "us"
    assert shumi_row["team_nationality"] == "USA"


def test_merge_team_member_exposes_moderator_trial():
    user = {"user_id": "u1", "username": "TrialMod", "role": "moderator", "level": 5}
    profile = normalize_member_profile({"user_id": "u1", "moderator_trial": True, "visible": True})
    row = merge_team_member(user, profile, "Owner")
    assert row["team_moderator_trial"] is True


def test_merge_team_member_uses_settings_country_for_staff():
    user = {
        "user_id": "u2",
        "username": "BelgianMod",
        "role": "moderator",
        "level": 12,
        "country_code": "be",
        "location": "Le Nexus",
    }
    row = merge_team_member(user, None, "Owner")
    assert row["team_country_code"] == "be"
    assert row["team_nationality"] == "Belgique"
