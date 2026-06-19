"""Remplace les boutons drapeaux par le menu déroulant sur des messages Discord existants.

Met à jour uniquement les composants (PATCH) — le contenu et les embeds ne changent pas.

Usage (depuis backend/) :
    python scripts/patch_discord_translate_menus.py --dry-run
    python scripts/patch_discord_translate_menus.py --confirm --from-db
    python scripts/patch_discord_translate_menus.py --confirm --scan-pinned
    python scripts/patch_discord_translate_menus.py --confirm --channel-id ID --message-id ID
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
sys.path.insert(0, str(ROOT))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import httpx
import discord_translate
from motor.motor_asyncio import AsyncIOMotorClient

DISCORD_API = "https://discord.com/api/v10"
TRANSLATE_SELECT_ID = discord_translate.TRANSLATE_SELECT_CUSTOM_ID

# Salons avec embeds épinglés officiels (accueil Oracle, FAQ, etc.)
DEFAULT_WELCOME_CHANNEL_IDS = [
    "1514271114405216359",  # bienvenue
    "1514271110101995651",  # règlement
    "1514271112136228864",  # annonces
    "1514271204481962146",  # faq
    "1514271116582191158",  # lore
    "1514271118532411565",  # classes
    "1514271120415658115",  # création perso
    "1514271180268240977",  # oracle
    "1514271122412146739",  # rôles & titres
    "1514271126694662387",  # hub
    "1514271132667347055",  # xp
    "1514271130557612052",  # inventaire
    "1514271140338470932",  # failles
    "1517470908476821575",  # beta-test
]


def _headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bot {token}",
        "User-Agent": "Nexoria/1.0",
        "Content-Type": "application/json",
    }


def _has_legacy_buttons(message: dict) -> bool:
    for row in message.get("components") or []:
        for comp in row.get("components") or []:
            if comp.get("type") == 2 and str(comp.get("custom_id") or "").startswith("tr:"):
                return True
    return False


def _has_translate_select(message: dict) -> bool:
    for row in message.get("components") or []:
        for comp in row.get("components") or []:
            if comp.get("type") == 3 and comp.get("custom_id") == TRANSLATE_SELECT_ID:
                return True
    return False


def _needs_patch(message: dict, *, bot_id: str) -> bool:
    author = message.get("author") or {}
    if str(author.get("id") or "") != bot_id:
        return False
    if not message.get("embeds") and not (message.get("content") or "").strip():
        return False
    if _has_translate_select(message):
        return False
    if _has_legacy_buttons(message):
        return True
    # Bot embed without any translate UI yet
    return bool(message.get("embeds")) and not message.get("components")


async def _patch_message(
    client: httpx.AsyncClient,
    token: str,
    channel_id: str,
    message_id: str,
    *,
    confirm: bool,
) -> str:
    url = f"{DISCORD_API}/channels/{channel_id}/messages/{message_id}"
    if not confirm:
        return "dry-run"

    r = await client.patch(
        url,
        headers=_headers(token),
        json={"components": discord_translate.translate_select_component_rows()},
    )
    if r.status_code == 200:
        return "patched"
    return f"error {r.status_code}: {r.text[:120]}"


async def _fetch_pinned(client: httpx.AsyncClient, token: str, channel_id: str) -> list[dict]:
    r = await client.get(
        f"{DISCORD_API}/channels/{channel_id}/pins",
        headers=_headers(token),
    )
    if r.status_code != 200:
        return []
    return r.json() or []


async def patch_from_db(client: httpx.AsyncClient, token: str, *, confirm: bool) -> int:
    mongo_url = os.environ.get("MONGO_URL", "").strip()
    db_name = os.environ.get("DB_NAME", "").strip()
    if not mongo_url or not db_name:
        print("MONGO_URL / DB_NAME requis pour --from-db")
        return 1

    mclient = AsyncIOMotorClient(mongo_url)
    db = mclient[db_name]
    discord_translate.init(db)

    count = 0
    bot_id = await _bot_me(client, token) or ""
    async for doc in db.discord_translatable_messages.find({}, {"message_id": 1, "channel_id": 1}):
        channel_id = str(doc.get("channel_id") or "")
        message_id = str(doc.get("message_id") or "")
        if not channel_id or not message_id:
            continue

        mr = await client.get(
            f"{DISCORD_API}/channels/{channel_id}/messages/{message_id}",
            headers=_headers(token),
        )
        if mr.status_code != 200:
            print(f"  skip {message_id} — introuvable ({mr.status_code})")
            continue

        msg = mr.json()
        if not _needs_patch(msg, bot_id=bot_id):
            print(f"  skip {message_id} — déjà à jour ou non éligible")
            continue

        status = await _patch_message(client, token, channel_id, message_id, confirm=confirm)
        print(f"  {status}: #{channel_id} / {message_id}")
        count += 1
        await asyncio.sleep(0.35)

    mclient.close()
    print(f"Total: {count} message(s)")
    return 0


async def _bot_me(client: httpx.AsyncClient, token: str) -> str | None:
    r = await client.get(f"{DISCORD_API}/users/@me", headers=_headers(token))
    if r.status_code == 200:
        return str(r.json().get("id") or "")
    return None


async def patch_scan_pinned(
    client: httpx.AsyncClient,
    token: str,
    channel_ids: list[str],
    *,
    confirm: bool,
) -> int:
    bot_id = await _bot_me(client, token)
    if not bot_id:
        print("Impossible de récupérer l'ID du bot")
        return 1

    count = 0
    for channel_id in channel_ids:
        pinned = await _fetch_pinned(client, token, channel_id)
        if not pinned:
            print(f"  #{channel_id} — aucun épinglé")
            continue

        for msg in pinned:
            message_id = str(msg.get("id") or "")
            if not _needs_patch(msg, bot_id=bot_id):
                continue
            status = await _patch_message(client, token, channel_id, message_id, confirm=confirm)
            print(f"  {status}: #{channel_id} / {message_id} (épinglé)")
            count += 1
            await asyncio.sleep(0.35)

    print(f"Total: {count} message(s)")
    return 0


async def main() -> int:
    parser = argparse.ArgumentParser(description="PATCH menu traduction Discord (option B)")
    parser.add_argument("--confirm", action="store_true", help="Appliquer les modifications")
    parser.add_argument("--dry-run", action="store_true", help="Simuler sans PATCH (défaut)")
    parser.add_argument("--from-db", action="store_true", help="Messages enregistrés dans MongoDB")
    parser.add_argument("--scan-pinned", action="store_true", help="Messages épinglés des salons officiels")
    parser.add_argument("--channel-id", action="append", default=[], help="Salon (répétable)")
    parser.add_argument("--message-id", help="Message unique (requiert --channel-id)")
    args = parser.parse_args()

    confirm = args.confirm and not args.dry_run
    if not confirm:
        print("Mode dry-run — ajoute --confirm pour appliquer\n")

    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    if not token:
        print("DISCORD_BOT_TOKEN manquant")
        return 1

    async with httpx.AsyncClient(timeout=20.0) as client:
        if args.message_id:
            if not args.channel_id or len(args.channel_id) != 1:
                print("--message-id requiert exactement un --channel-id")
                return 1
            channel_id = args.channel_id[0]
            status = await _patch_message(
                client, token, channel_id, args.message_id, confirm=confirm,
            )
            print(f"{status}: #{channel_id} / {args.message_id}")
            return 0

        if args.from_db:
            return await patch_from_db(client, token, confirm=confirm)

        if args.scan_pinned:
            channels = args.channel_id or DEFAULT_WELCOME_CHANNEL_IDS
            return await patch_scan_pinned(client, token, channels, confirm=confirm)

        parser.print_help()
        print("\nExemple: python scripts/patch_discord_translate_menus.py --confirm --scan-pinned")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
