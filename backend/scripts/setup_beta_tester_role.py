"""Crée le rôle Discord Beta testeur et sécurise #beta-test.

Usage (depuis backend/) :
    python scripts/setup_beta_tester_role.py
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import httpx

DISCORD_API = "https://discord.com/api/v10"
ROLE_NAME = "🧪 Beta Tester"
ROLE_COLOR = 0xA78BFA

ROLE_GARDIEN = os.environ.get("DISCORD_GUARDIAN_ROLE_ID", "1515273093483073667").strip()
ROLE_SAGE = os.environ.get("DISCORD_SAGE_ROLE_ID", "1515273094258888775").strip()
ROLE_SENTINELLE = os.environ.get("DISCORD_SENTINELLE_ROLE_ID", "1515273095663980554").strip()
BETA_TEST_CHANNEL = os.environ.get("DISCORD_BETA_TEST_CHANNEL_ID", "1517470908476821575").strip()

PERM_VIEW, PERM_SEND, PERM_HISTORY = 1024, 2048, 65536


def headers(token: str, json: bool = False) -> dict:
    h = {"Authorization": f"Bot {token}", "User-Agent": "Nexoria/1.0"}
    if json:
        h["Content-Type"] = "application/json"
    return h


async def find_or_create_role(client: httpx.AsyncClient, guild_id: str, token: str) -> str:
    existing_id = os.environ.get("DISCORD_BETA_TESTER_ROLE_ID", "").strip()
    if existing_id:
        r = await client.get(f"{DISCORD_API}/guilds/{guild_id}/roles", headers=headers(token))
        if r.status_code == 200 and any(x["id"] == existing_id for x in r.json()):
            print(f"Rôle existant (.env) : {ROLE_NAME} ({existing_id})")
            return existing_id

    r = await client.get(f"{DISCORD_API}/guilds/{guild_id}/roles", headers=headers(token))
    r.raise_for_status()
    for role in r.json():
        if role.get("name") == ROLE_NAME:
            print(f"Rôle existant : {ROLE_NAME} ({role['id']})")
            return role["id"]

    r = await client.post(
        f"{DISCORD_API}/guilds/{guild_id}/roles",
        headers=headers(token, json=True),
        json={
            "name": ROLE_NAME,
            "color": ROLE_COLOR,
            "hoist": True,
            "mentionable": True,
            "permissions": "0",
        },
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Création rôle échouée: {r.status_code} {r.text[:400]}")
    role_id = r.json()["id"]
    print(f"Rôle créé : {ROLE_NAME} ({role_id})")
    return role_id


def beta_channel_overwrites(guild_id: str, beta_role_id: str) -> list[dict]:
    staff = [ROLE_GARDIEN, ROLE_SAGE, ROLE_SENTINELLE]
    rows = [{"id": guild_id, "type": 0, "deny": str(PERM_VIEW | PERM_SEND)}]
    for rid in staff:
        if rid:
            rows.append({"id": rid, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)})
    if beta_role_id:
        rows.append({"id": beta_role_id, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)})
    return rows


async def patch_beta_channel(client: httpx.AsyncClient, guild_id: str, token: str, beta_role_id: str) -> None:
    if not BETA_TEST_CHANNEL:
        print("DISCORD_BETA_TEST_CHANNEL_ID manquant — salon non modifié")
        return
    payload = {
        "permission_overwrites": beta_channel_overwrites(guild_id, beta_role_id),
        "topic": "Beta testers only — bug reports and feedback (staff + Beta Tester role).",
    }
    r = await client.patch(
        f"{DISCORD_API}/channels/{BETA_TEST_CHANNEL}",
        headers=headers(token, json=True),
        json=payload,
    )
    if r.status_code == 200:
        print(f"Salon #beta-test mis à jour ({BETA_TEST_CHANNEL})")
    else:
        print(f"Échec patch salon: {r.status_code} {r.text[:300]}")


async def main() -> int:
    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    guild_id = os.environ.get("DISCORD_GUILD_ID", "").strip()
    if not token or not guild_id:
        print("ERREUR: DISCORD_BOT_TOKEN et DISCORD_GUILD_ID requis")
        return 1

    async with httpx.AsyncClient(timeout=30.0) as client:
        role_id = await find_or_create_role(client, guild_id, token)
        await patch_beta_channel(client, guild_id, token, role_id)

    print(f"\nAjoute dans backend/.env :\nDISCORD_BETA_TESTER_ROLE_ID={role_id}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
