"""Post the beta scope reminder in #beta-test (does not purge the channel)."""
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
        "title": "⚠️ Beta scope — read before testing",
        "description": (
            "For now, the beta covers **the Nexoria website only** "
            "(signup, profile, forum, shop, quests, etc.).\n\n"
            "**Nexus Online** (virtual world / MMO) **is not developed at all** — "
            "no zones, 3D avatars, or gameplay are available yet.\n\n"
            "Please report **website bugs and feedback only** in this channel."
        ),
        "color": 0xF59E0B,
        "footer": {"text": "NEXORIA — Beta Program"},
    }
    payload = discord_translate.attach_translate_components({"embeds": [embed]})
    h = {"Authorization": f"Bot {token}", "User-Agent": "Nexoria/1.0", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(f"{API}/channels/{CHANNEL}/messages", headers=h, json=payload)
        print("OK" if r.status_code in (200, 201) else f"FAIL {r.status_code} {r.text[:200]}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
