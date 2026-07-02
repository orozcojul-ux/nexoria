"""Tests user_preferences + Discord role sync."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from user_preferences import (
    build_preferences_patch,
    normalize_preferred_language,
    save_user_preferences,
)


def test_normalize_preferred_language_pt_br_alias():
    assert normalize_preferred_language("pt-BR") == "pt"
    assert normalize_preferred_language("en") == "en"
    assert normalize_preferred_language("xx") is None


def test_build_preferences_patch_country_clear():
    update, unset, meta = build_preferences_patch(country="", country_provided=True)
    assert "country_code" not in update
    assert "country_code" in unset
    assert meta["country_provided"] is True


@pytest.mark.anyio
async def test_save_user_preferences_not_linked():
    db = MagicMock()
    db.users.update_one = AsyncMock()
    db.users.find_one = AsyncMock(return_value={
        "user_id": "u1",
        "username": "Hero",
        "language": "en",
        "country_code": "fr",
    })

    with patch(
        "user_preferences.di.sync_discord_language_country_roles",
        AsyncMock(return_value={"discordSyncStatus": "not_linked"}),
    ) as sync_mock:
        result = await save_user_preferences(
            db,
            {"user_id": "u1", "username": "Hero", "language": "fr"},
            language="en",
        )

    assert result["language"] == "en"
    assert result["discordSyncStatus"] == "not_linked"
    sync_mock.assert_awaited_once()


@pytest.mark.anyio
async def test_sync_discord_language_country_roles_not_linked():
    from discord_international import sync_discord_language_country_roles

    db = MagicMock()
    result = await sync_discord_language_country_roles(
        db,
        {"user_id": "u1", "username": "Hero", "language": "fr"},
        old_language="en",
        old_country=None,
    )
    assert result["discordSyncStatus"] == "not_linked"
    assert result["discordId"] is None


@pytest.mark.anyio
async def test_sync_discord_language_country_roles_success(monkeypatch):
    from discord_international import sync_discord_language_country_roles

    monkeypatch.setenv("DISCORD_BOT_TOKEN", "token")
    monkeypatch.setenv("DISCORD_GUILD_ID", "guild")
    monkeypatch.setenv("DISCORD_SYNC_ENABLED", "1")
    monkeypatch.setenv("DISCORD_ROLE_LANG_EN_ID", "111")
    monkeypatch.setenv("DISCORD_ROLE_LANG_FR_ID", "222")
    monkeypatch.setenv("DISCORD_ROLE_COUNTRY_FR_ID", "501")

    db = MagicMock()
    db.users.update_one = AsyncMock()
    user = {
        "user_id": "u1",
        "username": "Hero",
        "discord_id": "999",
        "language": "en",
        "country_code": "fr",
    }

    member = {"roles": ["222", "501", "999999"]}

    with patch("discord_sync.is_sync_enabled", return_value=True), \
         patch("discord_sync.is_configured", return_value=True), \
         patch("discord_sync._fetch_member", AsyncMock(return_value=member)), \
         patch("discord_international._remove_single_role", AsyncMock(return_value={"ok": True})), \
         patch("discord_international._apply_single_role", AsyncMock(return_value={"ok": True})):
        result = await sync_discord_language_country_roles(
            db, user, old_language="fr", old_country="be",
        )

    assert result["discordSyncStatus"] == "success"
    assert result["newLanguage"] == "en"
    assert result["newCountry"] == "fr"


@pytest.mark.anyio
async def test_sync_missing_role_mapping(monkeypatch):
    from discord_international import sync_discord_language_country_roles

    monkeypatch.setenv("DISCORD_BOT_TOKEN", "token")
    monkeypatch.setenv("DISCORD_GUILD_ID", "guild")
    monkeypatch.setenv("DISCORD_SYNC_ENABLED", "1")
    monkeypatch.delenv("DISCORD_ROLE_LANG_EN_ID", raising=False)

    db = MagicMock()
    user = {
        "user_id": "u1",
        "username": "Hero",
        "discord_id": "999",
        "language": "en",
    }

    with patch("discord_sync.is_sync_enabled", return_value=True), \
         patch("discord_sync.is_configured", return_value=True), \
         patch("discord_sync._fetch_member", AsyncMock(return_value={"roles": []})), \
         patch("discord_international._remove_single_role", AsyncMock(return_value={"ok": True})), \
         patch("discord_international._apply_single_role", AsyncMock(return_value={"ok": False, "error": "missing_role_mapping"})):
        result = await sync_discord_language_country_roles(db, user)

    assert result["discordSyncStatus"] in ("missing_role_mapping", "error", "partial")
    assert result["missingRoleMappings"]
