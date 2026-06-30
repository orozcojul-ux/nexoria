"""Discord Gateway — réactions 🌍, threads forum, bienvenue membres.

Connexion WebSocket légère (sans discord.py) pour compléter l'endpoint Interactions HTTP.
Une seule instance par déploiement (verrou MongoDB) pour éviter les événements en double.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import socket
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import websockets
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

import discord_translate
import discord_welcome

logger = logging.getLogger("nexoria.discord_gateway")

DISCORD_API = "https://discord.com/api/v10"
GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json"
GATEWAY_LOCK_ID = "discord_gateway"
GATEWAY_LEASE_SECONDS = 45

# GUILDS | GUILD_MEMBERS | GUILD_MESSAGES | GUILD_MESSAGE_REACTIONS
GATEWAY_INTENTS = (1 << 0) | (1 << 1) | (1 << 9) | (1 << 10)

_gateway_task: asyncio.Task | None = None
_bot_user_id: str = ""
_stop_event: asyncio.Event | None = None
_db = None
_owner_id = f"{socket.gethostname()}:{os.getpid()}"


def init(db) -> None:
    global _db
    _db = db


def is_enabled() -> bool:
    if os.environ.get("DISCORD_GATEWAY_ENABLED", "true").strip().lower() in (
        "0", "false", "off", "no",
    ):
        return False
    return bool(os.environ.get("DISCORD_BOT_TOKEN", "").strip())


async def _try_acquire_or_renew_leader() -> bool:
    """Un seul worker tient la connexion Gateway (évite GUILD_MEMBER_ADD en double)."""
    if _db is None:
        return True

    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    expires_iso = (now + timedelta(seconds=GATEWAY_LEASE_SECONDS)).isoformat()

    doc = await _db.discord_gateway_lock.find_one_and_update(
        {
            "_id": GATEWAY_LOCK_ID,
            "$or": [
                {"expires_at": {"$lt": now_iso}},
                {"owner": _owner_id},
            ],
        },
        {
            "$set": {
                "owner": _owner_id,
                "expires_at": expires_iso,
                "heartbeat_at": now_iso,
            },
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    if doc and doc.get("owner") == _owner_id:
        return True

    try:
        await _db.discord_gateway_lock.insert_one(
            {
                "_id": GATEWAY_LOCK_ID,
                "owner": _owner_id,
                "expires_at": expires_iso,
                "heartbeat_at": now_iso,
            }
        )
        return True
    except DuplicateKeyError:
        doc = await _db.discord_gateway_lock.find_one({"_id": GATEWAY_LOCK_ID})
        return bool(doc and doc.get("owner") == _owner_id)


def _reaction_translate_enabled() -> bool:
    return os.environ.get("DISCORD_REACTION_TRANSLATE_ENABLED", "true").strip().lower() not in (
        "0", "false", "off", "no",
    )


def _token() -> str:
    return os.environ.get("DISCORD_BOT_TOKEN", "").strip()


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bot {token}", "User-Agent": "Nexoria/1.0"}


async def _fetch_bot_user_id(token: str) -> str:
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(f"{DISCORD_API}/users/@me", headers=_headers(token))
        if r.status_code == 200:
            return str(r.json().get("id") or "")
    return ""


def _is_globe_reaction(emoji: dict | None) -> bool:
    if not emoji or emoji.get("id"):
        return False
    name = (emoji.get("name") or "").strip()
    return name in ("🌍", "🌎", "🌏")


async def _handle_dispatch(event: str, data: dict[str, Any]) -> None:
    if event == "GUILD_MEMBER_ADD":
        guild_id = str(data.get("guild_id") or os.environ.get("DISCORD_GUILD_ID", ""))
        await discord_welcome.handle_member_join(data, guild_id=guild_id)
        return

    if event == "GUILD_MEMBER_UPDATE":
        import discord_international
        asyncio.create_task(discord_international.handle_member_roles_update(data))
        return

    if event == "MESSAGE_REACTION_ADD":
        if not _reaction_translate_enabled():
            return
        emoji = data.get("emoji") or {}
        if not _is_globe_reaction(emoji):
            return
        user_id = str(data.get("user_id") or "")
        if not user_id or user_id == _bot_user_id:
            return
        channel_id = str(data.get("channel_id") or "")
        message_id = str(data.get("message_id") or "")
        guild_id = str(data.get("guild_id") or "")
        member = data.get("member")
        asyncio.create_task(
            discord_translate.handle_reaction_translate(
                user_id=user_id,
                channel_id=channel_id,
                message_id=message_id,
                guild_id=guild_id,
                member=member if isinstance(member, dict) else None,
            )
        )
        return

    if event == "THREAD_CREATE":
        thread_id = str(data.get("id") or "")
        parent_id = str(data.get("parent_id") or "")
        if thread_id and parent_id:
            asyncio.create_task(
                discord_translate.ensure_thread_translate_helper(
                    forum_channel_id=parent_id,
                    thread_id=thread_id,
                )
            )


async def _gateway_loop() -> None:
    global _bot_user_id
    token = _token()
    if not token:
        return

    backoff = 5
    leader_wait = 15

    while _stop_event and not _stop_event.is_set():
        while _stop_event and not _stop_event.is_set():
            if await _try_acquire_or_renew_leader():
                break
            logger.debug(
                "discord gateway waiting for leader lock on %s",
                _owner_id,
            )
            await asyncio.sleep(leader_wait)

        if _stop_event.is_set():
            break

        if not _bot_user_id:
            _bot_user_id = await _fetch_bot_user_id(token)

        try:
            async with websockets.connect(
                GATEWAY_URL,
                ping_interval=None,
                max_size=2**22,
            ) as ws:
                logger.info("discord gateway connected on %s", _owner_id)
                hello = json.loads(await ws.recv())
                if hello.get("op") != 10:
                    logger.warning("discord gateway unexpected hello op=%s", hello.get("op"))
                    await asyncio.sleep(backoff)
                    continue

                interval_ms = hello["d"]["heartbeat_interval"]
                last_seq: int | None = None
                backoff = 5
                disconnect = asyncio.Event()

                async def heartbeat() -> None:
                    while not _stop_event.is_set() and not disconnect.is_set():
                        await asyncio.sleep(interval_ms / 1000.0)
                        if not await _try_acquire_or_renew_leader():
                            logger.warning("discord gateway lost leader lock during heartbeat")
                            disconnect.set()
                            break
                        payload: dict[str, Any] = {"op": 1, "d": last_seq}
                        await ws.send(json.dumps(payload))

                hb_task = asyncio.create_task(heartbeat())

                identify = {
                    "op": 2,
                    "d": {
                        "token": f"Bot {token}",
                        "intents": GATEWAY_INTENTS,
                        "properties": {
                            "os": "linux",
                            "browser": "nexoria",
                            "device": "nexoria",
                        },
                    },
                }
                await ws.send(json.dumps(identify))

                try:
                    async for raw in ws:
                        if _stop_event.is_set() or disconnect.is_set():
                            break
                        msg = json.loads(raw)
                        op = msg.get("op")
                        if msg.get("s") is not None:
                            last_seq = msg["s"]

                        if op == 0:
                            event = msg.get("t")
                            data = msg.get("d") or {}
                            if event:
                                try:
                                    await _handle_dispatch(event, data)
                                except Exception as exc:  # noqa: BLE001
                                    logger.warning(
                                        "discord gateway dispatch error event=%s: %s",
                                        event,
                                        exc,
                                    )
                        elif op == 7:
                            logger.info("discord gateway reconnect requested")
                            break
                        elif op == 9:
                            logger.warning("discord gateway invalid session")
                            await asyncio.sleep(5)
                            break
                finally:
                    hb_task.cancel()
                    try:
                        await hb_task
                    except asyncio.CancelledError:
                        pass

        except asyncio.CancelledError:
            break
        except Exception as exc:  # noqa: BLE001
            logger.warning("discord gateway connection error: %s", exc)
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 120)

    logger.info("discord gateway stopped")


def start() -> None:
    """Démarre la connexion Gateway en tâche de fond (après init(db))."""
    global _gateway_task, _stop_event
    if not is_enabled():
        logger.info("discord gateway disabled (token missing or DISCORD_GATEWAY_ENABLED=0)")
        return
    if _gateway_task and not _gateway_task.done():
        return
    _stop_event = asyncio.Event()
    _gateway_task = asyncio.create_task(_gateway_loop())
    logger.info("discord gateway task scheduled on %s", _owner_id)


def stop() -> None:
    global _gateway_task, _stop_event
    if _stop_event:
        _stop_event.set()
    if _gateway_task and not _gateway_task.done():
        _gateway_task.cancel()
    _gateway_task = None
    _stop_event = None
