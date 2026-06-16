"""Discord channel announcements for NEXORIA registrations and logins.

Connexion / déconnexion / inscription / renommage sont annoncés dans le salon
**notifications** (DISCORD_NOTIFY_CHANNEL_ID). Les récompenses restent gérées
séparément dans DISCORD_REWARDS_CHANNEL_ID (module discord_rewards).
"""
from __future__ import annotations

import asyncio
import logging
import os
import time

import discord_sync

logger = logging.getLogger("nexoria.discord_auth_forum")

DEFAULT_AUTH_FORUM_CHANNEL_ID = "1515325507208745080"

# Anti-spam : on n'annonce pas deux fois la connexion d'un même héros en rafale
# (re-login rapide, double appel OAuth, refresh, etc.).
LOGIN_DEDUP_SECONDS = 60
_recent_login: dict[str, float] = {}

# On garde une référence forte sur les tâches fire-and-forget, sinon le GC peut
# les supprimer avant qu'elles ne s'exécutent (notification jamais envoyée).
_background_tasks: set[asyncio.Task] = set()


def notify_channel_id() -> str:
    """Salon des notifications (connexion/déconnexion…).

    Priorité au salon notifications dédié ; on retombe sur l'ancien salon
    d'annonces puis sur la valeur par défaut pour rester rétro-compatible.
    """
    return (
        os.environ.get("DISCORD_NOTIFY_CHANNEL_ID", "").strip()
        or os.environ.get("DISCORD_AUTH_FORUM_CHANNEL_ID", "").strip()
        or DEFAULT_AUTH_FORUM_CHANNEL_ID
    )


def _format_message(event: str, user: dict) -> str:
    username = user.get("username") or "Héros"
    if event == "register":
        return f"✨ **{username}** vient de rejoindre NEXORIA — bienvenue sur le Discord !"
    if event == "login":
        return f"✨ **{username}** s'est connecté à NEXORIA — bienvenue sur le Discord !"
    if event == "logout":
        return f"🔴 **{username}** s'est déconnecté de NEXORIA — à bientôt sur le Discord !"
    if event == "rename":
        old = user.get("old_username") or "?"
        return f"✏️ **{old}** est devenu **{username}** sur NEXORIA"
    return f"👋 **{username}** sur NEXORIA"


async def notify_auth_event(event: str, user: dict) -> bool:
    """Post a simple line in the notifications channel (no thread)."""
    if event not in ("register", "login", "logout", "rename"):
        return False
    channel_id = notify_channel_id()
    if not channel_id:
        logger.warning("Discord auth notification %s failed: aucun salon notifications configuré", event)
        return False

    try:
        ok = await discord_sync.post_notification(
            _format_message(event, user),
            channel_id=channel_id,
        )
    except Exception as exc:  # noqa: BLE001 — fire-and-forget, on ne casse rien
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
            "Discord auth notification %s failed: publication refusée par Discord (%s)",
            event,
            user.get("username") or "?",
        )
    return ok


async def notify_beta_redeemed(name: str) -> bool:
    """Annonce qu'un joueur a activé une clé beta testeur (salon dédié)."""
    message = f"🔑 **{name}** a reçu une clé BETA TESTEUR"
    try:
        ok = await discord_sync.post_notification(message, channel_id=DEFAULT_AUTH_FORUM_CHANNEL_ID)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Discord beta notification failed: %s (%s)", exc, name)
        return False
    if ok:
        logger.info("Discord beta notification sent for %s", name)
    else:
        logger.warning("Discord beta notification failed: publication refusée par Discord (%s)", name)
    return ok


def schedule_beta_redeemed(name: str) -> None:
    """Fire-and-forget — annonce l'activation d'une clé beta."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        logger.warning("Discord beta notification failed: pas de boucle asyncio active")
        return
    task = loop.create_task(notify_beta_redeemed(name))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    logger.info("Discord beta notification scheduled for %s", name)


def schedule_auth_event(event: str, user: dict) -> None:
    """Fire-and-forget Discord auth announcement (ne ralentit pas la requête)."""
    # Dé-doublonnage des connexions pour éviter le spam.
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

    task = loop.create_task(notify_auth_event(event, user))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    logger.info("Discord auth notification %s scheduled", event)
