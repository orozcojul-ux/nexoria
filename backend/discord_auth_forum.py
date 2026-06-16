"""Discord channel announcements for NEXORIA registrations and logins."""
from __future__ import annotations

import asyncio
import logging
import os

import discord_sync

logger = logging.getLogger("nexoria.discord_auth_forum")

DEFAULT_AUTH_FORUM_CHANNEL_ID = "1515325507208745080"


def auth_forum_channel_id() -> str:
    return os.environ.get("DISCORD_AUTH_FORUM_CHANNEL_ID", DEFAULT_AUTH_FORUM_CHANNEL_ID).strip()


def _format_message(event: str, user: dict) -> str:
    username = user.get("username") or "Héros"
    if event == "register":
        return f"✨ **{username}** vient de rejoindre NEXORIA — bienvenue sur le Discord !"
    if event == "logout":
        return f"🚪 **{username}** s'est déconnecté de NEXORIA — à bientôt sur le Discord !"
    if event == "rename":
        old = user.get("old_username") or "?"
        return f"✏️ **{old}** est devenu **{username}** sur NEXORIA"
    return f"👋 **{username}** s'est connecté à NEXORIA — bienvenue sur le Discord !"


async def notify_auth_event(event: str, user: dict) -> bool:
    """Post a simple line in the auth announcements channel (no thread)."""
    if event not in ("register", "login", "logout", "rename"):
        return False
    channel_id = auth_forum_channel_id()
    if not channel_id:
        logger.warning("auth forum: DISCORD_AUTH_FORUM_CHANNEL_ID manquant")
        return False

    ok = await discord_sync.post_notification(
        _format_message(event, user),
        channel_id=channel_id,
    )
    if not ok:
        logger.warning(
            "auth forum: échec publication %s pour %s",
            event,
            user.get("username") or "?",
        )
    return ok


def schedule_auth_event(event: str, user: dict) -> None:
    """Fire-and-forget Discord auth announcement."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(notify_auth_event(event, user))
    except RuntimeError:
        logger.warning("auth forum: pas de boucle asyncio active")
