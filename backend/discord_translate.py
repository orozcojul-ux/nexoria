"""Discord message translation — flag buttons + Interactions API.

Bot messages include flag buttons. Clicking one returns an ephemeral translation
in the chosen language (FR, EN, ES, DE, IT, PT, NL, JA).
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from typing import Any

import httpx

logger = logging.getLogger("nexoria.discord_translate")

DISCORD_API = "https://discord.com/api/v10"

# Languages offered on Discord messages (matches site LANGS).
TRANSLATE_LANGS: list[dict[str, str]] = [
    {"code": "fr", "label": "Français", "flag": "🇫🇷"},
    {"code": "en", "label": "English", "flag": "🇬🇧"},
    {"code": "es", "label": "Español", "flag": "🇪🇸"},
    {"code": "de", "label": "Deutsch", "flag": "🇩🇪"},
    {"code": "it", "label": "Italiano", "flag": "🇮🇹"},
    {"code": "pt", "label": "Português", "flag": "🇧🇷"},
    {"code": "nl", "label": "Nederlands", "flag": "🇳🇱"},
    {"code": "ja", "label": "日本語", "flag": "🇯🇵"},
]

MYMEMORY_LANG = {
    "fr": "fr", "en": "en", "es": "es", "de": "de",
    "it": "it", "pt": "pt", "nl": "nl", "ja": "ja",
}

_db = None


def init(db) -> None:
    global _db
    _db = db


def public_key_hex() -> str:
    return os.environ.get("DISCORD_PUBLIC_KEY", "").strip()


def bot_token() -> str:
    return os.environ.get("DISCORD_BOT_TOKEN", "").strip()


def flag_component_rows() -> list[dict]:
    """Discord action rows — up to 5 buttons each."""
    rows: list[dict] = []
    row: list[dict] = []
    for lang in TRANSLATE_LANGS:
        row.append({
            "type": 2,
            "style": 2,  # secondary (grey)
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
    """Verify Discord Ed25519 signature (Interactions endpoint)."""
    pk = public_key_hex()
    if not pk or not signature_hex or not timestamp:
        return not pk  # skip verify when key not configured (dev)
    try:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
        pub = Ed25519PublicKey.from_public_bytes(bytes.fromhex(pk))
        pub.verify(bytes.fromhex(signature_hex), timestamp.encode() + body)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("Discord interaction signature invalid: %s", exc)
        return False


def extract_message_text(message: dict) -> tuple[str, list[dict]]:
    """Flatten message content + embeds into translatable plain text."""
    parts: list[str] = []
    content = (message.get("content") or "").strip()
    if content:
        parts.append(content)
    embeds = message.get("embeds") or []
    for emb in embeds:
        if emb.get("title"):
            parts.append(str(emb["title"]))
        if emb.get("description"):
            parts.append(str(emb["description"]))
        for field in emb.get("fields") or []:
            name = field.get("name") or ""
            value = field.get("value") or ""
            if name or value:
                parts.append(f"{name}\n{value}".strip())
    return "\n\n".join(parts).strip(), embeds


def _cache_key(text: str, source: str, target: str) -> str:
    digest = hashlib.sha256(f"{source}|{target}|{text}".encode()).hexdigest()
    return digest


async def _translate_chunk(text: str, target: str, source: str) -> str:
    src = MYMEMORY_LANG.get(source, source)
    tgt = MYMEMORY_LANG.get(target, target)
    if src == tgt:
        return text
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.get(
                "https://api.mymemory.translated.net/get",
                params={"q": text[:480], "langpair": f"{src}|{tgt}"},
            )
            if r.status_code != 200:
                return text
            data = r.json()
            translated = (data.get("responseData") or {}).get("translatedText") or text
            if str(translated).upper().startswith("QUERY LENGTH"):
                return text
            return str(translated)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Translation API error: %s", exc)
        return text


async def translate_text(text: str, target: str, source: str = "en") -> str:
    if not text or not text.strip():
        return text
    if target == source:
        return text

    key = _cache_key(text, source, target)
    if _db is not None:
        cached = await _db.translation_cache.find_one({"key": key}, {"text": 1})
        if cached and cached.get("text"):
            return cached["text"]

    # Split on paragraph boundaries for MyMemory 500-char limit.
    paragraphs = re.split(r"(\n\n+)", text)
    out: list[str] = []
    buf = ""
    for part in paragraphs:
        if re.fullmatch(r"\n+", part or ""):
            out.append(part)
            continue
        candidate = (buf + part) if buf else part
        if len(candidate) > 450:
            if buf:
                out.append(await _translate_chunk(buf, target, source))
                buf = ""
            if len(part) > 450:
                sentences = re.split(r"(?<=[.!?])\s+", part)
                chunk = ""
                for sent in sentences:
                    if len(chunk) + len(sent) > 450 and chunk:
                        out.append(await _translate_chunk(chunk, target, source))
                        chunk = sent
                    else:
                        chunk = f"{chunk} {sent}".strip() if chunk else sent
                if chunk:
                    out.append(await _translate_chunk(chunk, target, source))
            else:
                buf = part
        else:
            buf = candidate
    if buf:
        out.append(await _translate_chunk(buf, target, source))

    result = "".join(out) if out else text

    if _db is not None and result and result != text:
        try:
            await _db.translation_cache.update_one(
                {"key": key},
                {"$set": {"text": result, "source": source, "target": target}},
                upsert=True,
            )
        except Exception:  # noqa: BLE001
            pass
    return result


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
    source_lang: str = "en",
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
            }},
            upsert=True,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("register_message failed: %s", exc)


async def resolve_source_text(message_id: str, channel_id: str, interaction_message: dict | None) -> tuple[str, str]:
    source_lang = "en"
    if _db is not None:
        doc = await _db.discord_translatable_messages.find_one({"message_id": message_id})
        if doc:
            source_lang = doc.get("source_lang") or "en"
            text = (doc.get("content") or "").strip()
            if not text and doc.get("embeds"):
                text, _ = extract_message_text({"embeds": doc["embeds"]})
            if text:
                return text, source_lang

    msg = interaction_message
    if not msg:
        msg = await fetch_discord_message(channel_id, message_id)
    if not msg:
        return "", source_lang
    text, _ = extract_message_text(msg)
    if _db is not None and text:
        await register_message(message_id, channel_id, content=msg.get("content") or "", embeds=msg.get("embeds"), source_lang=source_lang)
    return text, source_lang


def _lang_label(code: str) -> str:
    for lang in TRANSLATE_LANGS:
        if lang["code"] == code:
            return f"{lang['flag']} {lang['label']}"
    return code.upper()


async def handle_component_interaction(payload: dict) -> dict:
    custom_id = (payload.get("data") or {}).get("custom_id") or ""
    if not custom_id.startswith("tr:"):
        return {"type": 4, "data": {"content": "Unknown action.", "flags": 64}}

    target = custom_id.split(":", 1)[1].lower()
    if target not in MYMEMORY_LANG:
        return {"type": 4, "data": {"content": "Unsupported language.", "flags": 64}}

    message = payload.get("message") or {}
    message_id = str(message.get("id") or "")
    channel_id = str(payload.get("channel_id") or message.get("channel_id") or "")
    if not message_id or not channel_id:
        return {"type": 4, "data": {"content": "Message not found.", "flags": 64}}

    source_text, source_lang = await resolve_source_text(message_id, channel_id, message)
    if not source_text:
        return {"type": 4, "data": {"content": "Nothing to translate in this message.", "flags": 64}}

    if target == source_lang:
        body = source_text
    else:
        body = await translate_text(source_text, target, source_lang)

    header = f"**{_lang_label(target)}**"
    if target != source_lang:
        header += f" _(from {_lang_label(source_lang)})_"
    reply = f"{header}\n\n{body}"[:2000]

    return {"type": 4, "data": {"content": reply, "flags": 64}}


async def handle_interaction(body: bytes) -> dict:
    data = json.loads(body)
    itype = data.get("type")
    if itype == 1:  # PING
        return {"type": 1}
    if itype == 3:  # MESSAGE_COMPONENT
        return await handle_component_interaction(data)
    return {"type": 4, "data": {"content": "Unsupported interaction.", "flags": 64}}


def attach_translate_components(payload: dict) -> dict:
    """Add flag button rows to an outgoing Discord message payload."""
    payload = dict(payload)
    payload["components"] = flag_component_rows()
    return payload


async def after_post(channel_id: str, message: dict, *, source_lang: str = "en") -> None:
    """Register a posted message for translation metadata."""
    if not message.get("id"):
        return
    await register_message(
        str(message["id"]),
        channel_id,
        content=message.get("content") or "",
        embeds=message.get("embeds") or [],
        source_lang=source_lang,
    )
