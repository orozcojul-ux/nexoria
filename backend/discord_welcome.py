"""Message de bienvenue Discord — embed avec avatar pour les nouveaux membres."""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

import httpx

logger = logging.getLogger("nexoria.discord_welcome")

DISCORD_API = "https://discord.com/api/v10"
DEFAULT_WELCOME_CHANNEL_ID = "1514271114405216359"
WELCOME_EMBED_COLOR = 0x9B59B6  # violet NEXORIA

_db = None


def init(db) -> None:
    global _db
    _db = db


def is_enabled() -> bool:
    if os.environ.get("DISCORD_WELCOME_ENABLED", "true").strip().lower() in (
        "0", "false", "off", "no",
    ):
        return False
    return bool(os.environ.get("DISCORD_BOT_TOKEN", "").strip())


def welcome_channel_id() -> str:
    return (
        os.environ.get("DISCORD_WELCOME_CHANNEL_ID", "").strip()
        or DEFAULT_WELCOME_CHANNEL_ID
    )


def bot_token() -> str:
    return os.environ.get("DISCORD_BOT_TOKEN", "").strip()


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bot {token}", "User-Agent": "Nexoria/1.0"}


def avatar_url(user: dict) -> str:
    uid = str(user.get("id") or "")
    avatar = user.get("avatar")
    if uid and avatar:
        ext = "gif" if str(avatar).startswith("a_") else "png"
        return f"https://cdn.discordapp.com/avatars/{uid}/{avatar}.{ext}?size=256"
    if uid:
        index = (int(uid) >> 22) % 6
        return f"https://cdn.discordapp.com/embed/avatars/{index}.png"
    return "https://cdn.discordapp.com/embed/avatars/0.png"


def build_welcome_embed(user: dict) -> dict[str, Any]:
    user_id = str(user.get("id") or "")
    mention = f"<@{user_id}>" if user_id else "Aventurier"
    return {
        "title": "🌌 Bienvenue dans NEXORIA",
        "description": (
            f"Bienvenue {mention} dans le Nexus. "
            "Choisis ta langue, ton pays, puis prépare ton héros pour l'aventure.\n\n"
            f"**Welcome to NEXORIA**, {mention}. "
            "Choose your language and country to access the right channels."
        ),
        "color": WELCOME_EMBED_COLOR,
        "thumbnail": {"url": avatar_url(user)},
        "footer": {"text": "NEXORIA — Communauté fantasy internationale"},
    }


async def _already_welcomed(user_id: str) -> bool:
    if _db is None or not user_id:
        return False
    doc = await _db.discord_welcome_sent.find_one({"user_id": user_id}, {"_id": 1})
    return doc is not None


async def _mark_welcomed(user_id: str, channel_id: str, message_id: str) -> None:
    if _db is None or not user_id:
        return
    now = datetime.now(timezone.utc).isoformat()
    await _db.discord_welcome_sent.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "user_id": user_id,
                "channel_id": channel_id,
                "message_id": message_id,
                "sent_at": now,
            }
        },
        upsert=True,
    )


async def handle_member_join(member: dict, *, guild_id: str = "") -> None:
    """Envoie l'embed de bienvenue dans #bienvenue (une fois par membre)."""
    if not is_enabled():
        return

    user = member.get("user") or member
    if not isinstance(user, dict):
        return
    if user.get("bot"):
        return

    user_id = str(user.get("id") or "")
    if not user_id:
        return

    channel_id = welcome_channel_id()
    token = bot_token()
    if not token or not channel_id:
        logger.warning("discord welcome skipped: token or channel missing")
        return

    if await _already_welcomed(user_id):
        logger.info("discord welcome skipped user_id=%s reason=already_sent", user_id)
        return

    logger.info(
        "discord welcome member_join user_id=%s guild_id=%s channel_id=%s",
        user_id,
        guild_id,
        channel_id,
    )

    payload = {"embeds": [build_welcome_embed(user)]}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                f"{DISCORD_API}/channels/{channel_id}/messages",
                headers={**_headers(token), "Content-Type": "application/json"},
                json=payload,
            )
            if r.status_code not in (200, 201):
                logger.warning(
                    "discord welcome send failed user_id=%s channel_id=%s status=%s",
                    user_id,
                    channel_id,
                    r.status_code,
                )
                return
            body = r.json()
            message_id = str(body.get("id") or "")
            await _mark_welcomed(user_id, channel_id, message_id)
            logger.info(
                "discord welcome sent user_id=%s channel_id=%s message_id=%s",
                user_id,
                channel_id,
                message_id,
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "discord welcome error user_id=%s channel_id=%s: %s",
            user_id,
            channel_id,
            str(exc)[:200],
        )
