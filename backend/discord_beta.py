"""Discord — Beta & VIP channels, application notifications."""
from __future__ import annotations

import asyncio
import logging
import os

import discord_sync

logger = logging.getLogger("nexoria.discord_beta")

DEFAULT_VIP_LOUNGE_CHANNEL_ID = "1517470912256016534"
DEFAULT_BETA_TEST_CHANNEL_ID = "1517470908476821575"
DEFAULT_BETA_SIGNUP_CHANNEL_ID = "1517470910427168770"
DEFAULT_BETA_TESTER_ROLE_ID = "1517474516174114817"


def vip_lounge_channel_id() -> str:
    return os.environ.get("DISCORD_VIP_LOUNGE_CHANNEL_ID", DEFAULT_VIP_LOUNGE_CHANNEL_ID).strip()


def beta_test_channel_id() -> str:
    return os.environ.get("DISCORD_BETA_TEST_CHANNEL_ID", DEFAULT_BETA_TEST_CHANNEL_ID).strip()


def beta_signup_channel_id() -> str:
    return os.environ.get("DISCORD_BETA_SIGNUP_CHANNEL_ID", DEFAULT_BETA_SIGNUP_CHANNEL_ID).strip()


def beta_tester_role_id() -> str:
    return os.environ.get("DISCORD_BETA_TESTER_ROLE_ID", DEFAULT_BETA_TESTER_ROLE_ID).strip()


async def grant_beta_tester_role(db, user_id: str) -> bool:
    """Grant the Discord Beta Tester role when the account is linked."""
    role_id = beta_tester_role_id()
    if not role_id:
        return False
    user = await db.users.find_one({"user_id": user_id}, {"discord_id": 1, "_id": 0})
    if not user or not user.get("discord_id"):
        return False
    ok = await discord_sync.grant_extra_role(db, user_id, role_id, "NEXORIA — Beta Tester")
    if ok:
        logger.info("Beta tester Discord role granted for %s", user_id)
    return ok


def schedule_grant_beta_tester(db, user_id: str) -> None:
    if not beta_tester_role_id():
        return
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    task = loop.create_task(grant_beta_tester_role(db, user_id))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


async def grant_beta_tester_by_application(db, app: dict) -> bool:
    """Try to grant the role via application email or Discord username."""
    email = (app.get("email") or "").strip().lower()
    discord_name = (app.get("discord_username") or "").strip()
    user = None
    if email:
        user = await db.users.find_one({"email": email}, {"user_id": 1, "discord_id": 1})
    if not user and discord_name:
        user = await db.users.find_one(
            {"discord_username": {"$regex": f"^{discord_name.split('#')[0]}", "$options": "i"}},
            {"user_id": 1, "discord_id": 1},
        )
    if not user:
        return False
    return await grant_beta_tester_role(db, user["user_id"])


def schedule_grant_beta_tester_by_application(db, app: dict) -> None:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    task = loop.create_task(grant_beta_tester_by_application(db, app))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


async def maybe_grant_beta_tester_on_link(db, user_id: str, email: str) -> None:
    """If application is approved, grant the role when Discord is linked."""
    approved = await db.beta_applications.find_one(
        {"email": email.lower(), "status": "approved"},
        {"_id": 1},
    )
    if approved:
        await grant_beta_tester_role(db, user_id)


def schedule_maybe_grant_beta_on_link(db, user_id: str, email: str) -> None:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    task = loop.create_task(maybe_grant_beta_tester_on_link(db, user_id, email))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


async def notify_beta_application(app: dict) -> bool:
    """Post a beta application to the beta-signup channel."""
    channel_id = beta_signup_channel_id()
    if not channel_id or not os.environ.get("DISCORD_BOT_TOKEN", "").strip():
        logger.warning("Discord beta application skipped: channel or token missing")
        return False

    discord_user = app.get("discord_username") or "—"
    email = app.get("email") or "—"
    motivation = (app.get("motivation") or "—")[:900]
    slot = app.get("slot_number")
    total = app.get("total_slots", 100)

    embed = {
        "title": f"📝 Nouvelle candidature beta — {discord_user}",
        "color": 0xA78BFA,
        "fields": [
            {"name": "Discord", "value": discord_user, "inline": True},
            {"name": "E-mail", "value": email, "inline": False},
            {"name": "Motivation", "value": motivation, "inline": False},
        ],
        "footer": {"text": f"Candidature n°{slot or '?'} / {total} places"},
    }

    try:
        return await discord_sync.post_channel_message(
            channel_id,
            embeds=[embed],
            translatable=True,
            source_lang="fr",
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Discord beta application post error: %s", exc)
        return False


def schedule_beta_application(app: dict) -> None:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    task = loop.create_task(notify_beta_application(app))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


_background_tasks: set[asyncio.Task] = set()
