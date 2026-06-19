"""Traductions prédéfinies pour les embeds Discord NEXORIA (salons épinglés)."""
from __future__ import annotations

import os
import re
from copy import deepcopy
from typing import Any

SITE_URL = os.environ.get("FRONTEND_URL", "https://nexoria.gg").rstrip("/")

FOOTER_FR = "NEXORIA — forge ta légende"

# Clé = titre français exact de l'embed (1er embed du message)
I18N_BY_FR_TITLE: dict[str, dict[str, dict[str, str]]] = {
    "🌌 Chroniques du Nexus": {
        "en": {
            "title": "🌌 Nexus Chronicles",
            "description": (
                "Automatic feed of major realm activity: "
                "logins, sign-ups, logouts, and hero renames.\n\n"
                "Each line reflects live activity on NEXORIA."
            ),
        },
        "es": {
            "title": "🌌 Crónicas del Nexus",
            "description": (
                "Flujo automático de la actividad principal del reino: "
                "conexiones, inscripciones, desconexiones y cambios de nombre de héroes.\n\n"
                "Cada línea refleja la actividad en directo en NEXORIA."
            ),
        },
        "de": {
            "title": "🌌 Chroniken des Nexus",
            "description": (
                "Automatischer Feed der wichtigsten Aktivitäten im Reich: "
                "Anmeldungen, Registrierungen, Abmeldungen und Heldennamen-Änderungen.\n\n"
                "Jede Zeile spiegelt die Live-Aktivität auf NEXORIA wider."
            ),
        },
    },
    "🌟 Bienvenue sur Nexoria": {
        "en": {
            "title": "🌟 Welcome to Nexoria",
            "description": (
                "The kingdom's portal opens its gates to you.\n\n"
                "• Read the **rules** before you set out\n"
                "• Check **announcements** so you don't miss anything\n"
                "• Join the adventure on the site and forge your legend\n\n"
                f"🔗 **Website:** {SITE_URL}"
            ),
        },
    },
    "📜 Règlement du royaume": {
        "en": {
            "title": "📜 Realm rules",
            "description": (
                "**Respect & community**\n"
                "Treat every hero with respect. No discrimination, harassment, or spam.\n\n"
                "**Content**\n"
                "No illegal, NSFW, or toxic content. Stay within Nexoria's fantasy universe.\n\n"
                "**Fair play**\n"
                "No cheating, exploits, or bug abuse. Report them to the Council.\n\n"
                "**Discord ↔ Site**\n"
                "Your Discord username and Nexoria hero must stay consistent. "
                "Discord sanctions may affect your site account."
            ),
        },
    },
    "📢 Annonces officielles": {
        "en": {
            "title": "📢 Official announcements",
            "description": (
                "Channel reserved for **official announcements** from the Nexoria team.\n\n"
                "Major updates, events, maintenance, shop news… "
                "Enable notifications so you don't miss anything."
            ),
        },
    },
    "❓ FAQ — Questions fréquentes": {
        "en": {
            "title": "❓ FAQ — Frequently asked questions",
            "description": (
                "**How do I create my hero?**\n"
                f"Sign up at {SITE_URL} and choose your class.\n\n"
                "**How do I link Discord?**\n"
                "Settings → Account → Connect Discord.\n\n"
                "**What are Éclats?**\n"
                "The realm's currency — earned by playing or via the shop.\n\n"
                "**Ascendant Pass (VIP)?**\n"
                "Premium perks: exclusive shop, XP/Éclats bonuses, VIP lounge…"
            ),
        },
    },
    "🏅 Rôles & titres": {
        "en": {
            "title": "🏅 Roles & titles",
            "description": (
                "**Automatic** channel — every hero level-up is announced here.\n\n"
                "Progression tiers (Novice → Cosmic Chosen) sync with your Discord roles. "
                "Keep adventuring on the site!"
            ),
        },
    },
    "📊 XP & progression": {
        "en": {
            "title": "📊 XP & progression",
            "description": (
                "**Automatic** channel — XP, Éclats, reputation, badges, "
                "shop purchases, and quest rewards.\n\n"
                "Every feat on the site may leave a trace here."
            ),
        },
    },
    "🌀 Failles dimensionnelles": {
        "en": {
            "title": "🌀 Dimensional rifts",
            "description": (
                "**Automatic** channel — alerts when a rift opens in the realm.\n\n"
                "Log in quickly on the site to claim rewards before it closes!"
            ),
        },
    },
    "🧪 Beta test — Remontées de bugs": {
        "en": {
            "title": "🧪 Beta test — Bug reports",
            "description": (
                "Channel **reserved for Beta testers** and staff.\n\n"
                "**⚠️ Current beta scope**\n"
                "For now, testing covers **the Nexoria website only** "
                "(sign-up, profile, forum, shop, quests…).\n\n"
                "**Nexus Online** (virtual world / MMO) **is not developed at all** — "
                "no zones or gameplay are available.\n\n"
                "Report **website bugs** here with: steps, browser, screenshot if possible."
            ),
        },
    },
    "👑 Salon VIP — Pass Ascendant": {
        "en": {
            "title": "👑 VIP Lounge — Ascendant Pass",
            "description": (
                "Exclusive space for **Ascendant Pass** holders.\n\n"
                "VIP shop, referral bonuses, exclusive quests, and premium mutual help."
            ),
        },
    },
}

FOOTER_I18N: dict[str, dict[str, str]] = {
    FOOTER_FR: {
        "en": "NEXORIA — forge your legend",
        "es": "NEXORIA — forja tu leyenda",
        "de": "NEXORIA — Schmiede deine Legende",
        "it": "NEXORIA — forgia la tua leggenda",
        "pt": "NEXORIA — forje sua lenda",
        "nl": "NEXORIA — smeed je legende",
        "ja": "NEXORIA — 伝説を築け",
    },
}


def _extract_site_url(text: str) -> str:
    match = re.search(r"https?://[^\s<>)\]]+", text or "")
    return match.group(0) if match else SITE_URL


def lookup_i18n(payload: dict[str, Any], target: str, source: str = "fr") -> dict[str, Any] | None:
    """Retourne une traduction prédéfinie si le message correspond à un template connu."""
    if target == source:
        return deepcopy(payload)

    embeds = payload.get("embeds") or []
    if not embeds:
        return None

    fr_title = (embeds[0].get("title") or "").strip()
    template = I18N_BY_FR_TITLE.get(fr_title)
    if not template or target not in template:
        return None

    block = template[target]
    site_url = _extract_site_url(embeds[0].get("description") or "")

    out = deepcopy(payload)
    for i, emb in enumerate(out.get("embeds") or []):
        if i == 0:
            if block.get("title"):
                emb["title"] = block["title"]
            desc = block.get("description") or emb.get("description") or ""
            if "{site_url}" in desc:
                desc = desc.replace("{site_url}", site_url)
            emb["description"] = desc
        fr_footer = (emb.get("footer") or FOOTER_FR).strip()
        emb["footer"] = FOOTER_I18N.get(fr_footer, {}).get(target, fr_footer)

    return out
