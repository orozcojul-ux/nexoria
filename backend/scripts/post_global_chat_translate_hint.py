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
    "🌍 **Traduire un message**\n\n"
    "Pour traduire un message :\n"
    "• clique sur un bouton **🌍 Traduire** lorsqu'il est disponible ;\n"
    "• ou utilise **`/traduire`** (avec le lien du message, ou sans argument pour le dernier message) ;\n"
    "• ou **clic droit → Applications → Traduire ce message**.\n\n"
    "La traduction s'affichera **pour toi uniquement** (réponse éphémère) quand Discord le permet.\n\n"
    "Tu peux aussi réagir avec **🌍** sur un message : le bot répondra brièvement dans le salon "
    "(message supprimé après 60 s, visible par tous le temps d'affichage)."
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
