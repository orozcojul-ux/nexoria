"""Tests discord_international — préférences langue membre."""
from discord_international import (
    country_flag_iso,
    country_spec,
    get_user_preferred_language,
    get_user_preferred_language_from_profile,
    resolve_user_language,
    role_id_to_country,
    role_id_to_language,
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
