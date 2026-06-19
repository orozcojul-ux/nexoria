"""Annonces Discord — inscriptions et connexions NEXORIA."""
from __future__ import annotations

import asyncio
import logging
import os
import time

import discord_sync

logger = logging.getLogger("nexoria.discord_auth_forum")

DEFAULT_AUTH_FORUM_CHANNEL_ID = "1515325507208745080"

LOGIN_DEDUP_SECONDS = 60
_recent_login: dict[str, float] = {}
_background_tasks: set[asyncio.Task] = set()


def notify_channel_id() -> str:
    return (
        os.environ.get("DISCORD_NOTIFY_CHANNEL_ID", "").strip()
        or os.environ.get("DISCORD_AUTH_FORUM_CHANNEL_ID", "").strip()
        or DEFAULT_AUTH_FORUM_CHANNEL_ID
    )


_METHOD_LABELS = {
    "discord": "via Discord",
    "email": "via e-mail",
    "google": "via Google",
}


def _method_suffix(method: str | None) -> str:
    label = _METHOD_LABELS.get((method or "").lower())
    return f" {label}" if label else ""


def _format_message(event: str, user: dict, method: str | None = None) -> str:
    username = user.get("username") or "Héros"
    via = _method_suffix(method)
    if event == "register":
        return f"✨ **{username}** vient de rejoindre NEXORIA{via} — bienvenue sur le Discord !"
    if event == "login":
        return f"✨ **{username}** s'est connecté{via}, bienvenue sur Nexoria !"
    if event == "logout":
        return f"🔴 **{username}** s'est déconnecté de NEXORIA — à bientôt sur le Discord !"
    if event == "rename":
        old = user.get("old_username") or "?"
        return f"✏️ **{old}** est devenu **{username}** sur NEXORIA"
    return f"👋 **{username}** sur NEXORIA"


async def notify_auth_event(event: str, user: dict, method: str | None = None) -> bool:
    if event not in ("register", "login", "logout", "rename"):
        return False
    channel_id = notify_channel_id()
    if not channel_id:
        logger.warning("Discord auth notification %s failed: aucun salon notifications configuré", event)
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
        logger.info("Discord auth notification %s sent for %s", event, user.get("username") or "?")
    else:
        logger.warning(
            "Discord auth notification %s failed: publication refusée (%s)",
            event,
            user.get("username") or "?",
        )
    return ok


async def notify_beta_redeemed(name: str) -> bool:
    message = f"🔑 **{name}** a activé sa clé BETA TESTEUR — bienvenue parmi les pionniers !"
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
        logger.warning("Discord beta notification failed: publication refusée (%s)", name)
    return ok


def schedule_beta_redeemed(name: str) -> None:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        logger.warning("Discord beta notification failed: pas de boucle asyncio active")
        return
    task = loop.create_task(notify_beta_redeemed(name))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    logger.info("Discord beta notification scheduled for %s", name)


def schedule_auth_event(event: str, user: dict, method: str | None = None) -> None:
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
        logger.warning("Discord auth notification %s failed: pas de boucle asyncio active", event)
        return

    task = loop.create_task(notify_auth_event(event, user, method))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    logger.info("Discord auth notification %s scheduled", event)
