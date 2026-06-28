"""Web UGC translation — cache + LibreTranslate/MyMemory (no Gemini)."""
from __future__ import annotations

import hashlib
import html
import logging
import os
import re
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from typing import Any

import libretranslate_client

logger = logging.getLogger("nexoria.content_translate")

SUPPORTED_LANGS = frozenset({"fr", "en", "es", "de", "it", "pt", "nl", "ja"})
DEFAULT_SOURCE = "fr"
MAX_TEXT_LEN = 8000
MIN_TEXT_LEN = 2
MYMEMORY_MAX_CHUNKS = 12
MAX_HTML_SEGMENTS = 60
LOG_THROTTLE_SECONDS = 60.0
MAX_BATCH_ITEMS = 1

_db = None
_log_throttle: dict[str, float] = {}

_LOCAL_LT_URLS = frozenset({
    "http://127.0.0.1:5000",
    "http://localhost:5000",
})

HTML_MARKER_ATTR = "data-nx-tx"
HTML_MARKER_RE = re.compile(
    rf'<span {HTML_MARKER_ATTR}="(\d+)">.*?</span>',
    re.DOTALL,
)
SEG_PACK_RE = re.compile(
    r"\[\[\[SEG:(\d+)\]\]\](.*?)\[\[\[/SEG:\1\]\]\]",
    re.DOTALL,
)


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


def make_content_cache_key(src_hash: str, source: str, target: str) -> str:
    if not src_hash or not source or not target:
        return ""
    return hashlib.sha256(f"content:{src_hash}:{source}:{target}".encode("utf-8")).hexdigest()


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


def pack_segments(segments: list[str]) -> str:
    return "".join(f"[[[SEG:{idx}]]]{seg}[[[/SEG:{idx}]]]" for idx, seg in enumerate(segments))


def unpack_segments(text: str, count: int) -> list[str] | None:
    matches = [(int(m.group(1)), m.group(2)) for m in SEG_PACK_RE.finditer(text or "")]
    if len(matches) != count:
        return None
    matches.sort(key=lambda item: item[0])
    if [idx for idx, _ in matches] != list(range(count)):
        return None
    return [part for _, part in matches]


def _segments_changed(original: list[str], translated: list[str]) -> bool:
    if len(original) != len(translated):
        return False
    return any(o.strip() != t.strip() for o, t in zip(original, translated))


def _log_provider_error(
    provider: str,
    source: str,
    target: str,
    exc: Exception,
    *,
    duration_ms: int | None = None,
) -> None:
    msg = str(exc)
    http_code = getattr(exc, "status_code", None)
    if http_code is None and "429" in msg:
        http_code = 429
    throttle_key = f"{provider}:{http_code or 'err'}:{source}:{target}"
    now = time.monotonic()
    if now - _log_throttle.get(throttle_key, 0.0) < LOG_THROTTLE_SECONDS:
        return
    _log_throttle[throttle_key] = now
    logger.warning(
        "content_translate provider=%s source=%s target=%s http=%s duration_ms=%s error=%s",
        provider,
        source,
        target,
        http_code or "-",
        duration_ms if duration_ms is not None else "-",
        msg[:120],
    )


async def _cache_get(key: str) -> dict[str, Any] | None:
    if _db is None or not key:
        return None
    return await _db.content_translations.find_one({"key": key}, {"_id": 0})


async def _cache_set(
    key: str,
    *,
    text: str,
    source: str,
    target: str,
    src_hash: str,
    provider: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    field: str | None = None,
) -> None:
    if _db is None or not key or not text:
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


async def _cache_lookup(
    src_hash: str,
    source: str,
    target: str,
    *,
    entity_type: str | None = None,
    entity_id: str | None = None,
    field: str | None = None,
    original: str,
) -> dict[str, Any] | None:
    content_key = make_content_cache_key(src_hash, source, target)
    entity_key = make_cache_key(entity_type, entity_id, field, source, target, src_hash)
    for cache_key in (content_key, entity_key):
        if not cache_key:
            continue
        cached = await _cache_get(cache_key)
        if not cached or not cached.get("text"):
            continue
        cached_text = str(cached["text"])
        if cached_text.strip() == original.strip():
            continue
        stale_plain = "<" not in cached_text and bool(re.search(r"<[a-z]", original, re.I))
        if stale_plain:
            continue
        return {
            "text": cached_text,
            "original": original,
            "source_lang": source,
            "target_lang": target,
            "same_language": False,
            "cached": True,
            "provider": cached.get("provider") or "cache",
        }
    return None


async def _store_translation(
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
    content_key = make_content_cache_key(src_hash, source, target)
    entity_key = make_cache_key(entity_type, entity_id, field, source, target, src_hash)
    for cache_key in (content_key, entity_key):
        if cache_key:
            await _cache_set(
                cache_key,
                text=text,
                source=source,
                target=target,
                src_hash=src_hash,
                provider=provider,
                entity_type=entity_type,
                entity_id=entity_id,
                field=field,
            )


def _use_libretranslate() -> bool:
    if not libretranslate_client.is_configured():
        return False
    flag = os.environ.get("CONTENT_TRANSLATE_USE_LIBRETRANSLATE", "").strip().lower()
    if flag in ("0", "false", "no"):
        return False
    if flag in ("1", "true", "yes"):
        return True
    url = libretranslate_client.libretranslate_url().rstrip("/").lower()
    return url not in _LOCAL_LT_URLS


def _allow_mymemory() -> bool:
    flag = os.environ.get("CONTENT_TRANSLATE_ALLOW_MYMEMORY", "1").strip().lower()
    return flag not in ("0", "false", "no", "off")


def _heuristic_source(text: str) -> str:
    sample = (text or "").strip()
    if not sample:
        return DEFAULT_SOURCE
    lower = sample.lower()
    padded = f" {lower} "
    french_hints = (
        " c'est ", " ceci ", " est un ", " est une ", " dans ", " pour ", " avec ",
        " cette ", " les ", " des ", " une ", " qu'", " nous ", " vous ",
        " annonce ", " actualité ", " bonjour ", " merci ", " joueur ",
    )
    if any(h in padded for h in french_hints):
        return DEFAULT_SOURCE
    if sample.isascii():
        return "en"
    return DEFAULT_SOURCE


async def detect_source(text: str) -> str:
    if _use_libretranslate():
        detected = await libretranslate_client.detect_language(text)
        if detected:
            return detected
    return _heuristic_source(text)


async def _mymemory_translate(text: str, source: str, target: str) -> str | None:
    if not _allow_mymemory():
        return None
    import httpx

    langpair = f"{source}|{target}"
    if target == "pt":
        langpair = f"{source}|pt-BR"

    raw = (text or "").strip()
    if not raw:
        return None

    chunks: list[str] = []
    remaining = raw
    while remaining and len(chunks) < MYMEMORY_MAX_CHUNKS:
        chunk = remaining[:480]
        if len(remaining) > 480:
            split_at = max(chunk.rfind("\n"), chunk.rfind(". "), chunk.rfind(" "))
            if split_at > 80:
                chunk = remaining[:split_at]
        chunks.append(chunk)
        remaining = remaining[len(chunk):].lstrip()

    translated_parts: list[str] = []
    started = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for chunk in chunks:
                if not chunk.strip():
                    continue
                resp = await client.get(
                    "https://api.mymemory.translated.net/get",
                    params={"q": chunk, "langpair": langpair},
                )
                if resp.status_code == 429:
                    return None
                resp.raise_for_status()
                data = resp.json()
                if str(data.get("responseStatus", "")) not in ("200", "200.0"):
                    return None
                part = (data.get("responseData") or {}).get("translatedText")
                if not part:
                    return None
                translated_parts.append(part)
    except Exception as exc:  # noqa: BLE001
        _log_provider_error(
            "mymemory",
            source,
            target,
            exc,
            duration_ms=int((time.monotonic() - started) * 1000),
        )
        return None

    return "".join(translated_parts) if translated_parts else None


async def _translate_with_providers(text: str, source: str, target: str) -> tuple[str | None, str]:
    """LibreTranslate then MyMemory — one pass, no Gemini."""
    if _use_libretranslate():
        started = time.monotonic()
        try:
            result = await libretranslate_client.translate_text(text, source, target)
            if result is not None:
                return result, "libretranslate"
        except Exception as exc:  # noqa: BLE001
            _log_provider_error(
                "libretranslate",
                source,
                target,
                exc,
                duration_ms=int((time.monotonic() - started) * 1000),
            )

    result = await _mymemory_translate(text, source, target)
    if result is not None:
        return result, "mymemory"

    return None, "none"


def _unavailable_response(
    original: str,
    *,
    source: str,
    target: str,
    fmt: str = "plain",
    reason: str = "none",
) -> dict[str, Any]:
    return {
        "text": original,
        "original": original,
        "source_lang": source,
        "target_lang": target,
        "same_language": False,
        "cached": False,
        "provider": "none",
        "unavailable": True,
        "reason": reason,
        "format": fmt,
    }


def _success_response(
    text: str,
    *,
    original: str,
    source: str,
    target: str,
    provider: str,
    cached: bool = False,
    fmt: str = "plain",
) -> dict[str, Any]:
    return {
        "text": text,
        "original": original,
        "source_lang": source,
        "target_lang": target,
        "same_language": False,
        "cached": cached,
        "provider": provider,
        "format": fmt,
    }


class _HtmlSegmentMarker(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.chunks: list[str] = []
        self.segments: list[str] = []

    def _append(self, value: str) -> None:
        if value:
            self.chunks.append(value)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        parts = [f"<{tag}"]
        for key, val in attrs:
            if val is None:
                parts.append(f" {key}")
            else:
                parts.append(f' {key}="{html.escape(val, quote=True)}"')
        parts.append(">")
        self._append("".join(parts))

    def handle_endtag(self, tag: str) -> None:
        self._append(f"</{tag}>")

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        parts = [f"<{tag}"]
        for key, val in attrs:
            if val is None:
                parts.append(f" {key}")
            else:
                parts.append(f' {key}="{html.escape(val, quote=True)}"')
        parts.append(" />")
        self._append("".join(parts))

    def handle_data(self, data: str) -> None:
        if not data:
            return
        if not data.strip():
            self._append(data)
            return
        idx = len(self.segments)
        self.segments.append(data)
        self._append(
            f'<span {HTML_MARKER_ATTR}="{idx}">{html.escape(data, quote=False)}</span>',
        )

    def handle_entityref(self, name: str) -> None:
        self._append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        self._append(f"&#{name};")


def mark_html_segments(raw_html: str) -> tuple[str, list[str]]:
    parser = _HtmlSegmentMarker()
    parser.feed(raw_html or "")
    parser.close()
    return "".join(parser.chunks), parser.segments


def inject_html_segments(marked_html: str, translated_segments: list[str]) -> str:
    def repl(match: re.Match[str]) -> str:
        idx = int(match.group(1))
        seg = translated_segments[idx] if 0 <= idx < len(translated_segments) else ""
        return html.escape(seg, quote=False)

    return HTML_MARKER_RE.sub(repl, marked_html or "")


def _html_to_plain(raw_html: str) -> str:
    plain = re.sub(r"<br\s*/?>", "\n", raw_html, flags=re.I)
    plain = re.sub(r"</p>", "\n\n", plain, flags=re.I)
    plain = re.sub(r"<[^>]+>", " ", plain)
    plain = re.sub(r"[ \t]+\n", "\n", plain)
    plain = re.sub(r"\n{3,}", "\n\n", plain)
    return re.sub(r" +", " ", plain).strip()


async def translate_text(
    text: str,
    target: str,
    *,
    source: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    field: str | None = None,
    client_key: str = "anon",
    skip_rate_limit: bool = False,
) -> dict[str, Any]:
    del client_key, skip_rate_limit  # kept for API compat

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

    cached = await _cache_lookup(
        src_hash, src_lang, target_lang,
        entity_type=entity_type, entity_id=entity_id, field=field, original=raw,
    )
    if cached:
        return cached

    translated, provider = await _translate_with_providers(raw, src_lang, target_lang)
    if translated is None or translated.strip() == raw.strip():
        return _unavailable_response(raw, source=src_lang, target=target_lang, reason=provider)

    await _store_translation(
        text=translated,
        source=src_lang,
        target=target_lang,
        src_hash=src_hash,
        provider=provider,
        entity_type=entity_type,
        entity_id=entity_id,
        field=field,
    )
    return _success_response(
        translated, original=raw, source=src_lang, target=target_lang, provider=provider,
    )


async def translate_html(
    raw_html: str,
    target: str,
    *,
    source: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    field: str | None = None,
    client_key: str = "anon",
) -> dict[str, Any]:
    """Translate HTML — preserve tags via packed segments + single provider call."""
    del client_key

    html_in = (raw_html or "").strip()
    if len(html_in) < MIN_TEXT_LEN:
        return {
            "text": raw_html or "",
            "original": raw_html or "",
            "source_lang": source or DEFAULT_SOURCE,
            "target_lang": normalize_lang(target),
            "same_language": True,
            "cached": False,
            "provider": "none",
            "format": "html",
        }

    target_lang = normalize_lang(target)
    sample = _html_to_plain(html_in)[:500]
    src_lang = normalize_lang(source) if source else await detect_source(sample or html_in)
    src_hash = text_hash(html_in)

    if src_lang == target_lang:
        return {
            "text": html_in,
            "original": html_in,
            "source_lang": src_lang,
            "target_lang": target_lang,
            "same_language": True,
            "cached": False,
            "provider": "none",
            "format": "html",
        }

    cached = await _cache_lookup(
        src_hash, src_lang, target_lang,
        entity_type=entity_type, entity_id=entity_id, field=field, original=html_in,
    )
    if cached:
        cached["format"] = "html"
        return cached

    marked, segments = mark_html_segments(html_in)

    if segments and len(segments) <= MAX_HTML_SEGMENTS:
        packed = pack_segments(segments)
        translated_packed, provider = await _translate_with_providers(packed, src_lang, target_lang)
        unpacked = unpack_segments(translated_packed or "", len(segments)) if translated_packed else None
        if unpacked and _segments_changed(segments, unpacked):
            out_html = inject_html_segments(marked, unpacked)
            await _store_translation(
                text=out_html,
                source=src_lang,
                target=target_lang,
                src_hash=src_hash,
                provider=provider,
                entity_type=entity_type,
                entity_id=entity_id,
                field=field,
            )
            return _success_response(
                out_html,
                original=html_in,
                source=src_lang,
                target=target_lang,
                provider=provider,
                fmt="html",
            )

    plain = _html_to_plain(html_in)
    plain_result = await translate_text(
        plain or html_in,
        target,
        source=src_lang,
        entity_type=entity_type,
        entity_id=entity_id,
        field=field,
    )
    if plain_result.get("unavailable"):
        return _unavailable_response(html_in, source=src_lang, target=target_lang, fmt="html")

    plain_result["format"] = "plain"
    plain_result["original"] = html_in
    return plain_result


async def translate_batch(
    items: list[dict[str, Any]],
    target: str,
    *,
    client_key: str = "anon",
) -> dict[str, Any]:
    target_lang = normalize_lang(target)
    out: dict[str, Any] = {}
    for item in items[:MAX_BATCH_ITEMS]:
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
