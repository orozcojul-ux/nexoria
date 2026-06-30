"""Message de bienvenue Discord — carte visuelle + texte d'accompagnement."""
from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from pymongo.errors import DuplicateKeyError

import discord_welcome_card

logger = logging.getLogger("nexoria.discord_welcome")

DISCORD_API = "https://discord.com/api/v10"
DEFAULT_WELCOME_CHANNEL_ID = "1514271114405216359"
DEFAULT_REGLEMENT_CHANNEL_ID = "1514271110101995651"
WELCOME_EMBED_COLOR = 0x9B59B6  # violet NEXORIA

_db = None
_user_locks: dict[str, asyncio.Lock] = {}


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


def reglement_channel_id() -> str:
    return (
        os.environ.get("DISCORD_REGLEMENT_CHANNEL_ID", "").strip()
        or DEFAULT_REGLEMENT_CHANNEL_ID
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
        return f"https://cdn.discordapp.com/avatars/{uid}/{avatar}.{ext}?size=512"
    if uid:
        index = (int(uid) >> 22) % 6
        return f"https://cdn.discordapp.com/embed/avatars/{index}.png"
    return "https://cdn.discordapp.com/embed/avatars/0.png"


def build_welcome_content(user: dict) -> str:
    user_id = str(user.get("id") or "")
    mention = f"<@{user_id}>" if user_id else discord_welcome_card.display_name(user)
    return (
        f"Bienvenue {mention} dans **NEXORIA**. "
        f"Consulte <#{welcome_channel_id()}> et <#{reglement_channel_id()}> pour commencer."
    )


def build_welcome_embed(user: dict) -> dict[str, Any]:
    user_id = str(user.get("id") or "")
    mention = f"<@{user_id}>" if user_id else "Aventurier"
    name = discord_welcome_card.display_name(user)
    return {
        "title": "🌌 Bienvenue dans NEXORIA",
        "description": (
            f"**{name}**, bienvenue {mention} dans le Nexus.\n"
            "Un nouveau héros rejoint le royaume — choisis ta langue, ton pays, "
            "puis prépare ton aventure.\n\n"
            f"**Welcome to NEXORIA**, {mention}."
        ),
        "color": WELCOME_EMBED_COLOR,
        "thumbnail": {"url": avatar_url(user)},
        "footer": {"text": "NEXORIA — Communauté fantasy internationale"},
    }


def build_fallback_text(user: dict) -> str:
    return f"{build_welcome_content(user)}\n\n🌌 Bienvenue dans NEXORIA, {discord_welcome_card.display_name(user)} !"


def _user_lock(user_id: str) -> asyncio.Lock:
    lock = _user_locks.get(user_id)
    if lock is None:
        lock = asyncio.Lock()
        _user_locks[user_id] = lock
    return lock


async def _try_claim_welcome(user_id: str) -> bool:
    """Réserve l'envoi (anti-doublon multi-workers / race Gateway)."""
    if _db is None:
        return True
    now = datetime.now(timezone.utc).isoformat()
    try:
        await _db.discord_welcome_sent.insert_one(
            {
                "user_id": user_id,
                "status": "pending",
                "started_at": now,
            }
        )
        return True
    except DuplicateKeyError:
        return False


async def _finalize_welcome(
    user_id: str,
    channel_id: str,
    message_id: str,
    *,
    kind: str,
) -> None:
    if _db is None or not user_id:
        return
    now = datetime.now(timezone.utc).isoformat()
    await _db.discord_welcome_sent.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "channel_id": channel_id,
                "message_id": message_id,
                "sent_at": now,
                "kind": kind,
                "status": "sent",
            }
        },
    )


async def _release_welcome_claim(user_id: str) -> None:
    if _db is None:
        return
    await _db.discord_welcome_sent.delete_one({"user_id": user_id, "status": "pending"})


async def _post_message(
    client: httpx.AsyncClient,
    channel_id: str,
    token: str,
    *,
    content: str,
    embeds: list[dict] | None = None,
    image_path: str | None = None,
    image_name: str | None = None,
) -> dict | None:
    url = f"{DISCORD_API}/channels/{channel_id}/messages"
    payload: dict[str, Any] = {"content": content}
    if embeds:
        payload["embeds"] = embeds

    if image_path and Path(image_path).is_file():
        with open(image_path, "rb") as img_file:
            files = {"files[0]": (image_name or "welcome.png", img_file, "image/png")}
            data = {"payload_json": json.dumps(payload)}
            r = await client.post(url, headers=_headers(token), data=data, files=files)
    else:
        r = await client.post(
            url,
            headers={**_headers(token), "Content-Type": "application/json"},
            json=payload,
        )

    if r.status_code not in (200, 201):
        logger.warning(
            "discord welcome send failed channel_id=%s status=%s body=%s",
            channel_id,
            r.status_code,
            r.text[:200],
        )
        return None
    return r.json()


async def send_welcome_message(user: dict, *, channel_id: str, token: str) -> bool:
    """Génère la carte visuelle et poste le message (fallback texte/embed si échec)."""
    user_id = str(user.get("id") or "")
    content = build_welcome_content(user)
    av_url = avatar_url(user)
    temp_path: str | None = None

    try:
        temp_path, filename = await discord_welcome_card.generate_welcome_card_file(user, av_url)
        async with httpx.AsyncClient(timeout=30.0) as client:
            if temp_path:
                body = await _post_message(
                    client,
                    channel_id,
                    token,
                    content=content,
                    image_path=temp_path,
                    image_name=filename,
                )
                if body:
                    await _finalize_welcome(
                        user_id, channel_id, str(body.get("id") or ""), kind="card",
                    )
                    logger.info(
                        "discord welcome card sent user_id=%s channel_id=%s message_id=%s",
                        user_id,
                        channel_id,
                        body.get("id"),
                    )
                    return True
                logger.warning("discord welcome card upload failed user_id=%s — fallback", user_id)

            body = await _post_message(
                client,
                channel_id,
                token,
                content=build_fallback_text(user),
                embeds=[build_welcome_embed(user)],
            )
            if body:
                await _finalize_welcome(
                    user_id, channel_id, str(body.get("id") or ""), kind="embed",
                )
                logger.info(
                    "discord welcome fallback embed user_id=%s channel_id=%s message_id=%s",
                    user_id,
                    channel_id,
                    body.get("id"),
                )
                return True

            body = await _post_message(
                client,
                channel_id,
                token,
                content=build_fallback_text(user),
            )
            if body:
                await _finalize_welcome(
                    user_id, channel_id, str(body.get("id") or ""), kind="text",
                )
                return True
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "discord welcome error user_id=%s channel_id=%s: %s",
            user_id,
            channel_id,
            str(exc)[:240],
        )
    finally:
        discord_welcome_card.cleanup_temp_file(temp_path)

    return False


async def handle_member_join(member: dict, *, guild_id: str = "") -> None:
    """Envoie la welcome card dans #bienvenue (une fois par membre)."""
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

    async with _user_lock(user_id):
        if not await _try_claim_welcome(user_id):
            logger.info("discord welcome skipped user_id=%s reason=already_claimed", user_id)
            return

        logger.info(
            "discord welcome member_join user_id=%s guild_id=%s channel_id=%s",
            user_id,
            guild_id,
            channel_id,
        )

        ok = await send_welcome_message(user, channel_id=channel_id, token=token)
        if not ok:
            await _release_welcome_claim(user_id)
