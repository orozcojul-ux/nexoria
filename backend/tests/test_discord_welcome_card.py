"""Tests discord welcome card generation."""
import sys
from pathlib import Path

import pytest
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from discord_welcome import build_welcome_content, build_welcome_embed, avatar_url
from discord_welcome_card import (
    CARD_HEIGHT,
    CARD_WIDTH,
    display_name,
    render_welcome_card,
)


def test_display_name_prefers_global_name():
    user = {"id": "1", "username": "smouz", "global_name": "SmouzYi"}
    assert display_name(user) == "SmouzYi"


def test_render_welcome_card_size():
    user = {"id": "123456789012345678", "username": "SmouzYi", "global_name": "SmouzYi"}
    avatar = Image.new("RGBA", (256, 256), (80, 40, 120, 255))
    card = render_welcome_card(user, avatar)
    assert card.size == (CARD_WIDTH, CARD_HEIGHT)
    assert card.mode == "RGB"


def test_build_welcome_content_mentions_channels():
    user = {"id": "123456789012345678"}
    text = build_welcome_content(user)
    assert "<@123456789012345678>" in text
    assert "1514271114405216359" in text
    assert "NEXORIA" in text


def test_build_welcome_embed_still_valid():
    user = {"id": "123456789012345678", "avatar": "abc123"}
    embed = build_welcome_embed(user)
    assert "Bienvenue dans NEXORIA" in embed["title"]
    assert embed["thumbnail"]["url"].startswith("https://cdn.discordapp.com/")


def test_avatar_url_uses_512_for_card():
    user = {"id": "123456789012345678", "avatar": "abc123"}
    assert "size=512" in avatar_url(user)
