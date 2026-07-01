"""Tests Naria — multilingue, confiance, contexte."""
import pytest

from moderation_rules import analyze_content
from naria_language import detect_content_language, normalize_lang, resolve_user_language
from naria_messages import get_message
import naria_moderation as naria


class TestLanguageDetection:
    def test_detect_french(self):
        assert detect_content_language("Bonjour le forum comment allez-vous") == "fr"

    def test_detect_english(self):
        assert detect_content_language("Hello everyone how are you today") == "en"

    def test_detect_japanese(self):
        assert detect_content_language("こんにちは、元気ですか") == "ja"

    def test_resolve_user_language_from_account(self):
        assert resolve_user_language({"language": "en"}) == "en"

    def test_pt_br_normalized(self):
        assert normalize_lang("pt-BR") == "pt"


class TestMultilingualMessages:
    def test_warning_french_naria(self):
        msg = get_message("naria.warning.respect", "fr", actor="Naria")
        assert "Naria" in msg
        assert "Sentinelle du Nexus" in msg

    def test_warning_french_shumi(self):
        msg = get_message("naria.warning.respect", "fr", actor="Shumi")
        assert "Shumi" in msg

    def test_warning_english(self):
        msg = get_message("naria.warning.respect", "en", actor="Naria")
        assert "Sentinel of the Nexus" in msg

    def test_warning_spanish(self):
        msg = get_message("naria.warning.respect", "es")
        assert "Centinela" in msg

    def test_warning_japanese(self):
        msg = get_message("naria.warning.respect", "ja")
        assert "ネクサス" in msg


class TestModerationRules:
    def test_normal_message_clean(self):
        r = analyze_content("Bonjour à tous, comment allez-vous aujourd'hui ?", user_language="fr")
        assert r.total_score == 0
        assert r.allowed is True

    def test_insult_french(self):
        r = analyze_content("espèce de connard", user_language="fr")
        assert r.total_score >= 2
        assert r.confidence >= 0.7

    def test_insult_english(self):
        r = analyze_content("you fucking asshole", user_language="en")
        assert r.total_score >= 2

    def test_suspicious_shortener(self):
        r = analyze_content("regardez https://bit.ly/abc123", user_language="fr")
        assert any(h.rule == "suspicious_link" for h in r.hits)


class TestNariaIntelligence:
    def test_veteran_lenient_multiplier(self):
        mult = naria._context_score_multiplier(
            {"level": 25, "created_at": "2020-01-01T00:00:00+00:00"},
            {"warnings_count": 0},
        )
        assert mult < 1.0

    def test_auto_ban_disabled(self):
        assert naria.AUTO_BAN_ENABLED is False

    def test_decay_score(self):
        from datetime import datetime, timezone, timedelta
        old = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
        assert naria.decay_score(8, old) < 8
