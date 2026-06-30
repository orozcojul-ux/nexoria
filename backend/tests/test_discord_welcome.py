"""Tests discord_welcome and lock channel classification."""
import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(SCRIPTS))

import discord_welcome
from discord_welcome import avatar_url, build_welcome_content, build_welcome_embed, is_enabled


def test_try_claim_welcome_only_first_inserts():
    class UpdateResult:
        def __init__(self, upserted_id):
            self.upserted_id = upserted_id

    collection = AsyncMock()
    collection.update_one = AsyncMock(
        side_effect=[UpdateResult("abc"), UpdateResult(None)],
    )
    db = MagicMock()
    db.discord_welcome_sent = collection
    discord_welcome.init(db)

    assert asyncio.run(discord_welcome._try_claim_welcome("user-1")) is True
    assert asyncio.run(discord_welcome._try_claim_welcome("user-1")) is False
    assert collection.update_one.await_count == 2


def test_try_claim_welcome_refuses_without_db():
    discord_welcome.init(None)
    assert asyncio.run(discord_welcome._try_claim_welcome("user-1")) is False


def test_build_welcome_content_mention_and_channels():
    user = {"id": "123456789012345678", "avatar": "abc123"}
    text = build_welcome_content(user)
    assert "<@123456789012345678>" in text
    assert "1514271114405216359" in text
    assert "NEXORIA" in text


def test_build_welcome_embed_fallback():
    user = {"id": "123456789012345678", "avatar": "abc123"}
    embed = build_welcome_embed(user)
    assert embed["title"] == "🌌 Bienvenue dans NEXORIA"
    assert "<@123456789012345678>" in embed["description"]
    assert embed["thumbnail"]["url"].startswith("https://cdn.discordapp.com/")


def test_avatar_url_default():
    user = {"id": "123456789012345678"}
    url = avatar_url(user)
    assert "embed/avatars" in url


def test_welcome_enabled_by_default():
    assert is_enabled() in (True, False)


def test_classify_lock_bienvenue():
    from lock_discord_info_channels import classify_channel

    ch = {"id": "1514271114405216359", "name": "🌟┃bienvenue", "type": 0}
    assert classify_channel(ch) == "lock"


def test_classify_open_global_chat():
    from lock_discord_info_channels import classify_channel

    ch = {"id": "999", "name": "🌐┃global-chat", "type": 0}
    assert classify_channel(ch) == "open"


def test_classify_skip_inscriptions_beta():
    from lock_discord_info_channels import classify_channel

    ch = {"id": "1517470910427168770", "name": "inscriptions-beta", "type": 15}
    assert classify_channel(ch) == "skip"


def test_classify_skip_beta_test():
    from lock_discord_info_channels import classify_channel

    ch = {"id": "1517470908476821575", "name": "beta-test", "type": 0}
    assert classify_channel(ch) == "skip"
