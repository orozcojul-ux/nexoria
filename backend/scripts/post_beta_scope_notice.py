"""Publie le rappel du périmètre beta dans #beta-test (sans purger le salon)."""
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

API = "https://discord.com/api/v10"
CHANNEL = os.environ.get("DISCORD_BETA_TEST_CHANNEL_ID", "1517470908476821575")


async def main():
    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    if not token:
        return 1
    embed = {
        "title": "⚠️ Périmètre du beta — à lire avant de tester",
        "description": (
            "Pour l'instant, le beta couvre **uniquement le site web Nexoria** "
            "(inscription, profil, forum, boutique, quêtes…).\n\n"
            "**Nexus Online** (monde virtuel / MMO) **n'est pas du tout développé** — "
            "aucune zone, avatar 3D ou gameplay n'est disponible pour le moment.\n\n"
            "Merci de signaler **uniquement les bugs et retours du site** dans ce salon."
        ),
        "color": 0xF59E0B,
        "footer": {"text": "NEXORIA — Programme Beta"},
    }
    payload = discord_translate.attach_translate_components({"embeds": [embed]})
    h = {"Authorization": f"Bot {token}", "User-Agent": "Nexoria/1.0", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(f"{API}/channels/{CHANNEL}/messages", headers=h, json=payload)
        if r.status_code in (200, 201):
            await discord_translate.after_post(CHANNEL, r.json(), source_lang="fr")
            print("OK")
        else:
            print(f"FAIL {r.status_code} {r.text[:200]}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
