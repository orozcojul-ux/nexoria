"""Tests Discord account link OAuth state."""
from datetime import timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

import discord_link_flow


@pytest.mark.anyio
async def test_create_and_consume_discord_oauth_state():
    db = MagicMock()
    db.discord_oauth_states.insert_one = AsyncMock()
    db.discord_oauth_states.find_one_and_delete = AsyncMock(return_value={
        "user_id": "usr_1",
        "expires_at": (discord_link_flow.now_utc() + timedelta(minutes=10)).isoformat(),
    })

    state = await discord_link_flow.create_discord_oauth_state(db, "usr_1", purpose="link")
    assert len(state) > 20
    db.discord_oauth_states.insert_one.assert_awaited_once()

    user_id = await discord_link_flow.consume_discord_oauth_state(db, state, purpose="link")
    assert user_id == "usr_1"


@pytest.mark.anyio
async def test_consume_expired_discord_oauth_state():
    db = MagicMock()
    db.discord_oauth_states.find_one_and_delete = AsyncMock(return_value={
        "user_id": "usr_1",
        "expires_at": (discord_link_flow.now_utc() - timedelta(minutes=1)).isoformat(),
    })
    user_id = await discord_link_flow.consume_discord_oauth_state(db, "expired", purpose="link")
    assert user_id is None


def test_build_authorize_url_with_state(monkeypatch):
    monkeypatch.setenv("DISCORD_CLIENT_ID", "client")
    monkeypatch.setenv("DISCORD_CLIENT_SECRET", "secret")
    monkeypatch.setenv("DISCORD_REDIRECT_URI", "https://nexoria.example/auth/discord/callback")

    import discord_auth

    url = discord_auth.build_authorize_url(state="abc123")
    assert "state=abc123" in url
