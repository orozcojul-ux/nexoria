"""Diagnostic Discord forum auth — n'affiche pas les secrets."""
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
CHANNEL_ID = os.environ.get("DISCORD_AUTH_FORUM_CHANNEL_ID", "1515325507208745080").strip()
TOKEN = os.environ.get("DISCORD_BOT_TOKEN", "").strip()

CHANNEL_TYPES = {0: "text", 15: "forum", 5: "announcement"}


def headers():
    return {"Authorization": f"Bot {TOKEN}", "User-Agent": "Nexoria/1.0"}


async def try_thread(client, ch_type: int, tags: list) -> tuple[int, str]:
    payload = {
        "name": "Test diagnostic NEXORIA",
        "auto_archive_duration": 60,
        "message": {
            "embeds": [{
                "title": "Test connexion",
                "description": "Message de test diagnostic.",
                "color": 3447003,
            }],
        },
    }
    if ch_type == 0:
        payload["type"] = 11  # public thread in text channel
    if tags:
        payload["applied_tags"] = [tags[0]["id"]]

    r = await client.post(
        f"{DISCORD_API}/channels/{CHANNEL_ID}/threads",
        headers={**headers(), "Content-Type": "application/json"},
        json=payload,
    )
    return r.status_code, r.text[:800]


async def try_message(client) -> tuple[int, str]:
    r = await client.post(
        f"{DISCORD_API}/channels/{CHANNEL_ID}/messages",
        headers={**headers(), "Content-Type": "application/json"},
        json={
            "embeds": [{
                "title": "Test message direct",
                "description": "Fallback message dans le salon.",
                "color": 3066993,
            }],
        },
    )
    return r.status_code, r.text[:800]


async def main():
    print("=== Diagnostic forum auth Discord ===")
    print(f"DISCORD_BOT_TOKEN present: {bool(TOKEN)}")
    print(f"DISCORD_AUTH_FORUM_CHANNEL_ID: {CHANNEL_ID or '(vide)'}")

    if not TOKEN:
        print("ERREUR: DISCORD_BOT_TOKEN manquant dans backend/.env")
        return 1

    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(f"{DISCORD_API}/channels/{CHANNEL_ID}", headers=headers())
        print(f"\nGET channel -> {r.status_code}")
        if r.status_code != 200:
            print(r.text[:500])
            return 1

        ch = r.json()
        ch_type = ch.get("type", -1)
        print(f"type: {ch_type} ({CHANNEL_TYPES.get(ch_type, 'autre')})")
        print(f"name: {ch.get('name', '?')}")
        tags = ch.get("available_tags") or []
        print(f"available_tags: {len(tags)}")

        code, body = await try_thread(client, ch_type, tags)
        print(f"\nPOST thread -> {code}")
        print(body)

        if code not in (200, 201):
            code2, body2 = await try_message(client)
            print(f"\nPOST message (fallback) -> {code2}")
            print(body2)
            return 0 if code2 in (200, 201) else 1

        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
