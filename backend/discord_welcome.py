"""NEXORIA — Discord member welcome embed (GUILD_MEMBER_ADD via discord_gateway).

Requires privileged Gateway Intent: GUILD_MEMBERS (Server Members Intent).
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

import httpx

from discord_sync import DISCORD_API, _build_avatar_url, _headers

logger = logging.getLogger("nexoria.discord_welcome")

DEFAULT_WELCOME_CHANNEL_ID = "1514271114405216359"
EMBED_COLOR = 0x7C3AED  # violet NEXORIA

_db = None
_recent_welcomes: set[str] = set()


def init(db) -> None:
    """Bind MongoDB for persistent welcome deduplication."""
    global _db
    _db = db


def welcome_channel_id() -> str:
    return os.environ.get("DISCORD_WELCOME_CHANNEL_ID", DEFAULT_WELCOME_CHANNEL_ID).strip()


def is_welcome_enabled() -> bool:
    return os.environ.get("DISCORD_WELCOME_ENABLED", "1").strip().lower() not in (
        "0", "false", "off", "no",
    )


def _default_avatar_url(user_id: str, discriminator: str | None = None) -> str:
    try:
        if discriminator and discriminator != "0":
            index = int(discriminator) % 5
        else:
            index = (int(user_id) >> 22) % 6
    except (ValueError, TypeError):
        index = 0
    return f"https://cdn.discordapp.com/embed/avatars/{index % 6}.png"


def member_avatar_url(member: dict) -> str:
    user = member.get("user") or member
    url = _build_avatar_url(user)
    if url:
        return url
    uid = user.get("id", "0")
    return _default_avatar_url(uid, user.get("discriminator"))


def build_welcome_embed(member: dict) -> dict:
    """Build the bilingual welcome embed for a new guild member."""
    user = member.get("user") or member
    uid = user.get("id", "")
    mention = f"<@{uid}>" if uid else "nouveau héros"

    return {
        "title": "🌌 Bienvenue dans NEXORIA",
        "description": (
            f"Bienvenue {mention} dans le Nexus. "
            "Choisis ta langue, ton pays, puis prépare ton héros pour l'aventure.\n\n"
            f"Welcome {mention} to the Nexus. "
            "Pick your language and country, then forge your hero."
        ),
        "color": EMBED_COLOR,
        "thumbnail": {"url": member_avatar_url(member)},
        "footer": {"text": "NEXORIA — Communauté fantasy internationale"},
    }


async def _already_welcomed(guild_id: str, discord_id: str) -> bool:
    if not _db or not discord_id:
        return False
    try:
        doc = await _db.discord_welcome_log.find_one(
            {"guild_id": guild_id, "discord_id": discord_id},
            {"_id": 1},
        )
        return doc is not None
    except Exception as e:
        logger.warning("discord welcome dedup check failed: %s", e)
        return False


async def _mark_welcomed(guild_id: str, discord_id: str, channel_id: str) -> None:
    if not _db or not discord_id:
        return
    try:
        await _db.discord_welcome_log.update_one(
            {"guild_id": guild_id, "discord_id": discord_id},
            {
                "$setOnInsert": {
                    "guild_id": guild_id,
                    "discord_id": discord_id,
                    "channel_id": channel_id,
                    "welcomed_at": datetime.now(timezone.utc).isoformat(),
                }
            },
            upsert=True,
        )
    except Exception as e:
        logger.warning("discord welcome log write failed: %s", e)


async def send_member_welcome(member: dict) -> bool:
    """Post welcome embed for a new member. Returns True on success."""
    if not is_welcome_enabled():
        return False

    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    guild_id = os.environ.get("DISCORD_GUILD_ID", "").strip()
    channel_id = welcome_channel_id()

    if not token or not guild_id or not channel_id:
        logger.debug("discord welcome skipped — not configured")
        return False

    user = member.get("user") or member
    if user.get("bot"):
        logger.debug("discord welcome skipped — bot member")
        return False

    discord_id = user.get("id")
    if not discord_id:
        return False

    dedup_key = f"{guild_id}:{discord_id}"
    if dedup_key in _recent_welcomes:
        logger.info("discord welcome skipped — duplicate in session for %s", discord_id)
        return False

    if await _already_welcomed(guild_id, discord_id):
        logger.info("discord welcome skipped — already welcomed %s", discord_id)
        return False

    embed = build_welcome_embed(member)
    payload = {"embeds": [embed]}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                f"{DISCORD_API}/channels/{channel_id}/messages",
                headers={**_headers(token), "Content-Type": "application/json"},
                json=payload,
            )
            if r.status_code not in (200, 201):
                logger.warning(
                    "discord welcome failed: status=%s channel=%s detail=%s",
                    r.status_code,
                    channel_id,
                    r.text[:200],
                )
                return False

        _recent_welcomes.add(dedup_key)
        await _mark_welcomed(guild_id, discord_id, channel_id)
        logger.info(
            "discord welcome sent: member=%s channel=%s",
            discord_id,
            channel_id,
        )
        return True
    except Exception as e:
        logger.warning("discord welcome error: %s", e)
        return False
