"""Tests for team page class display on moderator cards."""
from team_page import merge_team_member, team_card_class_fields


def test_sentinel_gets_game_class_not_sentinelle_label():
    naria = {
        "user_id": "usr_naria",
        "username": "Naria",
        "system_key": "naria",
        "role": "sentinelle",
        "is_system": True,
        "class_id": "explorer",
        "class_name": "Sentinelle",
        "level": 99,
    }
    fields = team_card_class_fields(naria)
    assert fields["class_id"] == "chronomancer"
    assert fields["class_name"] == "Chronomancien"


def test_moderator_without_class_gets_stable_random():
    mod = {"user_id": "usr_mod1", "username": "ModHero", "role": "moderator", "level": 42}
    a = team_card_class_fields(mod)
    b = team_card_class_fields(mod)
    assert a == b
    assert a["class_id"] in (
        "mage", "warrior", "assassin", "paladin", "alchemist",
        "explorer", "necromancer", "architect", "chronomancer", "inventor",
    )


def test_moderator_with_real_class_keeps_it():
    mod = {
        "user_id": "usr_mod2",
        "username": "PaladinMod",
        "role": "moderator",
        "class_id": "paladin",
        "class_name": "Paladin",
        "level": 10,
    }
    fields = team_card_class_fields(mod)
    assert fields["class_id"] == "paladin"
    assert fields["class_name"] == "Paladin"


def test_merge_team_member_applies_class_for_sentinel():
    shumi = {
        "user_id": "usr_shumi",
        "username": "Shumi",
        "system_key": "shumi",
        "role": "sentinelle",
        "is_system": True,
        "is_moderation_actor": True,
        "show_in_community_team": True,
        "class_name": "Sentinelle",
        "level": 99,
    }
    row = merge_team_member(shumi, None, "Owner")
    assert row["class_name"] == "Assassin"
    assert row["class_id"] == "assassin"
