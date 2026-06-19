"""Tests LibreTranslate client and i18n Discord."""
import asyncio

import discord_i18n
from libretranslate_client import protect_text, restore_text


def test_protect_restore_preserves_nexoria_and_urls():
    text = "Flux sur NEXORIA — voir https://nexoria.gg\n\n**Éclats**"
    protected, tokens = protect_text(text)
    assert "NEXORIA" not in protected
    assert "https://nexoria.gg" not in protected
    assert "Éclats" not in protected  # terme protégé → jeton
    restored = restore_text(protected, tokens)
    assert "NEXORIA" in restored
    assert "https://nexoria.gg" in restored
    assert "Éclats" in restored


def test_i18n_chroniques_nexus_english():
    payload = {
        "content": "",
        "embeds": [{
            "title": "🌌 Chroniques du Nexus",
            "description": (
                "Flux automatique de l'activité majeure du royaume : "
                "connexions, inscriptions, déconnexions et renommages de héros.\n\n"
                "Chaque ligne reflète l'activité en direct sur NEXORIA."
            ),
            "footer": "NEXORIA — forge ta légende",
            "fields": [],
        }],
    }
    result = discord_i18n.lookup_i18n(payload, "en", "fr")
    assert result is not None
    emb = result["embeds"][0]
    assert emb["title"] == "🌌 Nexus Chronicles"
    assert "Automatic feed" in emb["description"]
    assert "NEXORIA" in emb["description"]
    assert "\n\n" in emb["description"]
    assert emb["footer"] == "NEXORIA — forge your legend"
    assert "NexusAutomatic" not in emb["description"]


def test_i18n_unknown_title_returns_none():
    payload = {"content": "message dynamique **Joueur**", "embeds": []}
    assert discord_i18n.lookup_i18n(payload, "en", "fr") is None


def test_translate_payload_uses_i18n_without_network(monkeypatch):
    from discord_translate import translate_payload

    payload = {
        "content": "",
        "embeds": [{
            "title": "🌌 Chroniques du Nexus",
            "description": "Chaque ligne reflète l'activité en direct sur NEXORIA.",
            "footer": "NEXORIA — forge ta légende",
            "fields": [],
        }],
    }

    async def fail_libretranslate(*_a, **_k):
        raise AssertionError("LibreTranslate should not be called when i18n matches")

    monkeypatch.setattr("discord_translate.libretranslate_client.translate_payload", fail_libretranslate)

    translated, provider = asyncio.run(translate_payload(payload, "en", "fr", message_id=""))
    assert provider == "i18n"
    assert translated["embeds"][0]["title"] == "🌌 Nexus Chronicles"
