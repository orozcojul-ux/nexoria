"""Nexus Online gate — separate from global site maintenance."""
from __future__ import annotations

import os

DEFAULT_ONLINE_GATE_HTML = {
    "brand_tagline": "LA COMMUNAUTÉ AVANT TOUT",
    "badge": "Nexus fermé",
    "title": "Le Nexus\nse repose",
    "body": (
        "Le serveur Nexus n'est pas ouvert en permanence. Les Sentinelles l'ouvrent "
        "lors des rassemblements et événements communautaires."
    ),
    "body_sub": "Le reste du site reste accessible. Rejoignez le Discord pour la prochaine ouverture.",
    "discord_label": "Rejoindre la communauté",
    "footer": "NEXORIA — Unis dans l'éternité",
}


def _normalize_text(raw: str, max_len: int = 500, preserve_breaks: bool = False) -> str:
    import re
    if not raw:
        return ""
    text = str(raw)[:max_len]
    if preserve_breaks:
        lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in text.replace("\r\n", "\n").split("\n")]
        return "\n".join([ln for ln in lines if ln])
    return re.sub(r"\s+", " ", text).strip()


def online_gate_html(doc: dict) -> dict:
    stored = doc.get("html") if isinstance(doc.get("html"), dict) else {}
    merged = {**DEFAULT_ONLINE_GATE_HTML, **(stored or {})}
    out = {}
    for key in DEFAULT_ONLINE_GATE_HTML:
        raw = merged.get(key, DEFAULT_ONLINE_GATE_HTML.get(key, ""))
        out[key] = _normalize_text(raw, preserve_breaks=(key == "title")) or DEFAULT_ONLINE_GATE_HTML.get(key, "")
    return out


async def get_online_gate(db) -> dict:
    doc = await db.system_settings.find_one({"key": "online_gate"}, {"_id": 0})
    base = {"open": True, "html": {}, "updated_at": None}
    if not doc:
        return base
    return {**base, **{k: v for k, v in doc.items() if k != "key"}}


async def is_online_open(db) -> bool:
    doc = await get_online_gate(db)
    return bool(doc.get("open", True))


async def nexus_access_for_user(db, user: dict) -> tuple[bool, str]:
    """Whether this user may enter the Nexus realtime server."""
    if user.get("role") in ("admin", "moderator"):
        return True, ""
    if await is_online_open(db):
        return True, ""
    doc = await get_online_gate(db)
    html = online_gate_html(doc)
    return False, html.get("body") or "Le serveur Nexus est fermé pour le moment."
