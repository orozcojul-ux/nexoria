"""Web UGC translation — news, forum, comments (LibreTranslate + Gemini fallback + cache)."""
from __future__ import annotations

import hashlib
import html
import json
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

_LOCAL_LT_URLS = frozenset({
    "http://127.0.0.1:5000",
    "http://localhost:5000",
})


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


def _rate_limit_key(client_key: str, entity_type: str | None, entity_id: str | None, field: str | None) -> str:
    """Per-field bucket so title + body on the same page can translate in parallel."""
    scope = f"{entity_type or 'text'}:{entity_id or 'anon'}:{field or 'body'}"
    return f"{client_key}:{scope}"


def _check_rate_limit(client_key: str, entity_type: str | None = None, entity_id: str | None = None, field: str | None = None) -> None:
    now = time.monotonic()
    key = _rate_limit_key(client_key, entity_type, entity_id, field)
    last = _rate_limit.get(key, 0.0)
    if now - last < USER_COOLDOWN_SECONDS:
        raise ValueError("rate_limited")
    _rate_limit[key] = now


async def _cache_get(key: str) -> dict[str, Any] | None:
    if _db is None or not key:
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
    if _db is None or not key:
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


def _use_libretranslate() -> bool:
    """Skip default localhost LibreTranslate — it is rarely running and adds ~15s timeouts."""
    if not libretranslate_client.is_configured():
        return False
    flag = os.environ.get("CONTENT_TRANSLATE_USE_LIBRETRANSLATE", "").strip().lower()
    if flag in ("0", "false", "no"):
        return False
    if flag in ("1", "true", "yes"):
        return True
    url = libretranslate_client.libretranslate_url().rstrip("/").lower()
    return url not in _LOCAL_LT_URLS


def _heuristic_source(text: str) -> str:
    sample = (text or "").strip()
    if not sample:
        return DEFAULT_SOURCE
    lower = sample.lower()
    padded = f" {lower} "
    french_hints = (
        " c'est ", " ceci ", " est un ", " est une ", " dans ", " pour ", " avec ",
        " cette ", " les ", " des ", " une ", " qu'", " nous ", " vous ", " traduction ",
        " annonce ", " actualité ", " bonjour ", " merci ", " joueur ",
    )
    if any(h in padded for h in french_hints):
        return DEFAULT_SOURCE
    if len(sample) <= 48 and lower in {"test", "update", "news", "event", "announcement", "hello", "hi"}:
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


async def _gemini_translate_html(html: str, source: str, target: str) -> str | None:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    model = os.environ.get("DISCORD_TRANSLATE_MODEL", "gemini/gemini-2.0-flash")
    source_name = TARGET_LANG_NAMES.get(source, source)
    target_name = TARGET_LANG_NAMES.get(target, source)
    system = (
        f"Tu es un traducteur professionnel pour NEXORIA (jeu RPG).\n"
        f"Traduis INTÉGRALEMENT du {source_name} vers le {target_name}.\n"
        "Conserve TOUTES les balises HTML exactement (<p>, <strong>, <mark>, <ul>, <li>, <br>, etc.).\n"
        "Traduis 100% du texte visible — aucune phrase ne doit rester dans la langue source.\n"
        "Ne traduis PAS : NEXORIA, Nexus, Écus, pseudos de joueurs, URLs.\n"
        "Retourne UNIQUEMENT le HTML traduit, sans commentaire ni markdown."
    )
    try:
        import litellm

        response = await litellm.acompletion(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": html},
            ],
            api_key=api_key,
            max_tokens=min(8000, max(512, len(html) * 2)),
            temperature=0.15,
        )
        out = str(response.choices[0].message.content or "").strip()
        if out.startswith("```"):
            out = re.sub(r"^```(?:html)?\s*", "", out)
            out = re.sub(r"\s*```$", "", out)
        return out or None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Content Gemini HTML translate failed (%s→%s): %s", source, target, str(exc)[:160])
        return None


async def _gemini_translate_text(text: str, source: str, target: str) -> str | None:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    model = os.environ.get("DISCORD_TRANSLATE_MODEL", "gemini/gemini-2.0-flash")
    source_name = TARGET_LANG_NAMES.get(source, source)
    target_name = TARGET_LANG_NAMES.get(target, target)
    system = (
        f"Tu es un traducteur professionnel pour NEXORIA (jeu RPG).\n"
        f"Traduis INTÉGRALEMENT du {source_name} vers le {target_name}.\n"
    )
    if "[[[SEG:" in text:
        system += (
            "Conserve EXACTEMENT les marqueurs [[[SEG:n]]] et [[[/SEG:n]]] sans les modifier.\n"
            "Traduis TOUT le texte entre les marqueurs — aucun fragment ne reste dans la langue source.\n"
        )
    else:
        system += (
            "Conserve le Markdown, les emojis, les retours à la ligne.\n"
        )
    system += (
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


async def _mymemory_translate(text: str, source: str, target: str) -> str | None:
    """Free public fallback when LibreTranslate / Gemini are unavailable."""
    import httpx

    langpair = f"{source}|{target}"
    if target == "pt":
        langpair = f"{source}|pt-BR"

    chunks: list[str] = []
    remaining = text
    while remaining:
        chunk = remaining[:480]
        if len(remaining) > 480:
            split_at = max(chunk.rfind("\n"), chunk.rfind(". "), chunk.rfind(" "))
            if split_at > 80:
                chunk = remaining[:split_at]
        chunks.append(chunk)
        remaining = remaining[len(chunk):].lstrip()

    translated_parts: list[str] = []
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            for chunk in chunks:
                if not chunk.strip():
                    continue
                resp = await client.get(
                    "https://api.mymemory.translated.net/get",
                    params={"q": chunk, "langpair": langpair},
                )
                resp.raise_for_status()
                data = resp.json()
                if str(data.get("responseStatus", "")) not in ("200", "200.0"):
                    return None
                part = (data.get("responseData") or {}).get("translatedText")
                if not part:
                    return None
                translated_parts.append(part)
    except Exception as exc:  # noqa: BLE001
        logger.warning("MyMemory translate failed (%s→%s): %s", source, target, str(exc)[:160])
        return None

    return "".join(translated_parts) if translated_parts else None


async def _translate_with_providers(text: str, source: str, target: str) -> tuple[str | None, str]:
    if os.environ.get("GEMINI_API_KEY", "").strip():
        result = await _gemini_translate_text(text, source, target)
        if result is not None:
            return result, "gemini"
    if _use_libretranslate():
        result = await libretranslate_client.translate_text(text, source, target)
        if result is not None:
            return result, "libretranslate"
    result = await _mymemory_translate(text, source, target)
    if result is not None:
        return result, "mymemory"
    return None, "none"


HTML_MARKER_ATTR = "data-nx-tx"
HTML_MARKER_RE = re.compile(
    rf'<span {HTML_MARKER_ATTR}="(\d+)">.*?</span>',
    re.DOTALL,
)
MAX_HTML_SEGMENTS = 80
SEG_PACK_RE = re.compile(
    r"\[\[\[SEG:(\d+)\]\]\](.*?)\[\[\[/SEG:\1\]\]\]",
    re.DOTALL,
)


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


class _HtmlSegmentMarker(HTMLParser):
    """Split HTML into a fixed template + translatable text segments."""

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

    def marked_html(self) -> str:
        return "".join(self.chunks)


def mark_html_segments(raw_html: str) -> tuple[str, list[str]]:
    parser = _HtmlSegmentMarker()
    parser.feed(raw_html or "")
    parser.close()
    return parser.marked_html(), parser.segments


def inject_html_segments(marked_html: str, translated_segments: list[str]) -> str:
    def repl(match: re.Match[str]) -> str:
        idx = int(match.group(1))
        text = translated_segments[idx] if 0 <= idx < len(translated_segments) else ""
        return html.escape(text, quote=False)

    return HTML_MARKER_RE.sub(repl, marked_html or "")


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
    """Translate HTML while preserving tags, bold, highlights and block structure."""
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

    _check_rate_limit(client_key, entity_type, entity_id, field)

    marked, segments = mark_html_segments(html_in)
    if not segments:
        return await translate_text(
            html_in,
            target,
            source=source,
            entity_type=entity_type,
            entity_id=entity_id,
            field=field,
            client_key=client_key,
            skip_rate_limit=True,
        )

    if len(segments) > MAX_HTML_SEGMENTS:
        plain = re.sub(r"<[^>]+>", " ", html_in)
        plain = re.sub(r"\s+", " ", plain).strip()
        result = await translate_text(
            plain,
            target,
            source=source,
            entity_type=entity_type,
            entity_id=entity_id,
            field=field,
            client_key=client_key,
            skip_rate_limit=True,
        )
        result["format"] = "plain"
        return result

    target_lang = normalize_lang(target)
    sample = " ".join(s.strip() for s in segments[:3] if s.strip())
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

    cache_key = make_cache_key(entity_type, entity_id, field, src_lang, target_lang, src_hash)
    cached = await _cache_get(cache_key)
    if cached and cached.get("text"):
        cached_text = str(cached["text"])
        stale_plain = "<" not in cached_text and bool(re.search(r"<[a-z]", html_in, re.I))
        if not stale_plain:
            return {
                "text": cached_text,
                "original": html_in,
                "source_lang": src_lang,
                "target_lang": target_lang,
                "same_language": False,
                "cached": True,
                "provider": cached.get("provider") or "cache",
                "format": "html",
            }

    gemini_html = await _gemini_translate_html(html_in, src_lang, target_lang)
    if gemini_html and gemini_html.strip() != html_in.strip():
        await _cache_set(
            cache_key,
            text=gemini_html,
            source=src_lang,
            target=target_lang,
            src_hash=src_hash,
            provider="gemini-html",
            entity_type=entity_type,
            entity_id=entity_id,
            field=field,
        )
        return {
            "text": gemini_html,
            "original": html_in,
            "source_lang": src_lang,
            "target_lang": target_lang,
            "same_language": False,
            "cached": False,
            "provider": "gemini-html",
            "format": "html",
        }

    if segments:
        packed = pack_segments(segments)
        packed_out, pack_provider = await _translate_with_providers(packed, src_lang, target_lang)
        unpacked = unpack_segments(packed_out or "", len(segments)) if packed_out else None
        if unpacked and _segments_changed(segments, unpacked):
            out_html = inject_html_segments(marked, unpacked)
            await _cache_set(
                cache_key,
                text=out_html,
                source=src_lang,
                target=target_lang,
                src_hash=src_hash,
                provider=pack_provider,
                entity_type=entity_type,
                entity_id=entity_id,
                field=field,
            )
            return {
                "text": out_html,
                "original": html_in,
                "source_lang": src_lang,
                "target_lang": target_lang,
                "same_language": False,
                "cached": False,
                "provider": pack_provider,
                "format": "html",
            }

    translated_segments: list[str] = []
    providers: set[str] = set()
    for idx, segment in enumerate(segments):
        seg_field = f"{field}_seg{idx}" if field else f"seg{idx}"
        seg_result = await translate_text(
            segment,
            target,
            source=src_lang,
            entity_type=entity_type,
            entity_id=entity_id,
            field=seg_field,
            client_key=client_key,
            skip_rate_limit=True,
        )
        if seg_result.get("unavailable"):
            seg_text = segment
        else:
            seg_text = seg_result.get("text") or segment
        if seg_text.strip() == segment.strip() and src_lang != target_lang:
            gemini_seg = await _gemini_translate_text(segment, src_lang, target_lang)
            if gemini_seg and gemini_seg.strip() != segment.strip():
                seg_text = gemini_seg
        translated_segments.append(seg_text)
        provider = seg_result.get("provider")
        if provider:
            providers.add(str(provider))

    out_html = inject_html_segments(marked, translated_segments)
    provider = "mixed" if len(providers) > 1 else (next(iter(providers)) if providers else "none")

    await _cache_set(
        cache_key,
        text=out_html,
        source=src_lang,
        target=target_lang,
        src_hash=src_hash,
        provider=provider,
        entity_type=entity_type,
        entity_id=entity_id,
        field=field,
    )
    return {
        "text": out_html,
        "original": html_in,
        "source_lang": src_lang,
        "target_lang": target_lang,
        "same_language": False,
        "cached": False,
        "provider": provider,
        "format": "html",
    }


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
    """Translate a text segment with cache + provider chain."""
    if not skip_rate_limit:
        _check_rate_limit(client_key, entity_type, entity_id, field)

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

    if translated.strip() == raw.strip() and src_lang != target_lang:
        gemini_retry = await _gemini_translate_text(raw, src_lang, target_lang)
        if gemini_retry and gemini_retry.strip() != raw.strip():
            translated = gemini_retry
            provider = "gemini-retry"

    if translated.strip() == raw.strip() and src_lang != target_lang:
        return {
            "text": raw,
            "original": raw,
            "source_lang": src_lang,
            "target_lang": target_lang,
            "same_language": False,
            "cached": False,
            "provider": provider,
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
    batch_items = items[:12]
    if batch_items:
        first = batch_items[0]
        _check_rate_limit(
            client_key,
            first.get("entity_type"),
            first.get("entity_id"),
            first.get("field"),
        )
    for item in batch_items:
        key = str(item.get("key") or "text")
        out[key] = await translate_text(
            str(item.get("text") or ""),
            target_lang,
            source=item.get("source_lang"),
            entity_type=item.get("entity_type"),
            entity_id=item.get("entity_id"),
            field=item.get("field") or key,
            client_key=client_key,
            skip_rate_limit=True,
        )
    return {"target_lang": target_lang, "items": out}
