"""Tests for Discord translation payload parsing and embed formatting."""
import pytest

from discord_translate import (
    build_source_version_embed,
    build_translation_embed,
    parse_discord_message,
    payload_source_hash,
)


SAMPLE_MESSAGE = {
    "content": "",
    "embeds": [{
        "title": "Chroniques du Nexus",
        "description": (
            "Flux automatique de l'activité majeure du royaume : "
            "connexions, inscriptions, déconnexions et renommages de héros.\n\n"
            "Chaque ligne reflète l'activité en direct sur NEXORIA."
        ),
        "footer": {"text": "NEXORIA — forge ta légende"},
        "color": 6366961,
    }],
}


def test_parse_discord_message_keeps_structure():
    payload = parse_discord_message(SAMPLE_MESSAGE)
    assert payload["content"] == ""
    assert len(payload["embeds"]) == 1
    emb = payload["embeds"][0]
    assert emb["title"] == "Chroniques du Nexus"
    assert "connexions, inscriptions" in emb["description"]
    assert emb["footer"] == "NEXORIA — forge ta légende"
    # Must NOT merge title into description
    assert emb["description"] != emb["title"]


def test_build_translation_embed_has_line_breaks():
    translated = {
        "content": "",
        "embeds": [{
            "title": "Chroniques du Nexus",
            "description": (
                "Flux automatique de l'activité majeure du royaume : "
                "connexions, inscriptions, déconnexions et renommages de héros.\n\n"
                "Chaque ligne reflète l'activité en direct sur NEXORIA."
            ),
            "fields": [],
            "footer": "",
        }],
    }
    embed = build_translation_embed(translated, "en", "fr")
    assert embed["title"] == "🇬🇧 Traduction anglaise"
    assert "**Chroniques du Nexus**" in embed["description"]
    assert "\n\n" in embed["description"]
    assert "connexions, inscriptions" in embed["description"]
    assert "Traduit depuis 🇫🇷 Français" in embed["footer"]["text"]
    # No glued words
    assert "NexusAutomatic" not in embed["description"]
    assert "ChroniclesAutomatic" not in embed["description"]


def test_build_source_version_embed_french():
    payload = parse_discord_message(SAMPLE_MESSAGE)
    embed = build_source_version_embed(payload, "fr")
    assert embed["title"] == "🇫🇷 Version française"
    assert "**Chroniques du Nexus**" in embed["description"]
    assert "\n\n" in embed["description"]
    assert embed["footer"]["text"] == "NEXORIA — forge ta légende"
    assert "NexusAutomatic" not in embed["description"]


def test_payload_source_hash_changes_when_text_changes():
    a = parse_discord_message(SAMPLE_MESSAGE)
    b = parse_discord_message(SAMPLE_MESSAGE)
    assert payload_source_hash(a) == payload_source_hash(b)
    b["embeds"][0]["description"] += " extra"
    assert payload_source_hash(a) != payload_source_hash(b)
