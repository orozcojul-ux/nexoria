"""Audit Discord guild — liste rôles, catégories, salons (sans modifier)."""
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import httpx

API = "https://discord.com/api/v10"
TYPES = {0: "text", 2: "voice", 4: "category", 5: "announce", 13: "stage", 15: "forum", 16: "media"}


def headers(token: str) -> dict:
    return {"Authorization": f"Bot {token}", "User-Agent": "Nexoria/1.0"}


async def main():
    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    guild = os.environ.get("DISCORD_GUILD_ID", "").strip()
    if not token or not guild:
        print("Missing token/guild")
        return 1

    async with httpx.AsyncClient(timeout=30.0) as c:
        roles = (await c.get(f"{API}/guilds/{guild}/roles", headers=headers(token))).json()
        chans = (await c.get(f"{API}/guilds/{guild}/channels", headers=headers(token))).json()

    print("=== ROLES ===")
    for r in sorted(roles, key=lambda x: -x.get("position", 0)):
        print(f"  {r['id']}  {r['name']}  pos={r['position']}")

    cats = {ch["id"]: ch["name"] for ch in chans if ch.get("type") == 4}
    print("\n=== CHANNELS ===")
    for ch in sorted(chans, key=lambda x: (x.get("parent_id") or "0", x.get("position", 0))):
        t = TYPES.get(ch.get("type"), str(ch.get("type")))
        pid = ch.get("parent_id")
        cat = cats.get(pid, "-") if pid else "(root)"
        topic = (ch.get("topic") or "")[:60]
        print(f"  {ch['id']}  [{t}]  cat={cat}  name={ch.get('name')}  topic={topic!r}")

    # Messages count per text/forum channel
    print("\n=== RECENT MESSAGES (first channel sample) ===")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
