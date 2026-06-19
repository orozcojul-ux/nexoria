"""Crée les salons Discord Beta & VIP avec icônes emoji + message formulaire.

Usage (depuis backend/) :
    python scripts/setup_discord_channels.py

Variables requises dans .env :
    DISCORD_BOT_TOKEN
    DISCORD_GUILD_ID
    DISCORD_VIP_ROLE_ID  (optionnel — restreint le salon VIP)

Ajoute dans .env les IDs retournés :
    DISCORD_BETA_TEST_CHANNEL_ID
    DISCORD_BETA_SIGNUP_CHANNEL_ID
    DISCORD_VIP_LOUNGE_CHANNEL_ID
"""
from __future__ import annotations

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

DISCORD_API = "https://discord.com/api/v10"
SITE_URL = os.environ.get("FRONTEND_URL", "https://nexoria.gg").rstrip("/")
ROLE_GARDIEN = os.environ.get("DISCORD_GUARDIAN_ROLE_ID", "1515273093483073667").strip()
ROLE_SAGE = os.environ.get("DISCORD_SAGE_ROLE_ID", "1515273094258888775").strip()
ROLE_SENTINELLE = os.environ.get("DISCORD_SENTINELLE_ROLE_ID", "1515273095663980554").strip()
ROLE_BETA_TESTER = os.environ.get("DISCORD_BETA_TESTER_ROLE_ID", "").strip()
PERM_VIEW, PERM_SEND, PERM_HISTORY = 1024, 2048, 65536


def _beta_test_overwrites(guild_id: str) -> list[dict]:
    rows = [{"id": guild_id, "type": 0, "deny": str(PERM_VIEW | PERM_SEND)}]
    for rid in (ROLE_GARDIEN, ROLE_SAGE, ROLE_SENTINELLE):
        if rid:
            rows.append({"id": rid, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)})
    if ROLE_BETA_TESTER:
        rows.append({"id": ROLE_BETA_TESTER, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)})
    return rows

CATEGORY_NAME = "🌌 Beta & VIP"
CHANNELS = [
    {
        "env": "DISCORD_BETA_TEST_CHANNEL_ID",
        "name": "🧪┃beta-test",
        "type": 0,  # text
        "topic": "Salon réservé aux beta testeurs de NEXORIA — bugs, retours et previews.",
        "beta_test_only": True,
    },
    {
        "env": "DISCORD_BETA_SIGNUP_CHANNEL_ID",
        "name": "📝┃inscriptions-beta",
        "type": 0,
        "topic": "Candidatures beta — salon privé Conseil (Sages). Formulaire sur la page maintenance.",
        "staff_only": True,
    },
    {
        "env": "DISCORD_VIP_LOUNGE_CHANNEL_ID",
        "name": "👑┃salon-vip",
        "type": 0,
        "topic": "Salon exclusif Pass Ascendant — avantages, previews et entraide VIP.",
        "vip_only": True,
    },
]


def headers(token: str) -> dict:
    return {"Authorization": f"Bot {token}", "User-Agent": "Nexoria/1.0"}


async def find_or_create_category(client: httpx.AsyncClient, guild_id: str, token: str) -> str:
    r = await client.get(f"{DISCORD_API}/guilds/{guild_id}/channels", headers=headers(token))
    r.raise_for_status()
    for ch in r.json():
        if ch.get("type") == 4 and ch.get("name") == CATEGORY_NAME:
            print(f"Catégorie existante : {CATEGORY_NAME} ({ch['id']})")
            return ch["id"]

    r = await client.post(
        f"{DISCORD_API}/guilds/{guild_id}/channels",
        headers={**headers(token), "Content-Type": "application/json"},
        json={"name": CATEGORY_NAME, "type": 4, "position": 0},
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Création catégorie échouée: {r.status_code} {r.text[:400]}")
    cat_id = r.json()["id"]
    print(f"Catégorie créée : {CATEGORY_NAME} ({cat_id})")
    return cat_id


async def find_channel_by_name(client: httpx.AsyncClient, guild_id: str, token: str, name: str) -> dict | None:
    r = await client.get(f"{DISCORD_API}/guilds/{guild_id}/channels", headers=headers(token))
    r.raise_for_status()
    for ch in r.json():
        if ch.get("name") == name:
            return ch
    return None


async def create_channel(
    client: httpx.AsyncClient,
    guild_id: str,
    token: str,
    category_id: str,
    spec: dict,
    vip_role_id: str,
) -> str:
    existing = await find_channel_by_name(client, guild_id, token, spec["name"])
    if existing:
        ch_id = existing["id"]
        print(f"Salon existant : #{spec['name']} ({ch_id})")
        patch: dict = {"topic": spec.get("topic", "")}
        if spec.get("staff_only"):
            patch["permission_overwrites"] = [
                {"id": guild_id, "type": 0, "deny": str(PERM_VIEW | PERM_SEND)},
                {"id": ROLE_GARDIEN, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
                {"id": ROLE_SAGE, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
            ]
        elif spec.get("beta_test_only"):
            patch["permission_overwrites"] = _beta_test_overwrites(guild_id)
        elif spec.get("vip_only") and vip_role_id:
            patch["permission_overwrites"] = [
                {"id": guild_id, "type": 0, "deny": str(PERM_VIEW)},
                {"id": vip_role_id, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
                {"id": ROLE_GARDIEN, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
                {"id": ROLE_SAGE, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
            ]
        if len(patch) > 1 or patch.get("permission_overwrites"):
            r = await client.patch(
                f"{DISCORD_API}/channels/{ch_id}",
                headers={**headers(token), "Content-Type": "application/json"},
                json=patch,
            )
            if r.status_code == 200:
                print(f"  → permissions/topic mis à jour")
        return ch_id

    payload = {
        "name": spec["name"],
        "type": spec["type"],
        "parent_id": category_id,
        "topic": spec.get("topic", ""),
    }

    if spec.get("staff_only"):
        payload["permission_overwrites"] = [
            {"id": guild_id, "type": 0, "deny": str(PERM_VIEW | PERM_SEND)},
            {"id": ROLE_GARDIEN, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
            {"id": ROLE_SAGE, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
        ]
    elif spec.get("beta_test_only"):
        payload["permission_overwrites"] = _beta_test_overwrites(guild_id)
    elif spec.get("vip_only") and vip_role_id:
        payload["permission_overwrites"] = [
            {"id": guild_id, "type": 0, "deny": str(PERM_VIEW)},
            {"id": vip_role_id, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
            {"id": ROLE_GARDIEN, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
            {"id": ROLE_SAGE, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
        ]

    r = await client.post(
        f"{DISCORD_API}/guilds/{guild_id}/channels",
        headers={**headers(token), "Content-Type": "application/json"},
        json=payload,
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Création #{spec['name']} échouée: {r.status_code} {r.text[:400]}")
    ch_id = r.json()["id"]
    print(f"Salon créé : #{spec['name']} ({ch_id})")
    return ch_id


async def post_signup_form_message(client: httpx.AsyncClient, channel_id: str, token: str) -> None:
    embed = {
        "title": "📝 Beta Tester Sign-ups — 100 slots",
        "description": (
            "NEXORIA is recruiting **100 pioneers** to test the **website** before the official launch.\n\n"
            "**Important:** this beta does **not** cover **Nexus Online** (virtual world) — "
            "it is **not developed yet**.\n\n"
            "**How to apply:**\n"
            f"1. Fill out the form on the [maintenance page]({SITE_URL}/maintenance)\n"
            "2. Join the Discord if you haven't already\n"
            "3. Wait for team approval — you'll receive your beta key\n\n"
            "Each application appears automatically in this channel (Council only)."
        ),
        "color": 0xA78BFA,
        "fields": [
            {"name": "Slots", "value": "100 beta testers", "inline": True},
            {"name": "Tester channel", "value": "#🧪┃beta-test", "inline": True},
            {"name": "VIP", "value": "#👑┃salon-vip (Ascendant Pass)", "inline": True},
        ],
        "footer": {"text": "NEXORIA — Beta Program"},
    }
    payload = discord_translate.attach_translate_components({"embeds": [embed]})
    r = await client.post(
        f"{DISCORD_API}/channels/{channel_id}/messages",
        headers={**headers(token), "Content-Type": "application/json"},
        json=payload,
    )
    if r.status_code in (200, 201):
        print("Message formulaire publié dans #inscriptions-beta")
    else:
        print(f"Publication formulaire échouée: {r.status_code} {r.text[:300]}")


async def post_vip_welcome(client: httpx.AsyncClient, channel_id: str, token: str) -> None:
    embed = {
        "title": "👑 VIP Lounge — Ascendant Pass",
        "description": (
            "Welcome to the exclusive **Ascendant Pass** lounge.\n\n"
            "Chat with other VIPs, share your discoveries, "
            "and access previews reserved for premium members."
        ),
        "color": 0xF59E0B,
    }
    payload = discord_translate.attach_translate_components({"embeds": [embed]})
    r = await client.post(
        f"{DISCORD_API}/channels/{channel_id}/messages",
        headers={**headers(token), "Content-Type": "application/json"},
        json=payload,
    )
    if r.status_code in (200, 201):
        print("Message de bienvenue publié dans #salon-vip")
    else:
        print(f"Publication VIP échouée: {r.status_code} {r.text[:300]}")


async def main() -> int:
    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    guild_id = os.environ.get("DISCORD_GUILD_ID", "").strip()
    vip_role = os.environ.get("DISCORD_VIP_ROLE_ID", "").strip()

    print("=== Setup salons Discord Beta & VIP ===")
    if not token or not guild_id:
        print("ERREUR: DISCORD_BOT_TOKEN et DISCORD_GUILD_ID requis dans backend/.env")
        return 1

    ids: dict[str, str] = {}

    async with httpx.AsyncClient(timeout=30.0) as client:
        cat_id = await find_or_create_category(client, guild_id, token)
        for spec in CHANNELS:
            ch_id = await create_channel(client, guild_id, token, cat_id, spec, vip_role)
            ids[spec["env"]] = ch_id

        signup_id = ids.get("DISCORD_BETA_SIGNUP_CHANNEL_ID")
        vip_id = ids.get("DISCORD_VIP_LOUNGE_CHANNEL_ID")
        if signup_id:
            await post_signup_form_message(client, signup_id, token)
        if vip_id:
            await post_vip_welcome(client, vip_id, token)

    print("\n--- Ajoute ces lignes dans backend/.env ---")
    for env_key, ch_id in ids.items():
        print(f"{env_key}={ch_id}")
    print("-------------------------------------------")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
