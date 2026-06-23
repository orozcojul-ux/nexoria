"""Discord message translation — select menu, context menu, slash + Interactions API.

Messages bot are published in French (source). Players can translate any message via
context menu (Applications → Traduire ce message) or /traduire. Bot messages keep the
compact language select menu (i18n → LibreTranslate → Gemini).
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import time
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

import asyncio
import httpx

import discord_i18n
import libretranslate_client
import discord_international

logger = logging.getLogger("nexoria.discord_translate")

DISCORD_API = "https://discord.com/api/v10"
DEFAULT_SOURCE_LANG = "fr"

TRANSLATE_LANGS: list[dict[str, str]] = [
    {"code": "fr", "select_value": "fr", "label": "française", "label_full": "Français", "flag": "🇫🇷"},
    {"code": "en", "select_value": "en", "label": "anglaise", "label_full": "English", "flag": "🇬🇧"},
    {"code": "es", "select_value": "es", "label": "espagnole", "label_full": "Español", "flag": "🇪🇸"},
    {"code": "de", "select_value": "de", "label": "allemande", "label_full": "Deutsch", "flag": "🇩🇪"},
    {"code": "it", "select_value": "it", "label": "italienne", "label_full": "Italiano", "flag": "🇮🇹"},
    {"code": "pt", "select_value": "pt-BR", "label": "portugaise (Brésil)", "label_full": "Português (BR)", "flag": "🇧🇷"},
    {"code": "nl", "select_value": "nl", "label": "néerlandaise", "label_full": "Nederlands", "flag": "🇳🇱"},
    {"code": "ja", "select_value": "ja", "label": "japonaise", "label_full": "日本語", "flag": "🇯🇵"},
]

LANG_CODES = {lang["code"] for lang in TRANSLATE_LANGS}
SELECT_VALUE_TO_LANG = {lang["select_value"]: lang["code"] for lang in TRANSLATE_LANGS}
SELECT_VALUE_TO_LANG.update({lang["code"]: lang["code"] for lang in TRANSLATE_LANGS})

TRANSLATE_SELECT_CUSTOM_ID = "translate_select"
TRANSLATE_USER_SELECT_PREFIX = "translate_user_select"
TRANSLATE_MSG_BUTTON_PREFIX = "translate_msg"
CONTEXT_MENU_TRANSLATE_NAME = "Traduire ce message"
SLASH_TRANSLATE_NAME = "traduire"
MAX_TRANSLATION_CHARS = 6000
MIN_TRANSLATABLE_CHARS = 2
REACTION_COOLDOWN_SECONDS = 10
REACTION_DUPLICATE_WINDOW_SECONDS = 30
CHANNEL_REPLY_TTL_SECONDS = 60
MESSAGE_URL_RE = re.compile(r"discord(?:app)?\.com/channels/(\d+)/(\d+)/(\d+)")

_reaction_cooldown: dict[str, float] = {}
_reaction_recent: dict[str, float] = {}


SLASH_LANG_CHOICES: dict[str, str] = {
    "français": "fr",
    "francais": "fr",
    "english": "en",
    "anglais": "en",
    "español": "es",
    "espanol": "es",
    "deutsch": "de",
    "allemand": "de",
    "italiano": "it",
    "italien": "it",
    "português br": "pt",
    "portugues br": "pt",
    "português": "pt",
    "nederlands": "nl",
    "néerlandais": "nl",
    "日本語": "ja",
    "japonais": "ja",
    "fr": "fr",
    "en": "en",
    "es": "es",
    "de": "de",
    "it": "it",
    "pt": "pt",
    "pt-br": "pt",
    "nl": "nl",
    "ja": "ja",
}

TARGET_LANG_PROMPT = {
    "fr": "français",
    "en": "anglais",
    "es": "espagnol",
    "de": "allemand",
    "it": "italien",
    "pt": "portugais brésilien",
    "nl": "néerlandais",
    "ja": "japonais",
}

_db = None


def init(db) -> None:
    global _db
    _db = db


def public_key_hex() -> str:
    return os.environ.get("DISCORD_PUBLIC_KEY", "").strip()


def bot_token() -> str:
    return os.environ.get("DISCORD_BOT_TOKEN", "").strip()


def lang_meta(code: str) -> dict[str, str]:
    for lang in TRANSLATE_LANGS:
        if lang["code"] == code:
            return lang
    return {"code": code, "label": code, "label_full": code.upper(), "flag": "🌐"}


def member_lang_from_interaction(payload: dict | None) -> str:
    """Langue préférée du membre Discord (rôles langue) — fallback fr."""
    if not payload:
        return DEFAULT_SOURCE_LANG
    return discord_international.get_user_preferred_language(payload.get("member"))


def normalize_select_lang(value: str) -> str:
    """Map select-menu value (e.g. pt-BR) to internal lang code (pt)."""
    key = (value or "").strip()
    if not key:
        return ""
    lowered = key.lower()
    if lowered in SLASH_LANG_CHOICES:
        return SLASH_LANG_CHOICES[lowered]
    return SELECT_VALUE_TO_LANG.get(key, lowered)


def payload_char_count(payload: dict[str, Any]) -> int:
    total = len(payload.get("content") or "")
    for emb in payload.get("embeds") or []:
        for key in ("title", "description", "footer"):
            total += len(str(emb.get(key) or ""))
        for field in emb.get("fields") or []:
            total += len(str(field.get("name") or ""))
            total += len(str(field.get("value") or ""))
    return total


async def detect_source_language(payload: dict[str, Any]) -> str:
    parts: list[str] = []
    content = (payload.get("content") or "").strip()
    if content:
        parts.append(content)
    for emb in payload.get("embeds") or []:
        for key in ("title", "description"):
            value = (emb.get(key) or "").strip()
            if value:
                parts.append(value)
    snippet = "\n".join(parts).strip()
    if not snippet:
        return DEFAULT_SOURCE_LANG
    detected = await libretranslate_client.detect_language(snippet)
    return detected or DEFAULT_SOURCE_LANG


def alternate_language_select_row(message_id: str, channel_id: str) -> dict:
    custom_id = f"{TRANSLATE_USER_SELECT_PREFIX}:{message_id}:{channel_id}"[:100]
    return {
        "type": 1,
        "components": [{
            "type": 3,
            "custom_id": custom_id,
            "placeholder": "🌍 Choisir une autre langue",
            "min_values": 1,
            "max_values": 1,
            "options": translate_select_options(),
        }],
    }


def parse_message_reference(ref: str, fallback_channel_id: str) -> tuple[str, str]:
    """Parse Discord message URL or snowflake ID → (channel_id, message_id)."""
    value = (ref or "").strip()
    match = MESSAGE_URL_RE.search(value)
    if match:
        return match.group(2), match.group(3)
    if value.isdigit() and fallback_channel_id:
        return fallback_channel_id, value
    raise ValueError("invalid message reference")


def parse_slash_lang(value: str | None) -> str:
    if not value:
        return ""
    return normalize_select_lang(str(value).strip())


def _log_translation_event(
    *,
    event: str,
    message_id: str,
    channel_id: str,
    guild_id: str,
    target_lang: str,
    source_lang: str,
    provider: str,
    duration_ms: int | None = None,
    error: str | None = None,
) -> None:
    extra = (
        f"event={event} message_id={message_id} channel_id={channel_id} "
        f"guild_id={guild_id} target_lang={target_lang} source_lang={source_lang} "
        f"provider={provider}"
    )
    if duration_ms is not None:
        extra += f" duration_ms={duration_ms}"
    if error:
        logger.warning("%s error=%s", extra, error[:200])
    elif event == "success":
        logger.info("%s success=1", extra)
    else:
        logger.info(extra)


def translate_select_options() -> list[dict[str, str]]:
    options: list[dict[str, str]] = []
    for lang in TRANSLATE_LANGS:
        option: dict[str, str] = {
            "label": f"{lang['flag']} {lang['label_full']}"[:100],
            "value": lang["select_value"],
        }
        if lang["code"] == DEFAULT_SOURCE_LANG:
            option["description"] = "Version originale"[:100]
        else:
            option["description"] = f"Traduire en {lang['label_full']}"[:100]
        options.append(option)
    return options


def translate_select_component_rows() -> list[dict]:
    """Single compact String Select Menu — replaces legacy flag button rows."""
    return [{
        "type": 1,
        "components": [{
            "type": 3,
            "custom_id": TRANSLATE_SELECT_CUSTOM_ID,
            "placeholder": "🌍 Traduire ce message (ou réagis avec 🌍)",
            "min_values": 1,
            "max_values": 1,
            "options": translate_select_options(),
        }],
    }]


def flag_component_rows() -> list[dict]:
    """Legacy flag buttons — kept for backward compatibility with old messages."""
    rows: list[dict] = []
    row: list[dict] = []
    for lang in TRANSLATE_LANGS:
        row.append({
            "type": 2,
            "style": 2,
            "label": lang["flag"],
            "custom_id": f"tr:{lang['code']}",
        })
        if len(row) == 5:
            rows.append({"type": 1, "components": row})
            row = []
    if row:
        rows.append({"type": 1, "components": row})
    return rows


def _headers(token: str) -> dict:
    return {"Authorization": f"Bot {token}", "User-Agent": "Nexoria/1.0"}


def verify_interaction_signature(signature_hex: str | None, timestamp: str | None, body: bytes) -> bool:
    pk = public_key_hex()
    if not pk or not signature_hex or not timestamp:
        return not pk
    try:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
        pub = Ed25519PublicKey.from_public_bytes(bytes.fromhex(pk))
        pub.verify(bytes.fromhex(signature_hex), timestamp.encode() + body)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("Discord interaction signature invalid: %s", exc)
        return False


def parse_discord_message(message: dict) -> dict[str, Any]:
    """Extract structured translatable payload — never flatten into one string."""
    content = (message.get("content") or "").strip()
    embeds_out: list[dict[str, Any]] = []
    for emb in message.get("embeds") or []:
        footer = emb.get("footer") or {}
        fields = []
        for field in emb.get("fields") or []:
            name = str(field.get("name") or "").strip()
            value = str(field.get("value") or "").strip()
            if not name and not value:
                continue
            fields.append({
                "name": name,
                "value": value,
                "inline": bool(field.get("inline")),
            })
        embeds_out.append({
            "title": str(emb.get("title") or "").strip(),
            "description": str(emb.get("description") or "").strip(),
            "fields": fields,
            "footer": str(footer.get("text") or "").strip(),
        })
    return {"content": content, "embeds": embeds_out}


def payload_source_hash(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def make_cache_key(
    message_id: str,
    source_language: str,
    target_language: str,
    source_hash: str,
) -> str:
    """Clé de cache stable, non vide — sha256(message:source:target:hash)."""
    if not message_id or not source_hash or not source_language or not target_language:
        return ""
    raw = f"{message_id}:{source_language}:{target_language}:{source_hash}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _read_translation_cache(cache_key: str) -> dict[str, Any] | None:
    if _db is None or not cache_key:
        return None
    doc = await _db.translation_cache.find_one({"key": cache_key}, {"payload": 1, "provider": 1})
    if doc and doc.get("payload"):
        return doc
    return None


async def _write_translation_cache(
    *,
    cache_key: str,
    message_id: str,
    source_language: str,
    target_language: str,
    source_hash: str,
    payload: dict[str, Any],
    provider: str,
) -> None:
    if _db is None:
        return
    if not cache_key:
        logger.warning(
            "translation cache skip write: empty cache_key (message_id=%s target=%s)",
            message_id,
            target_language,
        )
        return
    now = _utc_now_iso()
    try:
        await _db.translation_cache.update_one(
            {"key": cache_key},
            {
                "$set": {
                    "key": cache_key,
                    "message_id": message_id,
                    "source_language": source_language,
                    "target_language": target_language,
                    "source_hash": source_hash,
                    "source_lang": source_language,
                    "payload": payload,
                    "provider": provider,
                    "updated_at": now,
                },
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
        logger.debug(
            "translation cache stored key=%s message_id=%s target=%s provider=%s",
            cache_key[:16],
            message_id,
            target_language,
            provider,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "translation cache write failed key=%s message_id=%s target=%s: %s",
            cache_key[:16] if cache_key else "?",
            message_id,
            target_language,
            exc,
        )


async def migrate_translation_cache() -> dict[str, int]:
    """Nettoie les entrées key:null et recrée l'index unique sur key."""
    stats = {"deleted_null_keys": 0, "indexes_rebuilt": 0}
    if _db is None:
        return stats
    try:
        result = await _db.translation_cache.delete_many({
            "$or": [
                {"key": None},
                {"key": ""},
                {"key": {"$exists": False}},
            ],
        })
        stats["deleted_null_keys"] = result.deleted_count

        indexes = await _db.translation_cache.index_information()
        for name, info in list(indexes.items()):
            if name == "_id_":
                continue
            keys = info.get("key", [])
            if any(k == "key" for k, _ in keys):
                try:
                    await _db.translation_cache.drop_index(name)
                    stats["indexes_rebuilt"] += 1
                except Exception as exc:  # noqa: BLE001
                    logger.warning("translation_cache drop index %s failed: %s", name, exc)

        await _db.translation_cache.create_index(
            "key",
            unique=True,
            partialFilterExpression={"key": {"$type": "string"}},
            name="key_1",
        )
        stats["indexes_rebuilt"] += 1
    except Exception as exc:  # noqa: BLE001
        logger.warning("translation cache migration failed: %s", exc)
    return stats


def _gemini_available() -> bool:
    return bool(os.environ.get("GEMINI_API_KEY", "").strip())


def _gemini_model() -> str:
    return os.environ.get("DISCORD_TRANSLATE_MODEL", "gemini/gemini-2.0-flash")


async def _translate_with_providers(
    payload: dict[str, Any],
    target: str,
    source: str,
) -> tuple[dict[str, Any] | None, str]:
    """Chaîne : i18n → LibreTranslate → Gemini."""
    i18n_result = discord_i18n.lookup_i18n(payload, target, source)
    if i18n_result is not None:
        return i18n_result, "i18n"

    if libretranslate_client.is_configured():
        lt_result = await libretranslate_client.translate_payload(payload, source, target)
        if lt_result is not None:
            return lt_result, "libretranslate"
        logger.warning(
            "Discord translation LibreTranslate failed (source=%s target=%s), trying fallback",
            source,
            target,
        )

    if _gemini_available():
        gemini_result = await _translate_with_gemini(payload, target, source)
        if gemini_result is not None:
            return gemini_result, "gemini"
        logger.warning(
            "Discord translation Gemini failed (source=%s target=%s)",
            source,
            target,
        )

    return None, "none"


def _translation_provider() -> tuple[str, str, str | None]:
    """Returns (model, provider_name, api_key) — Gemini fallback only."""
    gemini = os.environ.get("GEMINI_API_KEY", "").strip()
    if gemini:
        return _gemini_model(), "gemini", gemini
    return "", "none", None


def _translation_system_prompt(target: str, source: str) -> str:
    target_name = TARGET_LANG_PROMPT.get(target, target)
    source_name = TARGET_LANG_PROMPT.get(source, source)
    return (
        f"Tu es un traducteur professionnel pour NEXORIA (jeu RPG communautaire).\n"
        f"Traduis fidèlement le JSON source du {source_name} vers le {target_name}.\n\n"
        "Règles strictes :\n"
        "- Conserve le Markdown Discord (**gras**, *italique*, listes, liens).\n"
        "- Conserve les emojis tels quels.\n"
        "- Ne traduis PAS : NEXORIA, Nexus Online, Discord, Écus, Smouzyi, noms de joueurs, "
        "URLs, IDs Discord, mentions (<@...>), montants, dates, variables techniques.\n"
        "- Conserve exactement les retours à la ligne \\n et les paragraphes (\\n\\n).\n"
        "- Traduis title, description, fields (name + value) et footer séparément.\n"
        "- Ne fusionne jamais title et description.\n"
        "- Retourne UNIQUEMENT un JSON valide, même structure : "
        '{"content":"...","embeds":[{"title":"...","description":"...","fields":[{"name":"...","value":"...","inline":false}],"footer":"..."}]}\n'
        "- Pas de texte avant ou après le JSON."
    )


def _parse_llm_json(text: str) -> dict[str, Any] | None:
    cleaned = (text or "").strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.I)
        cleaned = re.sub(r"\s*```\s*$", "", cleaned)
    try:
        data = json.loads(cleaned)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    return None


def _normalize_translated_payload(raw: dict[str, Any], source: dict[str, Any]) -> dict[str, Any]:
    """Ensure translated payload mirrors source structure."""
    out: dict[str, Any] = {"content": str(raw.get("content") or source.get("content") or "").strip(), "embeds": []}
    src_embeds = source.get("embeds") or []
    raw_embeds = raw.get("embeds") or []
    for i, src_emb in enumerate(src_embeds):
        raw_emb = raw_embeds[i] if i < len(raw_embeds) else {}
        fields = []
        src_fields = src_emb.get("fields") or []
        raw_fields = raw_emb.get("fields") or []
        for j, sf in enumerate(src_fields):
            rf = raw_fields[j] if j < len(raw_fields) else {}
            fields.append({
                "name": str(rf.get("name") or sf.get("name") or "").strip()[:256],
                "value": str(rf.get("value") or sf.get("value") or "").strip()[:1024],
                "inline": bool(sf.get("inline")),
            })
        out["embeds"].append({
            "title": str(raw_emb.get("title") or src_emb.get("title") or "").strip()[:256],
            "description": str(raw_emb.get("description") or src_emb.get("description") or "").strip(),
            "fields": fields,
            "footer": str(raw_emb.get("footer") or src_emb.get("footer") or "").strip()[:2048],
        })
    return out


async def _translate_with_gemini(payload: dict[str, Any], target: str, source: str) -> dict[str, Any] | None:
    model, provider, api_key = _translation_provider()
    if not model or not api_key:
        return None

    import litellm

    user_json = json.dumps(payload, ensure_ascii=False)
    try:
        response = await litellm.acompletion(
            model=model,
            messages=[
                {"role": "system", "content": _translation_system_prompt(target, source)},
                {"role": "user", "content": user_json},
            ],
            api_key=api_key,
            max_tokens=2500,
            temperature=0.2,
        )
        content = response.choices[0].message.content
        parsed = _parse_llm_json(str(content or ""))
        if not parsed:
            logger.warning(
                "Discord translation Gemini invalid JSON (target=%s)",
                target,
            )
            return None
        return _normalize_translated_payload(parsed, payload)
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Discord translation Gemini failed (target=%s): %s",
            target,
            str(exc)[:200],
        )
        return None


async def _translate_with_llm(payload: dict[str, Any], target: str, source: str) -> dict[str, Any] | None:
    """Alias legacy — préférer _translate_with_providers."""
    result, _ = await _translate_with_providers(payload, target, source)
    return result


async def translate_payload(
    payload: dict[str, Any],
    target: str,
    source: str,
    *,
    message_id: str = "",
) -> tuple[dict[str, Any] | None, str]:
    if target == source:
        return deepcopy(payload), "none"

    src_hash = payload_source_hash(payload)
    cache_key = make_cache_key(message_id, source, target, src_hash) if message_id else ""

    if cache_key:
        cached = await _read_translation_cache(cache_key)
        if cached:
            return cached["payload"], cached.get("provider") or "cache"

    translated, provider = await _translate_with_providers(payload, target, source)
    if translated is None:
        return None, provider

    if cache_key:
        await _write_translation_cache(
            cache_key=cache_key,
            message_id=message_id,
            source_language=source,
            target_language=target,
            source_hash=src_hash,
            payload=translated,
            provider=provider,
        )

    return translated, provider


async def migrate_source_lang_to_french() -> int:
    """One-shot migration: legacy bot messages registered with source_lang=en."""
    if _db is None:
        return 0
    try:
        result = await _db.discord_translatable_messages.update_many(
            {"source_lang": {"$ne": DEFAULT_SOURCE_LANG}},
            {"$set": {"source_lang": DEFAULT_SOURCE_LANG}},
        )
        return result.modified_count
    except Exception as exc:  # noqa: BLE001
        logger.warning("discord translate migration failed: %s", exc)
        return 0


def build_source_version_embed(payload: dict[str, Any], lang: str = DEFAULT_SOURCE_LANG) -> dict[str, Any]:
    """Display the source-language content without calling a translation provider."""
    meta = lang_meta(lang)
    description_parts: list[str] = []
    embed_fields: list[dict] = []
    source_footer = ""

    content = (payload.get("content") or "").strip()
    if content:
        description_parts.append(content)

    for emb in payload.get("embeds") or []:
        title = (emb.get("title") or "").strip()
        desc = (emb.get("description") or "").strip()
        if title:
            description_parts.append(f"**{title}**")
        if desc:
            description_parts.append(desc)
        for field in emb.get("fields") or []:
            name = (field.get("name") or "").strip()
            value = (field.get("value") or "").strip()
            if name and value:
                embed_fields.append({
                    "name": name[:256],
                    "value": value[:1024],
                    "inline": bool(field.get("inline")),
                })
            elif name:
                description_parts.append(f"**{name}**")
            elif value:
                description_parts.append(value)
        if emb.get("footer"):
            source_footer = str(emb.get("footer") or "").strip()

    description = "\n\n".join(description_parts).strip()
    if len(description) > 4096:
        description = description[:4093] + "…"

    title_label = "Version française" if lang == "fr" else f"Version {meta['label_full']}"
    embed: dict[str, Any] = {
        "title": f"{meta['flag']} {title_label}"[:256],
        "description": description or "—",
        "color": 0x5865F2,
        "footer": {"text": (source_footer or "NEXORIA — forge ta légende")[:2048]},
    }
    if embed_fields:
        embed["fields"] = embed_fields[:25]
    return embed


def build_translation_embed(
    translated: dict[str, Any],
    target: str,
    source: str,
) -> dict[str, Any]:
    """Build a clean Discord embed for the ephemeral translation response."""
    tgt = lang_meta(target)
    src = lang_meta(source)

    description_parts: list[str] = []
    embed_fields: list[dict] = []

    content = (translated.get("content") or "").strip()
    if content:
        description_parts.append(content)

    for emb in translated.get("embeds") or []:
        title = (emb.get("title") or "").strip()
        desc = (emb.get("description") or "").strip()
        if title:
            description_parts.append(f"**{title}**")
        if desc:
            description_parts.append(desc)
        for field in emb.get("fields") or []:
            name = (field.get("name") or "").strip()
            value = (field.get("value") or "").strip()
            if name and value:
                embed_fields.append({
                    "name": name[:256],
                    "value": value[:1024],
                    "inline": bool(field.get("inline")),
                })
            elif name:
                description_parts.append(f"**{name}**")
            elif value:
                description_parts.append(value)

    description = "\n\n".join(description_parts).strip()
    if len(description) > 4096:
        description = description[:4093] + "…"

    footer_text = f"Traduit depuis {src['flag']} {src['label_full']}"

    embed: dict[str, Any] = {
        "title": f"{tgt['flag']} {tgt['label_full']}"[:256],
        "description": description or "—",
        "color": 0x5865F2,
        "footer": {"text": footer_text[:2048]},
    }
    if embed_fields:
        embed["fields"] = embed_fields[:25]
    return embed


def _ephemeral_response(
    *,
    content: str = "",
    embeds: list | None = None,
    components: list | None = None,
) -> dict:
    data: dict[str, Any] = {"flags": 64}
    if embeds:
        data["embeds"] = embeds[:10]
    if content:
        data["content"] = content[:2000]
    if components:
        data["components"] = components[:5]
    return {"type": 4, "data": data}


async def fetch_discord_message(channel_id: str, message_id: str) -> dict | None:
    token = bot_token()
    if not token:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                f"{DISCORD_API}/channels/{channel_id}/messages/{message_id}",
                headers=_headers(token),
            )
            if r.status_code == 200:
                return r.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning("fetch_discord_message failed: %s", exc)
    return None


async def register_message(
    message_id: str,
    channel_id: str,
    *,
    content: str = "",
    embeds: list | None = None,
    source_lang: str = DEFAULT_SOURCE_LANG,
) -> None:
    if _db is None:
        return
    try:
        await _db.discord_translatable_messages.update_one(
            {"message_id": message_id},
            {"$set": {
                "message_id": message_id,
                "channel_id": channel_id,
                "content": content,
                "embeds": embeds or [],
                "source_lang": source_lang,
                "source_hash": payload_source_hash(parse_discord_message({
                    "content": content,
                    "embeds": embeds or [],
                })),
            }},
            upsert=True,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("register_message failed: %s", exc)


async def resolve_source_payload(
    message_id: str,
    channel_id: str,
    interaction_message: dict | None,
) -> tuple[dict[str, Any], str]:
    payload: dict[str, Any] | None = None
    source_lang = DEFAULT_SOURCE_LANG
    registered_doc: dict | None = None

    if _db is not None:
        registered_doc = await _db.discord_translatable_messages.find_one({"message_id": message_id})
        if registered_doc:
            payload = parse_discord_message({
                "content": registered_doc.get("content") or "",
                "embeds": registered_doc.get("embeds") or [],
            })
            source_lang = (registered_doc.get("source_lang") or DEFAULT_SOURCE_LANG).strip().lower()
            if source_lang == "pt-br":
                source_lang = "pt"

    if not payload or not _payload_has_text(payload):
        msg = interaction_message or await fetch_discord_message(channel_id, message_id)
        if msg:
            payload = parse_discord_message(msg)
            if registered_doc:
                source_lang = (registered_doc.get("source_lang") or source_lang).strip().lower()
                if source_lang == "pt-br":
                    source_lang = "pt"
            else:
                source_lang = await detect_source_language(payload)
                if _db is not None:
                    await register_message(
                        message_id,
                        channel_id,
                        content=msg.get("content") or "",
                        embeds=msg.get("embeds") or [],
                        source_lang=source_lang,
                    )

    return payload or {"content": "", "embeds": []}, source_lang


def _payload_has_text(payload: dict[str, Any]) -> bool:
    if (payload.get("content") or "").strip():
        return True
    for emb in payload.get("embeds") or []:
        if (emb.get("title") or "").strip():
            return True
        if (emb.get("description") or "").strip():
            return True
        for f in emb.get("fields") or []:
            if (f.get("name") or "").strip() or (f.get("value") or "").strip():
                return True
        if (emb.get("footer") or "").strip():
            return True
    return False


def extract_translatable_text(payload: dict[str, Any]) -> str:
    parts: list[str] = []
    content = (payload.get("content") or "").strip()
    if content:
        parts.append(content)
    for emb in payload.get("embeds") or []:
        for key in ("title", "description", "footer"):
            value = (emb.get(key) or "").strip()
            if value:
                parts.append(value)
        for field in emb.get("fields") or []:
            name = (field.get("name") or "").strip()
            value = (field.get("value") or "").strip()
            if name:
                parts.append(name)
            if value:
                parts.append(value)
    return "\n".join(parts).strip()


def is_translatable_payload(payload: dict[str, Any]) -> bool:
    if not _payload_has_text(payload):
        return False
    cleaned = libretranslate_client.MENTION_RE.sub("", extract_translatable_text(payload)).strip()
    return len(cleaned) >= MIN_TRANSLATABLE_CHARS


def _reaction_on_cooldown(user_id: str) -> bool:
    now = time.monotonic()
    last = _reaction_cooldown.get(user_id, 0.0)
    if now - last < REACTION_COOLDOWN_SECONDS:
        return True
    _reaction_cooldown[user_id] = now
    if len(_reaction_cooldown) > 5000:
        cutoff = now - REACTION_COOLDOWN_SECONDS * 2
        for uid, ts in list(_reaction_cooldown.items()):
            if ts < cutoff:
                _reaction_cooldown.pop(uid, None)
    return False


def _reaction_duplicate(user_id: str, message_id: str, target: str) -> bool:
    key = f"{user_id}:{message_id}:{target}"
    now = time.monotonic()
    last = _reaction_recent.get(key, 0.0)
    if now - last < REACTION_DUPLICATE_WINDOW_SECONDS:
        return True
    _reaction_recent[key] = now
    if len(_reaction_recent) > 10000:
        cutoff = now - REACTION_DUPLICATE_WINDOW_SECONDS * 2
        for k, ts in list(_reaction_recent.items()):
            if ts < cutoff:
                _reaction_recent.pop(k, None)
    return False


def flatten_translation_body(translated: dict[str, Any], target: str, source_lang: str) -> str:
    embed = build_translation_embed(translated, target, source_lang)
    return (embed.get("description") or "—").strip()


def member_lang_from_member_dict(member: dict | None) -> str:
    return discord_international.get_user_preferred_language(member)


async def fetch_guild_member(guild_id: str, user_id: str) -> dict | None:
    token = bot_token()
    if not token or not guild_id or not user_id:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                f"{DISCORD_API}/guilds/{guild_id}/members/{user_id}",
                headers=_headers(token),
            )
            if r.status_code == 200:
                return r.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning("fetch_guild_member failed guild_id=%s user_id=%s: %s", guild_id, user_id, exc)
    return None


async def create_dm_channel(user_id: str) -> str | None:
    token = bot_token()
    if not token or not user_id:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                f"{DISCORD_API}/users/@me/channels",
                headers={**_headers(token), "Content-Type": "application/json"},
                json={"recipient_id": user_id},
            )
            if r.status_code in (200, 201):
                return str(r.json().get("id") or "")
    except Exception as exc:  # noqa: BLE001
        logger.warning("create_dm_channel failed user_id=%s: %s", user_id, exc)
    return None


async def send_discord_message(
    channel_id: str,
    content: str,
    *,
    embeds: list | None = None,
) -> dict | None:
    token = bot_token()
    if not token or not channel_id:
        return None
    payload: dict[str, Any] = {"content": content[:2000]}
    if embeds:
        payload["embeds"] = embeds[:10]
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                f"{DISCORD_API}/channels/{channel_id}/messages",
                headers={**_headers(token), "Content-Type": "application/json"},
                json=payload,
            )
            if r.status_code in (200, 201):
                return r.json()
            logger.info(
                "send_discord_message failed channel_id=%s status=%s",
                channel_id,
                r.status_code,
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning("send_discord_message error channel_id=%s: %s", channel_id, exc)
    return None


async def delete_discord_message(channel_id: str, message_id: str) -> None:
    token = bot_token()
    if not token or not channel_id or not message_id:
        return
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.delete(
                f"{DISCORD_API}/channels/{channel_id}/messages/{message_id}",
                headers=_headers(token),
            )
    except Exception as exc:  # noqa: BLE001
        logger.debug("delete_discord_message failed channel_id=%s message_id=%s: %s", channel_id, message_id, exc)


async def _delete_message_after(channel_id: str, message_id: str, delay: int) -> None:
    await asyncio.sleep(max(1, delay))
    await delete_discord_message(channel_id, message_id)


def _dm_fallback_enabled() -> bool:
    """DM uniquement si explicitement activé (DISCORD_TRANSLATE_DM_FALLBACK=true)."""
    return os.environ.get("DISCORD_TRANSLATE_DM_FALLBACK", "false").strip().lower() in (
        "1", "true", "yes", "on",
    )


async def fetch_last_channel_message(channel_id: str) -> dict | None:
    """Dernier message d'un salon/thread — pour /traduire sans argument."""
    token = bot_token()
    if not token or not channel_id:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                f"{DISCORD_API}/channels/{channel_id}/messages",
                headers=_headers(token),
                params={"limit": 1},
            )
            if r.status_code == 200:
                messages = r.json()
                if messages:
                    return messages[0]
    except Exception as exc:  # noqa: BLE001
        logger.warning("fetch_last_channel_message failed channel_id=%s: %s", channel_id, exc)
    return None


async def deliver_reaction_translation(
    *,
    user_id: str,
    channel_id: str,
    target_lang: str,
    body: str,
) -> str:
    """Réaction 🌍 : message temporaire dans le salon (60 s). DM seulement en dernier recours."""
    meta = lang_meta(target_lang)
    channel_text = (
        f"<@{user_id}> 🌍 **Traduction en {meta['label_full']}** :\n\n{body[:1500]}\n\n"
        "_Pour une traduction visible uniquement par toi, utilise le bouton "
        "🌍 Traduire ou `/traduire`._"
    )
    sent = await send_discord_message(channel_id, channel_text)
    if sent and sent.get("id"):
        asyncio.create_task(
            _delete_message_after(channel_id, str(sent["id"]), CHANNEL_REPLY_TTL_SECONDS)
        )
        return "channel_temp"

    if _dm_fallback_enabled():
        dm_text = f"🌍 **Traduction** ({meta['flag']} {meta['label_full']})\n\n{body[:1800]}"
        dm_channel = await create_dm_channel(user_id)
        if dm_channel:
            dm_sent = await send_discord_message(dm_channel, dm_text)
            if dm_sent:
                return "dm_fallback"
    return "failed"


async def handle_reaction_translate(
    *,
    user_id: str,
    channel_id: str,
    message_id: str,
    guild_id: str = "",
    member: dict | None = None,
) -> None:
    """Traduction déclenchée par une réaction 🌍."""
    started = time.monotonic()
    if not user_id or not channel_id or not message_id:
        return

    logger.info(
        "reaction_translate_started user_id=%s message_id=%s channel_id=%s guild_id=%s",
        user_id,
        message_id,
        channel_id,
        guild_id,
    )

    if _reaction_on_cooldown(user_id):
        logger.info(
            "reaction_translate_skipped user_id=%s reason=cooldown message_id=%s",
            user_id,
            message_id,
        )
        return

    if not member and guild_id:
        member = await fetch_guild_member(guild_id, user_id)
    target_lang = member_lang_from_member_dict(member)

    if _reaction_duplicate(user_id, message_id, target_lang):
        logger.info(
            "reaction_translate_skipped user_id=%s reason=duplicate message_id=%s target_lang=%s",
            user_id,
            message_id,
            target_lang,
        )
        return

    source_payload, source_lang = await resolve_source_payload(message_id, channel_id, None)
    if not is_translatable_payload(source_payload):
        duration_ms = int((time.monotonic() - started) * 1000)
        _log_translation_event(
            event="reaction_translate_error",
            message_id=message_id,
            channel_id=channel_id,
            guild_id=guild_id,
            target_lang=target_lang,
            source_lang=source_lang,
            provider="none",
            duration_ms=duration_ms,
            error="no_content",
        )
        return

    if payload_char_count(source_payload) > MAX_TRANSLATION_CHARS:
        duration_ms = int((time.monotonic() - started) * 1000)
        _log_translation_event(
            event="reaction_translate_error",
            message_id=message_id,
            channel_id=channel_id,
            guild_id=guild_id,
            target_lang=target_lang,
            source_lang=source_lang,
            provider="none",
            duration_ms=duration_ms,
            error="message_too_long",
        )
        meta = lang_meta(target_lang)
        await deliver_reaction_translation(
            user_id=user_id,
            channel_id=channel_id,
            target_lang=target_lang,
            body=discord_international.t_bot(meta["code"], "message_too_long"),
        )
        return

    if target_lang == source_lang:
        duration_ms = int((time.monotonic() - started) * 1000)
        _log_translation_event(
            event="reaction_translate_skipped",
            message_id=message_id,
            channel_id=channel_id,
            guild_id=guild_id,
            target_lang=target_lang,
            source_lang=source_lang,
            provider="none",
            duration_ms=duration_ms,
        )
        await deliver_reaction_translation(
            user_id=user_id,
            channel_id=channel_id,
            target_lang=target_lang,
            body=discord_international.t_bot(target_lang, "already_in_language"),
        )
        return

    translated, provider_name = await translate_payload(
        source_payload,
        target_lang,
        source_lang,
        message_id=message_id,
    )
    duration_ms = int((time.monotonic() - started) * 1000)

    if translated is None:
        _log_translation_event(
            event="reaction_translate_error",
            message_id=message_id,
            channel_id=channel_id,
            guild_id=guild_id,
            target_lang=target_lang,
            source_lang=source_lang,
            provider=provider_name,
            duration_ms=duration_ms,
            error="translation_failed",
        )
        await deliver_reaction_translation(
            user_id=user_id,
            channel_id=channel_id,
            target_lang=target_lang,
            body=discord_international.t_bot(target_lang, "translation_unavailable"),
        )
        return

    body = flatten_translation_body(translated, target_lang, source_lang)
    delivery = await deliver_reaction_translation(
        user_id=user_id,
        channel_id=channel_id,
        target_lang=target_lang,
        body=body,
    )
    _log_translation_event(
        event="reaction_translate_success",
        message_id=message_id,
        channel_id=channel_id,
        guild_id=guild_id,
        target_lang=target_lang,
        source_lang=source_lang,
        provider=f"{provider_name}:{delivery}",
        duration_ms=duration_ms,
    )


async def _thread_helper_exists(thread_id: str) -> bool:
    if _db is None or not thread_id:
        return False
    doc = await _db.discord_translate_thread_helpers.find_one({"thread_id": thread_id}, {"_id": 1})
    return doc is not None


async def _mark_thread_helper(thread_id: str) -> None:
    if _db is None or not thread_id:
        return
    now = _utc_now_iso()
    await _db.discord_translate_thread_helpers.update_one(
        {"thread_id": thread_id},
        {"$set": {"thread_id": thread_id, "created_at": now}},
        upsert=True,
    )


async def fetch_thread_starter_message_id(thread_id: str) -> str:
    token = bot_token()
    if not token or not thread_id:
        return thread_id
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                f"{DISCORD_API}/channels/{thread_id}/messages",
                headers=_headers(token),
                params={"limit": 1},
            )
            if r.status_code == 200:
                messages = r.json()
                if messages:
                    return str(messages[0].get("id") or thread_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("fetch_thread_starter_message_id failed thread_id=%s: %s", thread_id, exc)
    return thread_id


def _forum_helper_content() -> str:
    return (
        "🌍 **Besoin d'une traduction ?**\n"
        "Clique sur le bouton ci-dessous pour traduire cette candidature dans ta langue."
    )


async def ensure_thread_translate_helper(
    *,
    forum_channel_id: str,
    thread_id: str,
    starter_message_id: str | None = None,
) -> None:
    """Un seul message helper par thread forum inscriptions-beta."""
    beta_channel = os.environ.get("DISCORD_BETA_SIGNUP_CHANNEL_ID", "").strip()
    if not beta_channel or forum_channel_id != beta_channel or not thread_id:
        return
    if await _thread_helper_exists(thread_id):
        return

    starter_id = starter_message_id or await fetch_thread_starter_message_id(thread_id)
    button_id = f"{TRANSLATE_MSG_BUTTON_PREFIX}:{thread_id}:{starter_id}"[:100]
    components = [{
        "type": 1,
        "components": [{
            "type": 2,
            "style": 2,
            "label": "🌍 Traduire cette candidature",
            "custom_id": button_id,
        }],
    }]
    ok = await post_thread_message(thread_id, content=_forum_helper_content(), components=components)
    if ok:
        await _mark_thread_helper(thread_id)
        logger.info(
            "forum translate helper posted thread_id=%s forum_channel_id=%s",
            thread_id,
            forum_channel_id,
        )


def _deferred_ephemeral_ack() -> dict:
    """Accusé de réception différé — Discord exige une réponse < 3 s."""
    return {"type": 5, "data": {"flags": 64}}


async def _edit_deferred_interaction(
    application_id: str,
    interaction_token: str,
    *,
    content: str = "",
    embeds: list | None = None,
    components: list | None = None,
) -> bool:
    token = bot_token()
    if not token or not application_id or not interaction_token:
        return False
    url = f"{DISCORD_API}/webhooks/{application_id}/{interaction_token}/messages/@original"
    data: dict[str, Any] = {"flags": 64}
    if embeds:
        data["embeds"] = embeds[:10]
    if content:
        data["content"] = content[:2000]
    if components:
        data["components"] = components[:5]
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.patch(
                url,
                headers={**_headers(token), "Content-Type": "application/json"},
                json=data,
            )
            if r.status_code in (200, 201):
                return True
            logger.warning(
                "Discord deferred edit failed HTTP %s: %s",
                r.status_code,
                r.text[:200],
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Discord deferred edit error: %s", exc)
    return False


def _is_fast_translation_path(source_payload: dict[str, Any], target: str, source: str) -> bool:
    """i18n prédéfini — réponse immédiate sans appel réseau."""
    if target == source:
        return True
    return discord_i18n.lookup_i18n(source_payload, target, source) is not None


async def _finish_deferred_translation(
    *,
    application_id: str,
    interaction_token: str,
    message_id: str,
    channel_id: str,
    guild_id: str,
    target: str,
    source_lang: str,
    source_payload: dict[str, Any],
    member_lang: str,
) -> None:
    started = time.monotonic()
    try:
        translated, provider_name = await translate_payload(
            source_payload,
            target,
            source_lang,
            message_id=message_id,
        )
        duration_ms = int((time.monotonic() - started) * 1000)
        if translated is None:
            _log_translation_event(
                event="error",
                message_id=message_id,
                channel_id=channel_id,
                guild_id=guild_id,
                target_lang=target,
                source_lang=source_lang,
                provider=provider_name,
                duration_ms=duration_ms,
                error="translation_failed",
            )
            await _edit_deferred_interaction(
                application_id,
                interaction_token,
                content=discord_international.t_bot(member_lang, "translation_unavailable"),
            )
            return

        _log_translation_event(
            event="success",
            message_id=message_id,
            channel_id=channel_id,
            guild_id=guild_id,
            target_lang=target,
            source_lang=source_lang,
            provider=provider_name,
            duration_ms=duration_ms,
        )
        embed = build_translation_embed(translated, target, source_lang)
        await _edit_deferred_interaction(
            application_id,
            interaction_token,
            embeds=[embed],
            components=[alternate_language_select_row(message_id, channel_id)],
        )
    except Exception as exc:  # noqa: BLE001
        duration_ms = int((time.monotonic() - started) * 1000)
        _log_translation_event(
            event="error",
            message_id=message_id,
            channel_id=channel_id,
            guild_id=guild_id,
            target_lang=target,
            source_lang=source_lang,
            provider="none",
            duration_ms=duration_ms,
            error=str(exc),
        )
        await _edit_deferred_interaction(
            application_id,
            interaction_token,
            content=discord_international.t_bot(member_lang, "translation_unavailable"),
        )


async def _handle_translation_request(
    *,
    payload: dict,
    target: str,
    message_id: str | None = None,
    channel_id: str | None = None,
    interaction_message: dict | None = None,
) -> dict:
    """Shared translation flow — bot select menu, context menu, slash, alternate lang."""
    started = time.monotonic()
    member_lang = member_lang_from_interaction(payload)
    guild_id = str(payload.get("guild_id") or "")

    if target not in LANG_CODES:
        return _ephemeral_response(
            content=discord_international.t_bot(member_lang, "unknown_action"),
        )

    message = interaction_message or payload.get("message") or {}
    message_id = str(message_id or message.get("id") or "")
    channel_id = str(channel_id or payload.get("channel_id") or message.get("channel_id") or "")
    if not message_id or not channel_id:
        return _ephemeral_response(content=discord_international.t_bot(member_lang, "message_not_found"))

    source_payload, source_lang = await resolve_source_payload(message_id, channel_id, message)
    if not _payload_has_text(source_payload):
        return _ephemeral_response(content=discord_international.t_bot(member_lang, "no_content"))

    if payload_char_count(source_payload) > MAX_TRANSLATION_CHARS:
        return _ephemeral_response(content=discord_international.t_bot(member_lang, "message_too_long"))

    if target == source_lang:
        if source_lang == DEFAULT_SOURCE_LANG and (payload.get("data") or {}).get("custom_id") == TRANSLATE_SELECT_CUSTOM_ID:
            return _ephemeral_response(content="🇫🇷 Ce message est déjà en français.")
        return _ephemeral_response(
            content=discord_international.t_bot(member_lang, "already_in_language"),
            components=[alternate_language_select_row(message_id, channel_id)],
        )

    src_hash = payload_source_hash(source_payload)
    cache_key = make_cache_key(message_id, source_lang, target, src_hash)
    if cache_key:
        cached = await _read_translation_cache(cache_key)
        if cached:
            duration_ms = int((time.monotonic() - started) * 1000)
            _log_translation_event(
                event="success",
                message_id=message_id,
                channel_id=channel_id,
                guild_id=guild_id,
                target_lang=target,
                source_lang=source_lang,
                provider=cached.get("provider") or "cache",
                duration_ms=duration_ms,
            )
            embed = build_translation_embed(cached["payload"], target, source_lang)
            return _ephemeral_response(
                embeds=[embed],
                components=[alternate_language_select_row(message_id, channel_id)],
            )

    if _is_fast_translation_path(source_payload, target, source_lang):
        translated, provider_name = await translate_payload(
            source_payload,
            target,
            source_lang,
            message_id=message_id,
        )
        duration_ms = int((time.monotonic() - started) * 1000)
        if translated is None:
            _log_translation_event(
                event="error",
                message_id=message_id,
                channel_id=channel_id,
                guild_id=guild_id,
                target_lang=target,
                source_lang=source_lang,
                provider=provider_name,
                duration_ms=duration_ms,
                error="translation_failed",
            )
            return _ephemeral_response(
                content=discord_international.t_bot(member_lang, "translation_unavailable"),
            )
        _log_translation_event(
            event="success",
            message_id=message_id,
            channel_id=channel_id,
            guild_id=guild_id,
            target_lang=target,
            source_lang=source_lang,
            provider=provider_name,
            duration_ms=duration_ms,
        )
        embed = build_translation_embed(translated, target, source_lang)
        return _ephemeral_response(
            embeds=[embed],
            components=[alternate_language_select_row(message_id, channel_id)],
        )

    application_id = str(payload.get("application_id") or "")
    interaction_token = str(payload.get("token") or "")
    if application_id and interaction_token:
        asyncio.create_task(_finish_deferred_translation(
            application_id=application_id,
            interaction_token=interaction_token,
            message_id=message_id,
            channel_id=channel_id,
            guild_id=guild_id,
            target=target,
            source_lang=source_lang,
            source_payload=source_payload,
            member_lang=member_lang,
        ))
        return _deferred_ephemeral_ack()

    translated, provider_name = await translate_payload(
        source_payload,
        target,
        source_lang,
        message_id=message_id,
    )
    duration_ms = int((time.monotonic() - started) * 1000)
    if translated is None:
        _log_translation_event(
            event="error",
            message_id=message_id,
            channel_id=channel_id,
            guild_id=guild_id,
            target_lang=target,
            source_lang=source_lang,
            provider=provider_name,
            duration_ms=duration_ms,
            error="translation_failed",
        )
        return _ephemeral_response(
            content=discord_international.t_bot(member_lang, "translation_unavailable"),
        )

    _log_translation_event(
        event="success",
        message_id=message_id,
        channel_id=channel_id,
        guild_id=guild_id,
        target_lang=target,
        source_lang=source_lang,
        provider=provider_name,
        duration_ms=duration_ms,
    )
    embed = build_translation_embed(translated, target, source_lang)
    return _ephemeral_response(
        embeds=[embed],
        components=[alternate_language_select_row(message_id, channel_id)],
    )


def _parse_translation_target(payload: dict) -> tuple[str, str, str]:
    """Extract target language and optional message/channel from component interaction."""
    data = payload.get("data") or {}
    custom_id = (data.get("custom_id") or "").strip()
    component_type = data.get("component_type")
    message_id = ""
    channel_id = ""

    if component_type == 3 and custom_id.startswith(TRANSLATE_USER_SELECT_PREFIX):
        parts = custom_id.split(":")
        if len(parts) >= 3:
            message_id = parts[1]
            channel_id = parts[2]
        values = data.get("values") or []
        target = normalize_select_lang(str(values[0])) if values else ""
        return target, message_id, channel_id

    if component_type == 3 and custom_id.startswith(TRANSLATE_SELECT_CUSTOM_ID):
        values = data.get("values") or []
        if values:
            return normalize_select_lang(str(values[0])), "", ""
        return "", "", ""

    if custom_id.startswith(TRANSLATE_MSG_BUTTON_PREFIX):
        parts = custom_id.split(":")
        if len(parts) >= 3:
            channel_id = parts[1]
            message_id = parts[2]
        return member_lang_from_interaction(payload), message_id, channel_id

    if custom_id.startswith("tr:"):
        return custom_id.split(":", 1)[1].lower(), "", ""

    return "", "", ""


async def handle_component_interaction(payload: dict) -> dict:
    target, message_id, channel_id = _parse_translation_target(payload)
    if not target:
        return _ephemeral_response(
            content=discord_international.t_bot(member_lang_from_interaction(payload), "unknown_action"),
        )
    return await _handle_translation_request(
        payload=payload,
        target=target,
        message_id=message_id or None,
        channel_id=channel_id or None,
    )


async def handle_message_context_command(payload: dict) -> dict:
    """Clic droit → Applications → Traduire ce message."""
    data = payload.get("data") or {}
    message_id = str(data.get("target_id") or "")
    channel_id = str(payload.get("channel_id") or "")
    target = member_lang_from_interaction(payload)
    return await _handle_translation_request(
        payload=payload,
        target=target,
        message_id=message_id,
        channel_id=channel_id,
    )


async def handle_slash_traduire(payload: dict) -> dict:
    """Commande /traduire [message] [langue] — message optionnel (dernier du salon)."""
    member_lang = member_lang_from_interaction(payload)
    data = payload.get("data") or {}
    options = {opt["name"]: opt.get("value") for opt in data.get("options") or []}
    channel_id = str(payload.get("channel_id") or "")
    message_ref = str(options.get("message") or "").strip()

    if message_ref:
        try:
            channel_id, message_id = parse_message_reference(message_ref, channel_id)
        except ValueError:
            return _ephemeral_response(
                content=discord_international.t_bot(member_lang, "message_not_found"),
            )
    else:
        last_msg = await fetch_last_channel_message(channel_id)
        if not last_msg or not last_msg.get("id"):
            return _ephemeral_response(
                content=discord_international.t_bot(member_lang, "message_not_found"),
            )
        message_id = str(last_msg["id"])

    lang_opt = options.get("langue")
    target = parse_slash_lang(str(lang_opt)) if lang_opt else member_lang_from_interaction(payload)
    if not target:
        target = member_lang
    return await _handle_translation_request(
        payload=payload,
        target=target,
        message_id=message_id,
        channel_id=channel_id,
    )


async def handle_application_command(payload: dict) -> dict:
    data = payload.get("data") or {}
    cmd_type = data.get("type")
    name = (data.get("name") or "").strip().lower()
    if cmd_type == 3:
        return await handle_message_context_command(payload)
    if cmd_type == 1 and name == SLASH_TRANSLATE_NAME:
        return await handle_slash_traduire(payload)
    return _ephemeral_response(
        content=discord_international.t_bot(member_lang_from_interaction(payload), "unknown_action"),
    )


async def handle_interaction(body: bytes) -> dict:
    data = json.loads(body)
    itype = data.get("type")
    if itype == 1:
        return {"type": 1}
    if itype == 2:
        return await handle_application_command(data)
    if itype == 3:
        return await handle_component_interaction(data)
    return _ephemeral_response(
        content=discord_international.t_bot(member_lang_from_interaction(data), "unknown_action"),
    )


async def post_thread_message(
    thread_id: str,
    *,
    content: str = "",
    components: list | None = None,
) -> bool:
    token = bot_token()
    if not token or not thread_id:
        return False
    payload: dict[str, Any] = {}
    if content:
        payload["content"] = content[:1900]
    if components:
        payload["components"] = components[:5]
    if not payload:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                f"{DISCORD_API}/channels/{thread_id}/messages",
                headers={**_headers(token), "Content-Type": "application/json"},
                json=payload,
            )
            return r.status_code in (200, 201)
    except Exception as exc:  # noqa: BLE001
        logger.warning("post_thread_message failed thread_id=%s: %s", thread_id, exc)
        return False


async def maybe_post_forum_translate_hint(
    forum_channel_id: str,
    thread_id: str,
    starter_message_id: str,
) -> None:
    """Hint discret dans un thread forum (ex. inscriptions-beta) — délègue au helper unique."""
    await ensure_thread_translate_helper(
        forum_channel_id=forum_channel_id,
        thread_id=thread_id,
        starter_message_id=starter_message_id,
    )


def attach_translate_components(payload: dict) -> dict:
    payload = dict(payload)
    payload["components"] = translate_select_component_rows()
    return payload


async def after_post(channel_id: str, message: dict, *, source_lang: str = DEFAULT_SOURCE_LANG) -> None:
    if not message.get("id"):
        return
    await register_message(
        str(message["id"]),
        channel_id,
        content=message.get("content") or "",
        embeds=message.get("embeds") or [],
        source_lang=source_lang,
    )
