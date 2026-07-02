"""Discord international — rôles langue/pays, salons par langue, préférences membre.

Les IDs de rôles et salons sont lus depuis les variables d'environnement (jamais hardcodés
en production). Voir docs/discord-international.md et backend/.env.example.
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any

import discord_sync

logger = logging.getLogger("nexoria.discord_international")

_db = None

# ─── Langues (alignées site + discord_translate) ───
LANGUAGE_SPECS: list[dict[str, str]] = [
    {"code": "fr", "name": "Langue — Français", "flag": "🇫🇷", "role_env": "DISCORD_ROLE_LANG_FR_ID", "channel_env": "DISCORD_CHANNEL_FR_ID", "channel_name": "🇫🇷┃français"},
    {"code": "en", "name": "Langue — English", "flag": "🇬🇧", "role_env": "DISCORD_ROLE_LANG_EN_ID", "channel_env": "DISCORD_CHANNEL_EN_ID", "channel_name": "🇬🇧┃english"},
    {"code": "es", "name": "Langue — Español", "flag": "🇪🇸", "role_env": "DISCORD_ROLE_LANG_ES_ID", "channel_env": "DISCORD_CHANNEL_ES_ID", "channel_name": "🇪🇸┃español"},
    {"code": "de", "name": "Langue — Deutsch", "flag": "🇩🇪", "role_env": "DISCORD_ROLE_LANG_DE_ID", "channel_env": "DISCORD_CHANNEL_DE_ID", "channel_name": "🇩🇪┃deutsch"},
    {"code": "it", "name": "Langue — Italiano", "flag": "🇮🇹", "role_env": "DISCORD_ROLE_LANG_IT_ID", "channel_env": "DISCORD_CHANNEL_IT_ID", "channel_name": "🇮🇹┃italiano"},
    {"code": "pt", "name": "Langue — Português BR", "flag": "🇧🇷", "role_env": "DISCORD_ROLE_LANG_PT_BR_ID", "channel_env": "DISCORD_CHANNEL_PT_BR_ID", "channel_name": "🇧🇷┃português-br"},
    {"code": "nl", "name": "Langue — Nederlands", "flag": "🇳🇱", "role_env": "DISCORD_ROLE_LANG_NL_ID", "channel_env": "DISCORD_CHANNEL_NL_ID", "channel_name": "🇳🇱┃nederlands"},
    {"code": "ja", "name": "Langue — 日本語", "flag": "🇯🇵", "role_env": "DISCORD_ROLE_LANG_JA_ID", "channel_env": "DISCORD_CHANNEL_JA_ID", "channel_name": "🇯🇵┃日本語"},
]

# ─── Pays / régions (visibles sur le profil Discord) ───
COUNTRY_SPECS: list[dict[str, str]] = [
    {"code": "fr", "name": "Pays — France", "flag": "🇫🇷", "role_env": "DISCORD_ROLE_COUNTRY_FR_ID"},
    {"code": "be", "name": "Pays — Belgique", "flag": "🇧🇪", "role_env": "DISCORD_ROLE_COUNTRY_BE_ID"},
    {"code": "ch", "name": "Pays — Suisse", "flag": "🇨🇭", "role_env": "DISCORD_ROLE_COUNTRY_CH_ID"},
    {"code": "ca", "name": "Pays — Canada", "flag": "🇨🇦", "role_env": "DISCORD_ROLE_COUNTRY_CA_ID"},
    {"code": "us", "name": "Pays — USA", "flag": "🇺🇸", "role_env": "DISCORD_ROLE_COUNTRY_US_ID"},
    {"code": "uk", "name": "Pays — UK", "flag": "🇬🇧", "role_env": "DISCORD_ROLE_COUNTRY_UK_ID"},
    {"code": "es", "name": "Pays — Espagne", "flag": "🇪🇸", "role_env": "DISCORD_ROLE_COUNTRY_ES_ID"},
    {"code": "de", "name": "Pays — Allemagne", "flag": "🇩🇪", "role_env": "DISCORD_ROLE_COUNTRY_DE_ID"},
    {"code": "it", "name": "Pays — Italie", "flag": "🇮🇹", "role_env": "DISCORD_ROLE_COUNTRY_IT_ID"},
    {"code": "br", "name": "Pays — Brésil", "flag": "🇧🇷", "role_env": "DISCORD_ROLE_COUNTRY_BR_ID"},
    {"code": "nl", "name": "Pays — Pays-Bas", "flag": "🇳🇱", "role_env": "DISCORD_ROLE_COUNTRY_NL_ID"},
    {"code": "jp", "name": "Pays — Japon", "flag": "🇯🇵", "role_env": "DISCORD_ROLE_COUNTRY_JP_ID"},
    {"code": "other", "name": "Pays — Autre", "flag": "🌍", "role_env": "DISCORD_ROLE_COUNTRY_OTHER_ID"},
]

INTERNATIONAL_CATEGORY_NAME = "🌍 International"
GLOBAL_CHAT_NAME = "🌐┃global-chat"
GLOBAL_CHAT_ENV = "DISCORD_CHANNEL_GLOBAL_CHAT_ID"

# Salons communs (env optionnels — fallback noms connus du serveur)
COMMON_CHANNEL_SPECS: list[dict[str, str]] = [
    {"key": "welcome", "env": "DISCORD_WELCOME_CHANNEL_ID", "match_name": "bienvenue", "public": True},
    {"key": "rules", "env": "DISCORD_RULES_CHANNEL_ID", "match_name": "règlement", "public": True},
    {"key": "announcements", "env": "DISCORD_ANNOUNCE_CHANNEL_ID", "match_name": "annonces", "public": True},
    {"key": "beta_signup", "env": "DISCORD_BETA_SIGNUP_CHANNEL_ID", "match_name": "inscriptions-beta", "public": True},
    {"key": "beta_test", "env": "DISCORD_BETA_TEST_CHANNEL_ID", "match_name": "beta-test", "public": False},
]

DEFAULT_LANG = "fr"

_background_tasks: set[asyncio.Task] = set()


def _env(key: str) -> str:
    return os.environ.get(key, "").strip()


def language_spec(code: str) -> dict[str, str] | None:
    for spec in LANGUAGE_SPECS:
        if spec["code"] == code:
            return spec
    return None


def language_role_id(code: str) -> str:
    spec = language_spec(code)
    return _env(spec["role_env"]) if spec else ""


def language_channel_id(code: str) -> str:
    spec = language_spec(code)
    return _env(spec["channel_env"]) if spec else ""


def all_language_role_ids() -> set[str]:
    return {rid for spec in LANGUAGE_SPECS if (rid := _env(spec["role_env"]))}


def all_country_role_ids() -> set[str]:
    return {rid for spec in COUNTRY_SPECS if (rid := _env(spec["role_env"]))}


def init(db) -> None:
    """Store DB handle for gateway-driven member updates."""
    global _db
    _db = db


def country_spec(code: str) -> dict[str, str] | None:
    for spec in COUNTRY_SPECS:
        if spec["code"] == code:
            return spec
    return None


def valid_country_code(code: str | None) -> bool:
    return bool(code and country_spec(code))


def country_role_id(code: str) -> str:
    spec = country_spec(code)
    return _env(spec["role_env"]) if spec else ""


def country_flag_iso(code: str) -> str | None:
    """ISO 3166-1 alpha-2 for flag images (uk → gb, other → None)."""
    if code == "uk":
        return "gb"
    if code == "other":
        return None
    return code if country_spec(code) else None


def role_id_to_language(role_ids: set[str] | list[str]) -> str | None:
    """Map member role IDs → lang code (first match)."""
    ids = set(role_ids or [])
    for spec in LANGUAGE_SPECS:
        rid = _env(spec["role_env"])
        if rid and rid in ids:
            return spec["code"]
    return None


def role_id_to_country(role_ids: set[str] | list[str]) -> str | None:
    """Map member role IDs → country code (first match)."""
    ids = set(role_ids or [])
    for spec in COUNTRY_SPECS:
        rid = _env(spec["role_env"])
        if rid and rid in ids:
            return spec["code"]
    return None


def get_user_preferred_language(member: dict | None) -> str:
    """Langue préférée depuis les rôles Discord du membre. Fallback fr."""
    if not member:
        return DEFAULT_LANG
    roles = member.get("roles") or []
    return role_id_to_language(roles) or DEFAULT_LANG


def get_user_preferred_language_from_profile(user: dict | None) -> str:
    """Langue site (profil NEXORIA) — fallback fr."""
    if not user:
        return DEFAULT_LANG
    lang = (user.get("language") or "").strip().lower()
    if lang in {s["code"] for s in LANGUAGE_SPECS}:
        return lang
    return DEFAULT_LANG


def resolve_user_language(*, member: dict | None = None, user: dict | None = None) -> str:
    """Priorité : rôle Discord langue > profil site > fr."""
    from_roles = role_id_to_language((member or {}).get("roles") or [])
    if from_roles:
        return from_roles
    return get_user_preferred_language_from_profile(user)


# ─── Messages bot (réponses courtes, pas d'appel IA) ───
BOT_MESSAGES: dict[str, dict[str, str]] = {
    "translation_unavailable": {
        "fr": "Traduction indisponible pour le moment.",
        "en": "Translation unavailable at the moment.",
        "es": "Traducción no disponible por el momento.",
        "de": "Übersetzung derzeit nicht verfügbar.",
        "it": "Traduzione non disponibile al momento.",
        "pt": "Tradução indisponível no momento.",
        "nl": "Vertaling momenteel niet beschikbaar.",
        "ja": "現在、翻訳を利用できません。",
    },
    "unknown_action": {
        "fr": "Action inconnue.",
        "en": "Unknown action.",
        "es": "Acción desconocida.",
        "de": "Unbekannte Aktion.",
        "it": "Azione sconosciuta.",
        "pt": "Ação desconhecida.",
        "nl": "Onbekende actie.",
        "ja": "不明な操作です。",
    },
    "welcome_register": {
        "fr": "✨ **{username}** vient de rejoindre NEXORIA{via} — bienvenue sur le Discord !",
        "en": "✨ **{username}** just joined NEXORIA{via} — welcome to Discord!",
        "es": "✨ **{username}** acaba de unirse a NEXORIA{via} — ¡bienvenido/a al Discord!",
        "de": "✨ **{username}** ist NEXORIA beigetreten{via} — willkommen auf Discord!",
        "it": "✨ **{username}** si è unito/a a NEXORIA{via} — benvenuto/a su Discord!",
        "pt": "✨ **{username}** entrou no NEXORIA{via} — bem-vindo/a ao Discord!",
        "nl": "✨ **{username}** is NEXORIA binnengekomen{via} — welkom op Discord!",
        "ja": "✨ **{username}** が NEXORIA に参加しました{via} — Discord へようこそ！",
    },
    "welcome_login": {
        "fr": "✨ **{username}** s'est connecté{via}, bienvenue sur Nexoria !",
        "en": "✨ **{username}** logged in{via} — welcome back to NEXORIA!",
        "es": "✨ **{username}** se ha conectado{via} — ¡bienvenido/a de nuevo!",
        "de": "✨ **{username}** hat sich angemeldet{via} — willkommen zurück!",
        "it": "✨ **{username}** si è connecto/a{via} — bentornato/a!",
        "pt": "✨ **{username}** entrou{via} — bem-vindo/a de volta!",
        "nl": "✨ **{username}** is ingelogd{via} — welkom terug!",
        "ja": "✨ **{username}** がログインしました{via} — おかえりなさい！",
    },
    "beta_redeemed": {
        "fr": "🔑 **{name}** a activé sa clé BETA TESTEUR — bienvenue parmi les pionniers !",
        "en": "🔑 **{name}** activated their BETA TESTER key — welcome among the pioneers!",
        "es": "🔑 **{name}** activó su clave BETA TESTER — ¡bienvenido/a entre los pioneros!",
        "de": "🔑 **{name}** hat den BETA-TESTER-Schlüssel aktiviert — willkommen unter den Pionieren!",
        "it": "🔑 **{name}** ha attivato la chiave BETA TESTER — benvenuto/a tra i pionieri!",
        "pt": "🔑 **{name}** ativou a chave BETA TESTER — bem-vindo/a entre os pioneiros!",
        "nl": "🔑 **{name}** heeft de BETA TESTER-sleutel geactiveerd — welkom onder de pioniers!",
        "ja": "🔑 **{name}** がベータテスターキーを有効化しました — 開拓者の仲間入りです！",
    },
    "message_too_long": {
        "fr": "Message trop long à traduire en une seule fois.",
        "en": "Message too long to translate at once.",
        "es": "Mensaje demasiado largo para traducir de una vez.",
        "de": "Nachricht zu lang für eine einzelne Übersetzung.",
        "it": "Messaggio troppo lungo da tradurre in una volta.",
        "pt": "Mensagem longa demais para traduzir de uma vez.",
        "nl": "Bericht te lang om in één keer te vertalen.",
        "ja": "メッセージが長すぎるため、一度に翻訳できません。",
    },
    "already_in_language": {
        "fr": "Ce message est déjà dans ta langue.",
        "en": "This message is already in your language.",
        "es": "Este mensaje ya está en tu idioma.",
        "de": "Diese Nachricht ist bereits in deiner Sprache.",
        "it": "Questo messaggio è già nella tua lingua.",
        "pt": "Esta mensagem já está no seu idioma.",
        "nl": "Dit bericht is al in jouw taal.",
        "ja": "このメッセージはすでにあなたの言語です。",
    },
    "no_content": {
        "fr": "Aucun texte à traduire dans ce message.",
        "en": "No text to translate in this message.",
        "es": "No hay texto que traducir en este mensaje.",
        "de": "Kein Text in dieser Nachricht zum Übersetzen.",
        "it": "Nessun testo da tradurre in questo messaggio.",
        "pt": "Nenhum texto para traduzir nesta mensagem.",
        "nl": "Geen tekst om te vertalen in dit bericht.",
        "ja": "このメッセージに翻訳するテキストがありません。",
    },
    "message_not_found": {
        "fr": "Message introuvable.",
        "en": "Message not found.",
        "es": "Mensaje no encontrado.",
        "de": "Nachricht nicht gefunden.",
        "it": "Messaggio non trovato.",
        "pt": "Mensagem não encontrada.",
        "nl": "Bericht niet gevonden.",
        "ja": "メッセージが見つかりません。",
    },
}


def t_bot(lang: str, key: str, **kwargs: Any) -> str:
    """Message bot statique dans la langue demandée (fallback fr)."""
    table = BOT_MESSAGES.get(key) or {}
    text = table.get(lang) or table.get(DEFAULT_LANG) or key
    if kwargs:
        try:
            return text.format(**kwargs)
        except KeyError:
            return text
    return text


async def sync_language_role_if_missing(db, user_id: str, member: dict, user: dict | None = None) -> bool:
    """Attribue un rôle langue depuis le profil site si le membre n'en a pas encore (onboarding)."""
    if role_id_to_language(member.get("roles") or []):
        return False
    if user is None:
        user = await db.users.find_one({"user_id": user_id}, {"language": 1, "_id": 0})
    lang = get_user_preferred_language_from_profile(user)
    return await apply_language_role(db, user_id, lang)


async def apply_language_role(db, user_id: str, lang_code: str) -> bool:
    """Attribue le rôle langue (un seul) selon le code site/discord. Ne touche pas aux autres rôles."""
    result = await _apply_single_role(db, user_id, language_role_id(lang_code), f"language ({lang_code})")
    if result.get("ok"):
        logger.info("Language role %s applied for user %s", lang_code, user_id)
    return bool(result.get("ok"))


async def _discord_role_request(
    method: str,
    discord_id: str,
    role_id: str,
    reason: str,
) -> dict[str, Any]:
    """Low-level Discord role PUT/DELETE with structured status."""
    cfg_token = _env("DISCORD_BOT_TOKEN")
    cfg_guild = _env("DISCORD_GUILD_ID")
    if not cfg_token or not cfg_guild:
        return {"ok": False, "error": "discord_not_configured", "status_code": None}
    if not role_id:
        return {"ok": False, "error": "missing_role_mapping", "status_code": None}

    import httpx

    url = f"{discord_sync.DISCORD_API}/guilds/{cfg_guild}/members/{discord_id}/roles/{role_id}"
    headers = {
        **discord_sync._headers(cfg_token),
        "X-Audit-Log-Reason": discord_sync._audit_reason(reason),
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            if method == "PUT":
                r = await client.put(url, headers=headers)
            else:
                r = await client.delete(url, headers=headers)
        if r.status_code in (200, 204):
            return {"ok": True, "status_code": r.status_code}
        if r.status_code == 403:
            return {"ok": False, "error": "missing_permissions", "status_code": 403}
        if r.status_code == 404:
            return {"ok": False, "error": "not_in_guild", "status_code": 404}
        return {
            "ok": False,
            "error": "discord_api_error",
            "status_code": r.status_code,
            "detail": (r.text or "")[:200],
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("Discord role %s failed for member %s role %s: %s", method, discord_id, role_id, exc)
        return {"ok": False, "error": "network_error", "detail": str(exc)[:200]}


async def _apply_single_role(db, user_id: str, role_id: str, label: str) -> dict[str, Any]:
    user = await db.users.find_one({"user_id": user_id}, {"discord_id": 1, "_id": 0})
    discord_id = (user or {}).get("discord_id")
    if not discord_id:
        return {"ok": False, "error": "no_discord_link"}
    if not role_id:
        return {"ok": False, "error": "missing_role_mapping"}
    return await _discord_role_request("PUT", str(discord_id), role_id, f"NEXORIA {label}")


async def _remove_single_role(db, user_id: str, role_id: str, label: str) -> dict[str, Any]:
    user = await db.users.find_one({"user_id": user_id}, {"discord_id": 1, "_id": 0})
    discord_id = (user or {}).get("discord_id")
    if not discord_id:
        return {"ok": False, "error": "no_discord_link"}
    if not role_id:
        return {"ok": False, "error": "missing_role_mapping"}
    return await _discord_role_request("DELETE", str(discord_id), role_id, f"NEXORIA remove {label}")


def _collect_role_env_maps() -> tuple[dict[str, str], dict[str, str], set[str], set[str]]:
    lang_by_code: dict[str, str] = {}
    country_by_code: dict[str, str] = {}
    lang_ids: set[str] = set()
    country_ids: set[str] = set()
    for spec in LANGUAGE_SPECS:
        rid = _env(spec["role_env"])
        if rid:
            lang_by_code[spec["code"]] = rid
            lang_ids.add(rid)
    for spec in COUNTRY_SPECS:
        rid = _env(spec["role_env"])
        if rid:
            country_by_code[spec["code"]] = rid
            country_ids.add(rid)
    return lang_by_code, country_by_code, lang_ids, country_ids


async def sync_discord_language_country_roles(
    db,
    user: dict | None = None,
    *,
    user_id: str | None = None,
    old_language: str | None = None,
    old_country: str | None = None,
) -> dict[str, Any]:
    """Push user language/country from MongoDB to Discord lang/country roles."""
    if user is None:
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        return {"discordSyncStatus": "error", "error": "user_not_found"}

    uid = user.get("user_id") or user_id or ""
    username = user.get("username") or ""
    discord_id = user.get("discord_id")
    new_language = get_user_preferred_language_from_profile(user)
    new_country = (user.get("country_code") or "").strip().lower() or None

    base = {
        "userId": uid,
        "username": username,
        "discordId": str(discord_id) if discord_id else None,
        "oldLanguage": old_language,
        "newLanguage": new_language,
        "oldCountry": old_country,
        "newCountry": new_country,
        "rolesRemoved": [],
        "rolesAdded": [],
        "errors": [],
    }

    if not discord_id:
        logger.info(
            "Discord role sync skipped | userId=%s username=%s discordId=absent status=not_linked "
            "oldLang=%s newLang=%s oldCountry=%s newCountry=%s",
            uid, username, old_language, new_language, old_country, new_country,
        )
        return {**base, "discordSyncStatus": "not_linked"}

    if not discord_sync.is_sync_enabled():
        logger.info(
            "Discord role sync skipped | userId=%s username=%s discordId=%s status=sync_disabled",
            uid, username, discord_id,
        )
        return {**base, "discordSyncStatus": "sync_disabled"}

    if not discord_sync.is_configured():
        logger.warning(
            "Discord role sync skipped | userId=%s username=%s discordId=%s status=discord_not_configured",
            uid, username, discord_id,
        )
        return {**base, "discordSyncStatus": "discord_not_configured"}

    lang_map, country_map, lang_role_ids, country_role_ids = _collect_role_env_maps()
    intl_role_ids = lang_role_ids | country_role_ids

    target_lang_role = lang_map.get(new_language)
    target_country_role = country_map.get(new_country) if new_country and valid_country_code(new_country) else None

    missing_mappings: list[str] = []
    if new_language and not target_lang_role:
        missing_mappings.append(f"language:{new_language}")
    if new_country and valid_country_code(new_country) and not target_country_role:
        missing_mappings.append(f"country:{new_country}")

    member_roles: set[str] = set()
    try:
        import httpx

        cfg_token = _env("DISCORD_BOT_TOKEN")
        cfg_guild = _env("DISCORD_GUILD_ID")
        async with httpx.AsyncClient(timeout=15.0) as client:
            member = await discord_sync._fetch_member(client, cfg_guild, str(discord_id), cfg_token)
        if member is None:
            logger.warning(
                "Discord role sync failed | userId=%s username=%s discordId=%s status=not_in_guild",
                uid, username, discord_id,
            )
            return {**base, "discordSyncStatus": "not_in_guild"}
        member_roles = set(member.get("roles") or [])
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Discord role sync member fetch failed | userId=%s username=%s discordId=%s error=%s",
            uid, username, discord_id, exc,
        )
        return {**base, "discordSyncStatus": "error", "errors": [str(exc)[:200]]}

    removed: list[str] = []
    added: list[str] = []
    errors: list[str] = []
    had_permission_error = False

    for rid in sorted(member_roles & intl_role_ids):
        spec_lang = next((code for code, env_rid in lang_map.items() if env_rid == rid), None)
        spec_country = next((code for code, env_rid in country_map.items() if env_rid == rid), None)
        label = f"lang:{spec_lang}" if spec_lang else f"country:{spec_country or rid}"
        result = await _remove_single_role(db, uid, rid, label)
        if result.get("ok"):
            removed.append(f"{rid}:{label}")
        elif result.get("error") == "missing_permissions":
            had_permission_error = True
            errors.append(f"remove:{label}:missing_permissions")
        elif result.get("error") not in ("no_discord_link",):
            errors.append(f"remove:{label}:{result.get('error')}")

    if target_lang_role:
        result = await _apply_single_role(db, uid, target_lang_role, f"language ({new_language})")
        if result.get("ok"):
            added.append(f"{target_lang_role}:lang:{new_language}")
        elif result.get("error") == "missing_permissions":
            had_permission_error = True
            errors.append(f"add:lang:{new_language}:missing_permissions")
        elif result.get("error") == "missing_role_mapping":
            errors.append(f"add:lang:{new_language}:missing_role_mapping")
        else:
            errors.append(f"add:lang:{new_language}:{result.get('error')}")

    if target_country_role:
        result = await _apply_single_role(db, uid, target_country_role, f"country ({new_country})")
        if result.get("ok"):
            added.append(f"{target_country_role}:country:{new_country}")
        elif result.get("error") == "missing_permissions":
            had_permission_error = True
            errors.append(f"add:country:{new_country}:missing_permissions")
        elif result.get("error") == "missing_role_mapping":
            errors.append(f"add:country:{new_country}:missing_role_mapping")
        else:
            errors.append(f"add:country:{new_country}:{result.get('error')}")

    if missing_mappings:
        for item in missing_mappings:
            errors.append(f"mapping:{item}")
        logger.warning(
            "Discord role sync missing mappings | userId=%s username=%s discordId=%s missing=%s",
            uid, username, discord_id, ",".join(missing_mappings),
        )

    if had_permission_error:
        status = "missing_permissions"
    elif missing_mappings and not added and not removed:
        status = "missing_role_mapping"
    elif errors and not added:
        status = "error"
    elif errors:
        status = "partial"
    else:
        status = "success"

    logger.info(
        "Discord role sync | userId=%s username=%s discordId=%s oldLang=%s newLang=%s "
        "oldCountry=%s newCountry=%s removed=%s added=%s status=%s errors=%s",
        uid,
        username,
        discord_id,
        old_language,
        new_language,
        old_country,
        new_country,
        ",".join(removed) or "-",
        ",".join(added) or "-",
        status,
        ",".join(errors) or "-",
    )

    now = datetime.now(timezone.utc).isoformat()
    if status in ("success", "partial"):
        patch: dict[str, str] = {"preferences_discord_synced_at": now}
        if target_lang_role and any(a.startswith(f"{target_lang_role}:lang:") for a in added):
            patch["language_synced_at"] = now
        if target_country_role and any(a.startswith(f"{target_country_role}:country:") for a in added):
            patch["country_synced_at"] = now
        await db.users.update_one({"user_id": uid}, {"$set": patch})

    return {
        **base,
        "discordSyncStatus": status,
        "rolesRemoved": removed,
        "rolesAdded": added,
        "errors": errors,
        "missingRoleMappings": missing_mappings,
    }


def schedule_sync_language_role(db, user_id: str, lang_code: str) -> None:
    schedule_push_international_preferences(db, user_id)


async def sync_language_from_member(db, user_id: str, member: dict, user: dict | None = None) -> dict:
    """Pull site language from Discord role when the user has not set one yet."""
    role_lang = role_id_to_language(member.get("roles") or [])
    if not role_lang:
        return {"updated": False}
    if user is None:
        user = await db.users.find_one({"user_id": user_id}, {"language": 1, "_id": 0})
    if (user or {}).get("language"):
        return {"updated": False}
    await db.users.update_one({"user_id": user_id}, {"$set": {"language": role_lang}})
    return {"updated": True, "language": role_lang}


async def sync_country_from_member(db, user_id: str, member: dict) -> dict:
    """Pull country from Discord member roles → NEXORIA profile."""
    role_country = role_id_to_country(member.get("roles") or [])
    if not role_country:
        return {"updated": False}
    user = await db.users.find_one(
        {"user_id": user_id},
        {"country_code": 1, "country_source": 1, "_id": 0},
    )
    if (user or {}).get("country_source") == "manual":
        return {"updated": False, "reason": "manual_country"}
    if (
        user
        and user.get("country_code") == role_country
        and user.get("country_source") == "discord"
    ):
        return {"updated": False, "country_code": role_country}
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "country_code": role_country,
            "country_source": "discord",
            "country_synced_at": now,
        }},
    )
    return {"updated": True, "country_code": role_country, "source": "discord"}


async def sync_country_role_if_missing(db, user_id: str, member: dict, user: dict | None = None) -> bool:
    """Push profile country to Discord when the member has no country role yet."""
    if role_id_to_country(member.get("roles") or []):
        return False
    if user is None:
        user = await db.users.find_one({"user_id": user_id}, {"country_code": 1, "_id": 0})
    code = (user or {}).get("country_code")
    if not code or not valid_country_code(code):
        return False
    return await apply_country_role(db, user_id, code)


async def apply_country_role(db, user_id: str, country_code: str) -> bool:
    """Assign a single country role on Discord (swap others)."""
    target = country_role_id(country_code)
    if not target or not discord_sync.is_configured():
        return False

    user = await db.users.find_one({"user_id": user_id}, {"discord_id": 1, "_id": 0})
    discord_id = (user or {}).get("discord_id")
    if not discord_id:
        return False

    for spec in COUNTRY_SPECS:
        rid = _env(spec["role_env"])
        if not rid or rid == target:
            continue
        await discord_sync.remove_extra_role(db, user_id, rid, reason="NEXORIA country role swap")

    ok = await discord_sync.grant_extra_role(
        db, user_id, target, reason=f"NEXORIA country ({country_code})",
    )
    if ok:
        logger.info("Country role %s applied for user %s", country_code, user_id)
    return ok


def schedule_sync_country_role(db, user_id: str, country_code: str) -> None:
    schedule_push_international_preferences(db, user_id)


async def clear_country_roles(db, user_id: str) -> bool:
    """Remove every configured country role from a linked Discord member."""
    if not discord_sync.is_configured():
        return False
    user = await db.users.find_one({"user_id": user_id}, {"discord_id": 1, "_id": 0})
    if not (user or {}).get("discord_id"):
        return False
    for spec in COUNTRY_SPECS:
        rid = _env(spec["role_env"])
        if not rid:
            continue
        await discord_sync.remove_extra_role(db, user_id, rid, reason="NEXORIA country cleared")
    return True


async def push_user_international_preferences(
    db,
    user_id: str,
    user: dict | None = None,
) -> dict:
    """Push site language/country to Discord (site is source of truth when linked)."""
    if user is None:
        user = await db.users.find_one(
            {"user_id": user_id},
            {"_id": 0, "user_id": 1, "username": 1, "discord_id": 1, "language": 1, "country_code": 1, "country_source": 1},
        )
    if not user:
        return {"discordSyncStatus": "error", "error": "user_not_found"}
    return await sync_discord_language_country_roles(db, user)


def schedule_push_international_preferences(db, user_id: str) -> None:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    task = loop.create_task(push_user_international_preferences(db, user_id))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


# Alias explicite demandé par la spec produit.
sync_discord_language_country_roles_for_user = sync_discord_language_country_roles


async def handle_member_roles_update(member_data: dict) -> None:
    """Gateway hook — refresh country/language when Discord roles change."""
    if _db is None:
        return
    du = member_data.get("user") or {}
    discord_id = str(du.get("id") or "")
    if not discord_id:
        return
    user = await _db.users.find_one({"discord_id": discord_id}, {"user_id": 1, "_id": 0})
    if not user:
        return
    await sync_country_from_member(_db, user["user_id"], member_data)
    await sync_language_from_member(_db, user["user_id"], member_data)


async def post_official_to_language_channels(
    embed: dict,
    *,
    source_lang: str = DEFAULT_LANG,
    content: str = "",
) -> dict[str, bool]:
    """Publie un embed officiel (traduit) dans chaque salon de langue configuré."""
    import discord_translate

    results: dict[str, bool] = {}
    base_payload: dict = {"embeds": [embed]}
    if content:
        base_payload["content"] = content[:1900]

    for spec in LANGUAGE_SPECS:
        ch_id = _env(spec["channel_env"])
        if not ch_id:
            continue
        target = spec["code"]
        if target == source_lang:
            payload = base_payload
        else:
            translated, _ = await discord_translate.translate_payload(
                dict(base_payload), target, source_lang,
            )
            if not translated:
                results[target] = False
                continue
            payload = translated
        ok = await discord_sync.post_channel_message(
            ch_id,
            content=payload.get("content") or "",
            embeds=payload.get("embeds"),
            translatable=True,
            source_lang=source_lang,
        )
        results[target] = ok
    return results


def env_report_lines() -> list[str]:
    """Lignes à copier dans .env après setup (IDs remplis par le script)."""
    lines: list[str] = ["# ─── Discord International (setup_discord_international.py) ───"]
    for spec in LANGUAGE_SPECS:
        lines.append(f"{spec['role_env']}=")
        lines.append(f"{spec['channel_env']}=")
    for spec in COUNTRY_SPECS:
        lines.append(f"{spec['role_env']}=")
    lines.append(f"{GLOBAL_CHAT_ENV}=")
    lines.append("DISCORD_INTERNATIONAL_CATEGORY_ID=")
    return lines
