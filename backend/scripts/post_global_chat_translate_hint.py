#!/usr/bin/env python3
"""Publie le rappel traduction 🌍 dans #global-chat (à épingler manuellement).

Usage :
  cd backend
  python scripts/post_global_chat_translate_hint.py              # dry-run
  python scripts/post_global_chat_translate_hint.py --confirm
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import discord_translate

GLOBAL_CHAT_HINT = (
    "🌍 **Traduire un message**\n"
    "Pour traduire un message dans ce salon, réagis simplement avec **🌍** dessus.\n"
    "Le bot t'enverra la traduction dans ta langue (rôle Langue choisi à l'arrivée sur le serveur).\n"
    "Si tes messages privés sont fermés, le bot répondra discrètement ici (message supprimé après 60 s).\n\n"
    "Tu peux aussi utiliser **clic droit → Applications → Traduire ce message**."
)


async def main(confirm: bool) -> None:
    channel_id = os.environ.get("DISCORD_CHANNEL_GLOBAL_CHAT_ID", "").strip()
    if not channel_id:
        print("DISCORD_CHANNEL_GLOBAL_CHAT_ID manquant.", file=sys.stderr)
        sys.exit(1)
    print(f"Salon cible : {channel_id}")
    print(GLOBAL_CHAT_HINT)
    if not confirm:
        print("\nDry-run — relance avec --confirm pour publier.")
        return
    sent = await discord_translate.send_discord_message(channel_id, GLOBAL_CHAT_HINT)
    if not sent:
        print("Échec envoi message.", file=sys.stderr)
        sys.exit(1)
    print(f"Message publié (id={sent.get('id')}). Épingle-le dans Discord si souhaité.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--confirm", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.confirm))
