"""Tests discord_international — préférences langue membre."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from discord_international import (
    country_flag_iso,
    country_spec,
    get_user_preferred_language,
    get_user_preferred_language_from_profile,
    push_user_international_preferences,
    resolve_user_language,
    role_id_to_country,
    role_id_to_language,
    sync_country_from_member,
    t_bot,
    valid_country_code,
)


def test_preferred_language_from_roles(monkeypatch):
    monkeypatch.setenv("DISCORD_ROLE_LANG_EN_ID", "111")
    monkeypatch.setenv("DISCORD_ROLE_LANG_FR_ID", "222")
    member = {"roles": ["111", "999"]}
    assert get_user_preferred_language(member) == "en"
    assert role_id_to_language(["222"]) == "fr"


def test_preferred_language_fallback_fr():
    assert get_user_preferred_language(None) == "fr"
    assert get_user_preferred_language({"roles": []}) == "fr"


def test_profile_language():
    assert get_user_preferred_language_from_profile({"language": "de"}) == "de"
    assert get_user_preferred_language_from_profile({"language": "xx"}) == "fr"
    assert get_user_preferred_language_from_profile(None) == "fr"


def test_resolve_user_language_priority(monkeypatch):
    monkeypatch.setenv("DISCORD_ROLE_LANG_ES_ID", "333")
    member = {"roles": ["333"]}
    user = {"language": "en"}
    assert resolve_user_language(member=member, user=user) == "es"
    assert resolve_user_language(member={"roles": []}, user=user) == "en"


def test_t_bot_fallback():
    assert "unavailable" in t_bot("en", "translation_unavailable").lower()
    assert t_bot("xx", "translation_unavailable")  # falls back to fr key or fr text


def test_country_role_mapping(monkeypatch):
    monkeypatch.setenv("DISCORD_ROLE_COUNTRY_FR_ID", "501")
    monkeypatch.setenv("DISCORD_ROLE_COUNTRY_UK_ID", "502")
    assert role_id_to_country(["501", "999"]) == "fr"
    assert role_id_to_country(["502"]) == "uk"
    assert role_id_to_country([]) is None


def test_country_spec_and_flag_iso():
    assert country_spec("fr")["flag"] == "🇫🇷"
    assert valid_country_code("fr") is True
    assert valid_country_code("xx") is False
    assert country_flag_iso("uk") == "gb"
    assert country_flag_iso("other") is None
    assert country_flag_iso("jp") == "jp"


@pytest.mark.anyio
async def test_sync_country_from_member_respects_manual_source(monkeypatch):
    monkeypatch.setenv("DISCORD_ROLE_COUNTRY_FR_ID", "501")
    db = MagicMock()
    db.users.find_one = AsyncMock(return_value={
        "country_code": "be",
        "country_source": "manual",
    })
    result = await sync_country_from_member(db, "u1", {"roles": ["501"]})
    assert result["updated"] is False
    assert result["reason"] == "manual_country"


@pytest.mark.anyio
async def test_push_user_international_preferences(monkeypatch):
    monkeypatch.setenv("DISCORD_BOT_TOKEN", "token")
    monkeypatch.setenv("DISCORD_GUILD_ID", "guild")
    monkeypatch.setenv("DISCORD_ROLE_LANG_EN_ID", "111")
    monkeypatch.setenv("DISCORD_ROLE_COUNTRY_BE_ID", "501")

    db = MagicMock()
    db.users.find_one = AsyncMock(return_value={
        "user_id": "u1",
        "username": "Hero",
        "discord_id": "123",
        "language": "en",
        "country_code": "be",
        "country_source": "manual",
    })

    with patch(
        "discord_international.sync_discord_language_country_roles",
        AsyncMock(return_value={"discordSyncStatus": "success", "rolesAdded": ["501:country:be"]}),
    ) as sync_mock:
        from discord_international import push_user_international_preferences
        result = await push_user_international_preferences(db, "u1")

    assert result["discordSyncStatus"] == "success"
    sync_mock.assert_awaited_once()
