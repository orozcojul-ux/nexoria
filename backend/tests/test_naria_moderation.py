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
        action = naria.decide_action(
            r.total_score, r, user={"user_id": "u1", "level": 5}, score_doc={"score": 0, "warnings_count": 0},
            content_type="news_comment",
        )
        assert action.hide is True
        assert action.warn is True

    def test_news_slur_blocked(self):
        r = analyze_content("ferme ta gueule pd", user_language="fr")
        assert r.total_score >= 2
        user = {"user_id": "u1", "username": "TEST", "level": 5, "created_at": "2025-01-01T00:00:00+00:00"}
        action = naria.decide_action(
            r.total_score, r, user=user, score_doc={"score": 0, "warnings_count": 0},
            content_type="news_comment",
        )
        assert action.block is True
        assert action.hide is True

    def test_aggressive_phrase_harassment(self):
        r = analyze_content("ferme ta gueule", user_language="fr")
        assert any(h.rule == "hate_threat" for h in r.hits)

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

    def test_auto_ban_enabled_by_default(self):
        assert naria.AUTO_BAN_ENABLED is True

    def test_high_score_triggers_immediate_ban(self):
        r = analyze_content("espèce de connard fils de pute", user_language="fr")
        user = {"user_id": "u1", "username": "Toxic", "level": 3, "created_at": "2026-01-01T00:00:00+00:00"}
        action = naria.decide_action(
            12, r, user=user, score_doc={"score": 10, "warnings_count": 2},
            content_type="nexus_room_chat",
        )
        assert action.auto_ban is True
        assert action.action == "ban"
        assert action.status in ("applied", "blocked")

    def test_staff_exempt_from_moderation(self):
        assert naria.is_moderation_exempt({"role": "admin", "username": "Sage"})
        assert naria.is_moderation_exempt({"system_key": "naria", "is_system": True})
        assert not naria.is_moderation_exempt({"username": "Hero", "role": "user"})

    def test_decay_score(self):
        from datetime import datetime, timezone, timedelta
        old = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
        assert naria.decay_score(8, old) < 8
