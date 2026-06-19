"""Discord channel announcements for NEXORIA registrations and logins.

Connection / disconnection / registration / rename are announced in the
**notifications** channel (DISCORD_NOTIFY_CHANNEL_ID). Rewards are handled
separately in DISCORD_REWARDS_CHANNEL_ID (discord_rewards module).
"""
from __future__ import annotations

import asyncio
import logging
import os
import time

import discord_sync

logger = logging.getLogger("nexoria.discord_auth_forum")

DEFAULT_AUTH_FORUM_CHANNEL_ID = "1515325507208745080"

# Anti-spam: skip duplicate login announcements within a short window.
LOGIN_DEDUP_SECONDS = 60
_recent_login: dict[str, float] = {}

_background_tasks: set[asyncio.Task] = set()


def notify_channel_id() -> str:
    """Notifications channel (login/logout…)."""
    return (
        os.environ.get("DISCORD_NOTIFY_CHANNEL_ID", "").strip()
        or os.environ.get("DISCORD_AUTH_FORUM_CHANNEL_ID", "").strip()
        or DEFAULT_AUTH_FORUM_CHANNEL_ID
    )


_METHOD_LABELS = {
    "discord": "via Discord",
    "email": "via email",
    "google": "via Google",
}


def _method_suffix(method: str | None) -> str:
    label = _METHOD_LABELS.get((method or "").lower())
    return f" {label}" if label else ""


def _format_message(event: str, user: dict, method: str | None = None) -> str:
    username = user.get("username") or "Hero"
    via = _method_suffix(method)
    if event == "register":
        return f"✨ **{username}** just joined NEXORIA{via} — welcome to the Discord!"
    if event == "login":
        return f"✨ **{username}** logged in{via} — welcome back to Nexoria!"
    if event == "logout":
        return f"🔴 **{username}** logged out of NEXORIA — see you soon on Discord!"
    if event == "rename":
        old = user.get("old_username") or "?"
        return f"✏️ **{old}** is now **{username}** on NEXORIA"
    return f"👋 **{username}** on NEXORIA"


async def notify_auth_event(event: str, user: dict, method: str | None = None) -> bool:
    """Post a simple line in the notifications channel (no thread)."""
    if event not in ("register", "login", "logout", "rename"):
        return False
    channel_id = notify_channel_id()
    if not channel_id:
        logger.warning("Discord auth notification %s failed: no notifications channel configured", event)
        return False

    try:
        ok = await discord_sync.post_notification(
            _format_message(event, user, method),
            channel_id=channel_id,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Discord auth notification %s failed: %s (%s)",
            event,
            exc,
            user.get("username") or "?",
        )
        return False

    if ok:
        logger.info(
            "Discord auth notification %s sent for %s",
            event,
            user.get("username") or "?",
        )
    else:
        logger.warning(
            "Discord auth notification %s failed: post rejected by Discord (%s)",
            event,
            user.get("username") or "?",
        )
    return ok


async def notify_beta_redeemed(name: str) -> bool:
    """Announce that a player activated a beta tester key (beta-signup channel)."""
    message = f"🔑 **{name}** activated their BETA TESTER key — welcome among the pioneers!"
    channel_id = (
        os.environ.get("DISCORD_BETA_SIGNUP_CHANNEL_ID", "").strip()
        or DEFAULT_AUTH_FORUM_CHANNEL_ID
    )
    try:
        ok = await discord_sync.post_notification(message, channel_id=channel_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Discord beta notification failed: %s (%s)", exc, name)
        return False
    if ok:
        logger.info("Discord beta notification sent for %s", name)
    else:
        logger.warning("Discord beta notification failed: post rejected by Discord (%s)", name)
    return ok


def schedule_beta_redeemed(name: str) -> None:
    """Fire-and-forget — announce beta key activation."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        logger.warning("Discord beta notification failed: no active asyncio loop")
        return
    task = loop.create_task(notify_beta_redeemed(name))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    logger.info("Discord beta notification scheduled for %s", name)


def schedule_auth_event(event: str, user: dict, method: str | None = None) -> None:
    """Fire-and-forget Discord auth announcement (does not slow the request)."""
    if event == "login":
        uid = user.get("user_id")
        if uid:
            now = time.monotonic()
            last = _recent_login.get(uid, 0.0)
            if now - last < LOGIN_DEDUP_SECONDS:
                logger.info(
                    "Discord auth notification login skipped (anti-spam) for %s",
                    user.get("username") or uid,
                )
                return
            _recent_login[uid] = now

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        logger.warning("Discord auth notification %s failed: no active asyncio loop", event)
        return

    task = loop.create_task(notify_auth_event(event, user, method))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    logger.info("Discord auth notification %s scheduled", event)
