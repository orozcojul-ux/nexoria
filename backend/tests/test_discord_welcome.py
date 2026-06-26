"""Tests for Discord welcome embeds and channel lock classification."""
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

import discord_welcome
from lock_discord_info_channels import (
    build_lock_overwrites,
    should_lock_channel,
)


SAMPLE_MEMBER = {
    "user": {
        "id": "123456789012345678",
        "username": "TestHero",
        "discriminator": "0",
        "avatar": "a_abc123",
        "bot": False,
    },
    "guild_id": "999",
}


def test_build_welcome_embed_has_title_and_mention():
    embed = discord_welcome.build_welcome_embed(SAMPLE_MEMBER)
    assert embed["title"] == "🌌 Bienvenue dans NEXORIA"
    assert "<@123456789012345678>" in embed["description"]
    assert "Welcome" in embed["description"]
    assert embed["color"] == 0x7C3AED
    assert embed["thumbnail"]["url"].startswith("https://cdn.discordapp.com/")


def test_build_welcome_embed_default_avatar():
    member = {"user": {"id": "999999999999999999", "username": "NoAvatar", "bot": False}}
    embed = discord_welcome.build_welcome_embed(member)
    assert "embed/avatars" in embed["thumbnail"]["url"]


def test_welcome_channel_id_default():
    assert discord_welcome.welcome_channel_id() == "1514271114405216359"


def test_should_lock_bienvenue():
    ch = {"id": "1514271114405216359", "name": "bienvenue", "type": 0}
    lock, reason = should_lock_channel(ch)
    assert lock is True
    assert reason == "explicit_id"


def test_should_not_lock_global_chat():
    ch = {"id": "999000001", "name": "global-chat", "type": 0}
    lock, reason = should_lock_channel(ch)
    assert lock is False
    assert reason == "open_name"


def test_should_not_lock_inscriptions_beta():
    ch = {"id": "1517470910427168770", "name": "inscriptions-beta", "type": 0}
    lock, reason = should_lock_channel(ch)
    assert lock is False
    assert reason == "never_modify"


def test_should_not_lock_language_channel():
    ch = {"id": "999000002", "name": "english", "type": 0}
    lock, reason = should_lock_channel(ch)
    assert lock is False


def test_build_lock_overwrites_denies_send_for_everyone():
    guild_id = "111"
    ow = build_lock_overwrites([], guild_id, bot_user_id="222")
    everyone = next(o for o in ow if o["id"] == guild_id)
    deny = int(everyone["deny"])
    allow = int(everyone["allow"])
    assert deny & 2048  # SEND_MESSAGES denied
    assert allow & 1024  # VIEW allowed
    assert allow & 65536  # READ_HISTORY allowed
