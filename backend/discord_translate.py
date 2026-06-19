"""Discord message translation — flag buttons + Interactions API.

Messages bot are published in French (source). Flag buttons translate to other
languages via LLM (Gemini / Anthropic) with structured embed responses.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from copy import deepcopy
from typing import Any

import httpx

logger = logging.getLogger("nexoria.discord_translate")

DISCORD_API = "https://discord.com/api/v10"
DEFAULT_SOURCE_LANG = "fr"

TRANSLATE_LANGS: list[dict[str, str]] = [
    {"code": "fr", "label": "française", "label_full": "Français", "flag": "🇫🇷"},
    {"code": "en", "label": "anglaise", "label_full": "English", "flag": "🇬🇧"},
    {"code": "es", "label": "espagnole", "label_full": "Español", "flag": "🇪🇸"},
    {"code": "de", "label": "allemande", "label_full": "Deutsch", "flag": "🇩🇪"},
    {"code": "it", "label": "italienne", "label_full": "Italiano", "flag": "🇮🇹"},
    {"code": "pt", "label": "portugaise (Brésil)", "label_full": "Português", "flag": "🇧🇷"},
    {"code": "nl", "label": "néerlandaise", "label_full": "Nederlands", "flag": "🇳🇱"},
    {"code": "ja", "label": "japonaise", "label_full": "日本語", "flag": "🇯🇵"},
]

LANG_CODES = {lang["code"] for lang in TRANSLATE_LANGS}

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


def flag_component_rows() -> list[dict]:
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


def _cache_doc_id(message_id: str, target: str, source_hash: str) -> str:
    return f"{message_id}:{target}:{source_hash}"


def _translation_provider() -> tuple[str, str, str | None]:
    """Returns (model, provider_name, api_key)."""
    gemini = os.environ.get("GEMINI_API_KEY", "").strip()
    if gemini:
        return os.environ.get("DISCORD_TRANSLATE_MODEL", "gemini/gemini-2.0-flash"), "gemini", gemini
    emergent = os.environ.get("EMERGENT_LLM_KEY", "").strip()
    anthropic = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    key = emergent or anthropic
    if key:
        model = os.environ.get(
            "DISCORD_TRANSLATE_MODEL",
            os.environ.get("ORACLE_MODEL", "anthropic/claude-sonnet-4-20250514"),
        )
        return model, "anthropic", key
    return "", "", None


def _translation_system_prompt(target: str, source: str) -> str:
    target_name = TARGET_LANG_PROMPT.get(target, target)
    source_name = TARGET_LANG_PROMPT.get(source, source)
    return (
        f"Tu es un traducteur professionnel pour NEXORIA (jeu RPG communautaire).\n"
        f"Traduis fidèlement le JSON source du {source_name} vers le {target_name}.\n\n"
        "Règles strictes :\n"
        "- Conserve le Markdown Discord (**gras**, *italique*, listes, liens).\n"
        "- Conserve les emojis tels quels.\n"
        "- Ne traduis PAS : NEXORIA, Nexus Online, Discord, Éclats, Smouzyi, noms de joueurs, "
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


async def _translate_with_llm(payload: dict[str, Any], target: str, source: str) -> dict[str, Any] | None:
    model, provider, api_key = _translation_provider()
    if not model or not api_key:
        logger.warning(
            "Discord translation unavailable: no provider (message_id cache miss, target=%s)",
            target,
        )
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
                "Discord translation LLM invalid JSON (provider=%s, target=%s)",
                provider,
                target,
            )
            return None
        return _normalize_translated_payload(parsed, payload)
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Discord translation LLM failed (provider=%s, target=%s): %s",
            provider,
            target,
            str(exc)[:200],
        )
        return None


async def translate_payload(
    payload: dict[str, Any],
    target: str,
    source: str,
    *,
    message_id: str = "",
) -> dict[str, Any] | None:
    if target == source:
        return deepcopy(payload)

    src_hash = payload_source_hash(payload)
    cache_id = _cache_doc_id(message_id, target, src_hash) if message_id else None

    if _db is not None and cache_id:
        cached = await _db.translation_cache.find_one({"_id": cache_id}, {"payload": 1})
        if cached and cached.get("payload"):
            return cached["payload"]

    translated = await _translate_with_llm(payload, target, source)
    if translated is None:
        return None

    if _db is not None and cache_id:
        try:
            await _db.translation_cache.update_one(
                {"_id": cache_id},
                {"$set": {
                    "_id": cache_id,
                    "message_id": message_id,
                    "target_language": target,
                    "source_hash": src_hash,
                    "source_lang": source,
                    "payload": translated,
                    "provider": _translation_provider()[1],
                }},
                upsert=True,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("translation cache write failed: %s", exc)

    return translated


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
        "title": f"{tgt['flag']} Traduction {tgt['label']}"[:256],
        "description": description or "—",
        "color": 0x7C3AED,
        "footer": {"text": footer_text[:2048]},
    }
    if embed_fields:
        embed["fields"] = embed_fields[:25]
    return embed


def _ephemeral_response(*, content: str = "", embeds: list | None = None) -> dict:
    data: dict[str, Any] = {"flags": 64}
    if embeds:
        data["embeds"] = embeds[:10]
    if content:
        data["content"] = content[:2000]
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
    source_lang = DEFAULT_SOURCE_LANG
    payload: dict[str, Any] | None = None

    if _db is not None:
        doc = await _db.discord_translatable_messages.find_one({"message_id": message_id})
        if doc:
            source_lang = doc.get("source_lang") or DEFAULT_SOURCE_LANG
            payload = parse_discord_message({
                "content": doc.get("content") or "",
                "embeds": doc.get("embeds") or [],
            })

    if not payload or not (payload.get("content") or payload.get("embeds")):
        msg = interaction_message or await fetch_discord_message(channel_id, message_id)
        if msg:
            payload = parse_discord_message(msg)
            source_lang = DEFAULT_SOURCE_LANG
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


async def handle_component_interaction(payload: dict) -> dict:
    custom_id = (payload.get("data") or {}).get("custom_id") or ""
    if not custom_id.startswith("tr:"):
        return _ephemeral_response(content="Action inconnue.")

    target = custom_id.split(":", 1)[1].lower()
    if target not in LANG_CODES:
        return _ephemeral_response(content="Langue non prise en charge.")

    message = payload.get("message") or {}
    message_id = str(message.get("id") or "")
    channel_id = str(payload.get("channel_id") or message.get("channel_id") or "")
    if not message_id or not channel_id:
        return _ephemeral_response(content="Message introuvable.")

    source_payload, source_lang = await resolve_source_payload(message_id, channel_id, message)
    if not _payload_has_text(source_payload):
        return _ephemeral_response(content="Aucun contenu à traduire dans ce message.")

    if target == source_lang:
        embed = {
            "title": f"{lang_meta('fr')['flag']} Français",
            "description": "Ce message est déjà en français.",
            "color": 0x5865F2,
        }
        return _ephemeral_response(embeds=[embed])

    translated = await translate_payload(
        source_payload,
        target,
        source_lang,
        message_id=message_id,
    )
    if translated is None:
        logger.warning(
            "Discord translation failed message_id=%s target=%s provider=%s",
            message_id,
            target,
            _translation_provider()[1] or "none",
        )
        return _ephemeral_response(content="Traduction indisponible pour le moment.")

    embed = build_translation_embed(translated, target, source_lang)
    return _ephemeral_response(embeds=[embed])


async def handle_interaction(body: bytes) -> dict:
    data = json.loads(body)
    itype = data.get("type")
    if itype == 1:
        return {"type": 1}
    if itype == 3:
        return await handle_component_interaction(data)
    return _ephemeral_response(content="Interaction non prise en charge.")


def attach_translate_components(payload: dict) -> dict:
    payload = dict(payload)
    payload["components"] = flag_component_rows()
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
