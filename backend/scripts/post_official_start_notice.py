"""Publie l'annonce officielle « Nouveau départ » NEXORIA sur Discord."""
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

DISCORD_API = "https://discord.com/api/v10"
DEFAULT_ANNOUNCE_CHANNEL = "1514271112136228864"  # annonces officielles


def headers(token: str) -> dict:
    return {
        "Authorization": f"Bot {token}",
        "User-Agent": "Nexoria/1.0",
        "Content-Type": "application/json",
    }


async def post_notice(
    client: httpx.AsyncClient,
    channel_id: str,
    token: str,
    *,
    dry_run: bool = False,
) -> bool:
    embed = {
        "title": "⚜️ NEXORIA — Nouveau départ",
        "description": (
            "Le Nexus est désormais prêt.\n\n"
            "Les anciens messages de test ont été nettoyés. "
            "À partir de maintenant, l'activité affichée sur le Discord "
            "correspondra au **vrai lancement de NEXORIA**.\n\n"
            "Bienvenue aux héros du Nexus. ⚔️"
        ),
        "color": 0x7C3AED,
        "footer": {"text": "NEXORIA — forge ta légende"},
    }
    if dry_run:
        print(f"[dry-run] Annonce à poster dans {channel_id}")
        print(embed["title"])
        print(embed["description"])
        return True

    payload = discord_translate.attach_translate_components({"embeds": [embed]})
    r = await client.post(
        f"{DISCORD_API}/channels/{channel_id}/messages",
        headers=headers(token),
        json=payload,
    )
    if r.status_code in (200, 201):
        await discord_translate.after_post(channel_id, r.json(), source_lang="fr")
        return True
    print(f"Échec publication : HTTP {r.status_code} {r.text[:300]}")
    return False


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--channel-id",
        default=os.environ.get("DISCORD_ANNOUNCE_CHANNEL_ID", DEFAULT_ANNOUNCE_CHANNEL),
    )
    args = parser.parse_args()

    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    if not token:
        print("DISCORD_BOT_TOKEN manquant")
        return 1

    channel_id = (args.channel_id or DEFAULT_ANNOUNCE_CHANNEL).strip()
    async with httpx.AsyncClient(timeout=20.0) as client:
        ok = await post_notice(client, channel_id, token, dry_run=args.dry_run)
    print("OK" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
