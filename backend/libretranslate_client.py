"""Client LibreTranslate local pour NEXORIA Discord."""
from __future__ import annotations

import logging
import os
import re
from typing import Any

import httpx

logger = logging.getLogger("nexoria.libretranslate")

DEFAULT_URL = "http://127.0.0.1:5000"
DEFAULT_TIMEOUT = 15.0
_LOCAL_URLS = frozenset({
    "http://127.0.0.1:5000",
    "http://localhost:5000",
})

PROTECTED_TERMS = (
    "Nexus Online",
    "Pass Ascendant",
    "NEXORIA",
    "Smouzyi",
    "Discord",
    "Écus",
    "Nexoria",
)

URL_RE = re.compile(r"https?://[^\s<>)\]]+")
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
BETA_KEY_RE = re.compile(r"BETA-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}", re.IGNORECASE)
MENTION_RE = re.compile(r"<@[!&]?\d+>")
CHANNEL_MENTION_RE = re.compile(r"<#\d+>")
EMOJI_RE = re.compile(
    "["
    "\U0001F300-\U0001FAFF"
    "\U00002600-\U000027BF"
    "\U0000FE00-\U0000FE0F"
    "]+",
    flags=re.UNICODE,
)
PH_RE = re.compile(r"\uFFF0(\d+)\uFFF1")


def libretranslate_url() -> str:
    return os.environ.get("LIBRETRANSLATE_URL", DEFAULT_URL).strip().rstrip("/")


def libretranslate_api_key() -> str:
    return os.environ.get("LIBRETRANSLATE_API_KEY", "").strip()


def request_timeout() -> float:
    """Shorter timeout for local LibreTranslate so UGC can fall back to MyMemory quickly."""
    url = libretranslate_url().rstrip("/").lower()
    if url in _LOCAL_URLS:
        try:
            return float(os.environ.get("LIBRETRANSLATE_LOCAL_TIMEOUT", "3"))
        except ValueError:
            return 3.0
    try:
        return float(os.environ.get("LIBRETRANSLATE_TIMEOUT", str(DEFAULT_TIMEOUT)))
    except ValueError:
        return DEFAULT_TIMEOUT


def _auth_headers() -> dict[str, str]:
    key = libretranslate_api_key()
    return {"Authorization": f"Bearer {key}"} if key else {}


def is_configured() -> bool:
    provider = os.environ.get("TRANSLATION_PROVIDER", "libretranslate").strip().lower()
    if provider in ("none", "off", "disabled"):
        return False
    return bool(libretranslate_url())


def protect_text(text: str) -> tuple[str, list[str]]:
    """Remplace URLs, mentions, emojis et noms propres par des jetons préservés."""
    if not text:
        return text, []
    tokens: list[str] = []

    def stash(value: str) -> str:
        tokens.append(value)
        return f"\uFFF0{len(tokens) - 1}\uFFF1"

    def repl_pattern(pattern: re.Pattern[str], value: str) -> str:
        return pattern.sub(lambda m: stash(m.group(0)), value)

    protected = text
    protected = repl_pattern(URL_RE, protected)
    protected = repl_pattern(EMAIL_RE, protected)
    protected = repl_pattern(BETA_KEY_RE, protected)
    protected = repl_pattern(MENTION_RE, protected)
    protected = repl_pattern(CHANNEL_MENTION_RE, protected)
    protected = repl_pattern(EMOJI_RE, protected)
    for term in sorted(PROTECTED_TERMS, key=len, reverse=True):
        protected = re.sub(
            re.escape(term),
            lambda m, stash=stash: stash(m.group(0)),
            protected,
            flags=re.IGNORECASE,
        )
    return protected, tokens


def restore_text(text: str, tokens: list[str]) -> str:
    if not text or not tokens:
        return text

    def repl(match: re.Match[str]) -> str:
        idx = int(match.group(1))
        if 0 <= idx < len(tokens):
            return tokens[idx]
        return match.group(0)

    return PH_RE.sub(repl, text)


async def detect_language(text: str) -> str | None:
    """Détecte la langue via LibreTranslate /detect. Retourne un code NEXORIA ou None."""
    snippet = (text or "").strip()[:500]
    if not snippet or not is_configured():
        return None
    url = f"{libretranslate_url()}/detect"
    try:
        async with httpx.AsyncClient(timeout=request_timeout()) as client:
            r = await client.post(url, json={"q": snippet}, headers=_auth_headers())
            if r.status_code != 200:
                return None
            data = r.json()
            if isinstance(data, list) and data:
                code = (data[0].get("language") or "").lower()
            elif isinstance(data, dict):
                code = (data.get("language") or "").lower()
            else:
                return None
            if code == "pt-br":
                code = "pt"
            if code in {"fr", "en", "es", "de", "it", "pt", "nl", "ja"}:
                return code
    except Exception as exc:  # noqa: BLE001
        logger.warning("LibreTranslate detect failed: %s", str(exc)[:120])
    return None


async def translate_text(text: str, source: str, target: str) -> str | None:
    """Traduit un segment via POST /translate (format=text)."""
    if not text or not text.strip():
        return text
    if source == target:
        return text
    if not is_configured():
        return None

    protected, tokens = protect_text(text)
    url = f"{libretranslate_url()}/translate"
    payload: dict[str, Any] = {"q": protected, "source": source, "target": target, "format": "text"}
    api_key = libretranslate_api_key()
    if api_key:
        payload["api_key"] = api_key

    try:
        async with httpx.AsyncClient(timeout=request_timeout()) as client:
            r = await client.post(url, json=payload, headers=_auth_headers())
            if r.status_code != 200:
                logger.warning(
                    "LibreTranslate HTTP %s (source=%s target=%s): %s",
                    r.status_code,
                    source,
                    target,
                    r.text[:200],
                )
                return None
            data = r.json()
            translated = (data.get("translatedText") or data.get("translation") or "").strip()
            if not translated:
                logger.warning("LibreTranslate empty response (source=%s target=%s)", source, target)
                return None
            return restore_text(translated, tokens)
    except httpx.TimeoutException:
        logger.warning("LibreTranslate timeout (source=%s target=%s url=%s)", source, target, url)
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("LibreTranslate error (source=%s target=%s): %s", source, target, str(exc)[:200])
        return None


async def translate_payload(payload: dict[str, Any], source: str, target: str) -> dict[str, Any] | None:
    """Traduit chaque champ textuel en conservant la structure Discord."""
    if source == target:
        return payload

    content = payload.get("content") or ""
    translated_content = await translate_text(content, source, target)
    if content.strip() and translated_content is None:
        return None

    embeds_out: list[dict[str, Any]] = []
    for emb in payload.get("embeds") or []:
        title = emb.get("title") or ""
        description = emb.get("description") or ""
        footer = emb.get("footer") or ""

        tr_title = await translate_text(title, source, target) if title else ""
        tr_desc = await translate_text(description, source, target) if description else ""
        tr_footer = await translate_text(footer, source, target) if footer else ""

        if (title and tr_title is None) or (description and tr_desc is None) or (footer and tr_footer is None):
            return None

        fields_out: list[dict[str, Any]] = []
        for field in emb.get("fields") or []:
            name = field.get("name") or ""
            value = field.get("value") or ""
            tr_name = await translate_text(name, source, target) if name else ""
            tr_value = await translate_text(value, source, target) if value else ""
            if (name and tr_name is None) or (value and tr_value is None):
                return None
            fields_out.append({
                "name": (tr_name or name)[:256],
                "value": (tr_value or value)[:1024],
                "inline": bool(field.get("inline")),
            })

        embeds_out.append({
            "title": (tr_title or title)[:256],
            "description": tr_desc or description,
            "fields": fields_out,
            "footer": (tr_footer or footer)[:2048],
        })

    return {"content": translated_content or content, "embeds": embeds_out}
