import discord_sync
from game_data import CLASSES, normalize_class_id, resolve_class_id, class_repair_patch


def test_normalize_class_id_french_aliases():
    assert normalize_class_id("alchimiste") == "alchemist"
    assert normalize_class_id("inventeur") == "inventor"
    assert normalize_class_id("guerrier") == "warrior"
    assert normalize_class_id("alchemist") == "alchemist"


def test_normalize_class_id_invalid():
    assert normalize_class_id("invalid") is None
    assert normalize_class_id("") is None
    assert normalize_class_id(None) is None


def test_class_role_ids_use_canonical_keys():
    assert discord_sync.CLASS_ROLE_IDS["alchemist"]
    assert discord_sync.CLASS_ROLE_IDS["inventor"]
    assert discord_sync.CLASS_ROLE_IDS["alchemist"] != discord_sync.CLASS_ROLE_IDS["inventor"]


def test_french_alias_resolves_to_discord_role(monkeypatch):
    monkeypatch.setenv("DISCORD_BOT_TOKEN", "x")
    monkeypatch.setenv("DISCORD_GUILD_ID", "123")
    monkeypatch.setenv("DISCORD_SYNC_ENABLED", "1")
    class_id = normalize_class_id("alchimiste")
    assert discord_sync.CLASS_ROLE_IDS[class_id] == "1515273100902793217"


def test_sync_disabled_on_local_stack(monkeypatch):
    monkeypatch.setenv("DISCORD_BOT_TOKEN", "x")
    monkeypatch.setenv("DISCORD_GUILD_ID", "123")
    monkeypatch.delenv("DISCORD_SYNC_ENABLED", raising=False)
    monkeypatch.setenv("MONGO_URL", "mongodb://localhost:27017")
    monkeypatch.setenv("FRONTEND_URL", "http://localhost:3000")
    assert discord_sync.is_sync_enabled() is False


def test_sync_enabled_on_production_like_stack(monkeypatch):
    monkeypatch.setenv("DISCORD_BOT_TOKEN", "x")
    monkeypatch.setenv("DISCORD_GUILD_ID", "123")
    monkeypatch.delenv("DISCORD_SYNC_ENABLED", raising=False)
    monkeypatch.setenv("MONGO_URL", "mongodb://mongo.internal:27017")
    monkeypatch.setenv("FRONTEND_URL", "https://nexoria-game.fr")
    assert discord_sync.is_sync_enabled() is True


def test_resolve_class_id_from_french_alias():
    assert resolve_class_id({"class_id": "alchimiste"}) == "alchemist"


def test_resolve_class_id_from_class_name():
    assert resolve_class_id({"class_id": "invalid", "class_name": "Alchimiste"}) == "alchemist"


def test_class_repair_patch_fixes_stale_french_id():
    patch = class_repair_patch({"class_id": "alchimiste", "class_name": "Alchimiste"})
    assert patch == {"class_id": "alchemist"}


def test_class_repair_patch_fixes_mismatched_name():
    patch = class_repair_patch({"class_id": "alchemist", "class_name": "Inventeur"})
    assert patch == {"class_name": "Alchimiste"}
