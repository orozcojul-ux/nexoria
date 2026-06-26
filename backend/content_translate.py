"""Web UGC translation — news, forum, comments (LibreTranslate + Gemini fallback + cache)."""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from typing import Any

import libretranslate_client

logger = logging.getLogger("nexoria.content_translate")

SUPPORTED_LANGS = frozenset({"fr", "en", "es", "de", "it", "pt", "nl", "ja"})
DEFAULT_SOURCE = "fr"
MAX_TEXT_LEN = 12000
MIN_TEXT_LEN = 2
USER_COOLDOWN_SECONDS = 0.8

TARGET_LANG_NAMES = {
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
_rate_limit: dict[str, float] = {}


def init(db) -> None:
    global _db
    _db = db


def normalize_lang(code: str | None) -> str:
    raw = (code or "").strip().lower().replace("_", "-")
    if not raw:
        return DEFAULT_SOURCE
    if raw.startswith("pt"):
        return "pt"
    base = raw.split("-")[0]
    return base if base in SUPPORTED_LANGS else DEFAULT_SOURCE


def parse_accept_language(header: str | None) -> str:
    if not header:
        return DEFAULT_SOURCE
    for part in header.split(","):
        token = part.split(";")[0].strip()
        if token:
            lang = normalize_lang(token)
            if lang in SUPPORTED_LANGS:
                return lang
    return DEFAULT_SOURCE


def text_hash(text: str) -> str:
    return hashlib.sha256((text or "").strip().encode("utf-8")).hexdigest()


def make_cache_key(
    entity_type: str | None,
    entity_id: str | None,
    field: str | None,
    source: str,
    target: str,
    src_hash: str,
) -> str:
    scope = f"{entity_type or 'text'}:{entity_id or 'anon'}:{field or 'body'}"
    return hashlib.sha256(f"{scope}:{source}:{target}:{src_hash}".encode("utf-8")).hexdigest()


def _check_rate_limit(client_key: str) -> None:
    now = time.monotonic()
    last = _rate_limit.get(client_key, 0.0)
    if now - last < USER_COOLDOWN_SECONDS:
        raise ValueError("rate_limited")
    _rate_limit[client_key] = now


async def _cache_get(key: str) -> dict[str, Any] | None:
    if not _db or not key:
        return None
    doc = await _db.content_translations.find_one({"key": key}, {"_id": 0})
    return doc


async def _cache_set(
    key: str,
    *,
    text: str,
    source: str,
    target: str,
    src_hash: str,
    provider: str,
    entity_type: str | None,
    entity_id: str | None,
    field: str | None,
) -> None:
    if not _db or not key:
        return
    now = datetime.now(timezone.utc).isoformat()
    await _db.content_translations.update_one(
        {"key": key},
        {
            "$set": {
                "key": key,
                "text": text,
                "source_lang": source,
                "target_lang": target,
                "source_hash": src_hash,
                "provider": provider,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "field": field,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )


async def detect_source(text: str) -> str:
    detected = await libretranslate_client.detect_language(text)
    return detected or DEFAULT_SOURCE


async def _gemini_translate_text(text: str, source: str, target: str) -> str | None:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    model = os.environ.get("DISCORD_TRANSLATE_MODEL", "gemini/gemini-2.0-flash")
    source_name = TARGET_LANG_NAMES.get(source, source)
    target_name = TARGET_LANG_NAMES.get(target, target)
    system = (
        f"Tu es un traducteur professionnel pour NEXORIA (jeu RPG).\n"
        f"Traduis fidèlement du {source_name} vers le {target_name}.\n"
        "Conserve le Markdown, les emojis, les retours à la ligne.\n"
        "Ne traduis PAS : NEXORIA, Nexus, Écus, noms propres de joueurs, URLs.\n"
        "Retourne UNIQUEMENT le texte traduit, sans guillemets ni commentaire."
    )
    try:
        import litellm

        response = await litellm.acompletion(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": text},
            ],
            api_key=api_key,
            max_tokens=min(4000, max(256, len(text) * 2)),
            temperature=0.2,
        )
        out = str(response.choices[0].message.content or "").strip()
        if out.startswith('"') and out.endswith('"'):
            out = out[1:-1]
        return out or None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Content Gemini translate failed (%s→%s): %s", source, target, str(exc)[:160])
        return None


async def _translate_with_providers(text: str, source: str, target: str) -> tuple[str | None, str]:
    if libretranslate_client.is_configured():
        result = await libretranslate_client.translate_text(text, source, target)
        if result is not None:
            return result, "libretranslate"
    if os.environ.get("GEMINI_API_KEY", "").strip():
        result = await _gemini_translate_text(text, source, target)
        if result is not None:
            return result, "gemini"
    return None, "none"


async def translate_text(
    text: str,
    target: str,
    *,
    source: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    field: str | None = None,
    client_key: str = "anon",
) -> dict[str, Any]:
    """Translate a text segment with cache + provider chain."""
    _check_rate_limit(client_key)

    raw = (text or "").strip()
    if len(raw) < MIN_TEXT_LEN:
        return {
            "text": text or "",
            "original": text or "",
            "source_lang": source or DEFAULT_SOURCE,
            "target_lang": normalize_lang(target),
            "same_language": True,
            "cached": False,
            "provider": "none",
        }
    if len(raw) > MAX_TEXT_LEN:
        raw = raw[:MAX_TEXT_LEN]

    target_lang = normalize_lang(target)
    src_lang = normalize_lang(source) if source else await detect_source(raw)
    src_hash = text_hash(raw)

    if src_lang == target_lang:
        return {
            "text": raw,
            "original": raw,
            "source_lang": src_lang,
            "target_lang": target_lang,
            "same_language": True,
            "cached": False,
            "provider": "none",
        }

    cache_key = make_cache_key(entity_type, entity_id, field, src_lang, target_lang, src_hash)
    cached = await _cache_get(cache_key)
    if cached and cached.get("text"):
        return {
            "text": cached["text"],
            "original": raw,
            "source_lang": src_lang,
            "target_lang": target_lang,
            "same_language": False,
            "cached": True,
            "provider": cached.get("provider") or "cache",
        }

    translated, provider = await _translate_with_providers(raw, src_lang, target_lang)
    if translated is None:
        return {
            "text": raw,
            "original": raw,
            "source_lang": src_lang,
            "target_lang": target_lang,
            "same_language": False,
            "cached": False,
            "provider": "none",
            "unavailable": True,
        }

    await _cache_set(
        cache_key,
        text=translated,
        source=src_lang,
        target=target_lang,
        src_hash=src_hash,
        provider=provider,
        entity_type=entity_type,
        entity_id=entity_id,
        field=field,
    )
    return {
        "text": translated,
        "original": raw,
        "source_lang": src_lang,
        "target_lang": target_lang,
        "same_language": False,
        "cached": False,
        "provider": provider,
    }


async def translate_batch(
    items: list[dict[str, Any]],
    target: str,
    *,
    client_key: str = "anon",
) -> dict[str, Any]:
    target_lang = normalize_lang(target)
    out: dict[str, Any] = {}
    for item in items[:12]:
        key = str(item.get("key") or "text")
        out[key] = await translate_text(
            str(item.get("text") or ""),
            target_lang,
            source=item.get("source_lang"),
            entity_type=item.get("entity_type"),
            entity_id=item.get("entity_id"),
            field=item.get("field") or key,
            client_key=client_key,
        )
    return {"target_lang": target_lang, "items": out}
