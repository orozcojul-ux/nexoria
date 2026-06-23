#!/usr/bin/env python3
"""Enregistre les commandes Discord de traduction (context menu + slash /traduire).

Usage (depuis backend/) :
  python scripts/register_discord_translate_commands.py              # dry-run
  python scripts/register_discord_translate_commands.py --confirm    # enregistre

Variables requises :
  DISCORD_BOT_TOKEN
  DISCORD_CLIENT_ID  (Application ID du bot)
"""
from __future__ import annotations

import argparse
import json
import os
import sys

import httpx

DISCORD_API = "https://discord.com/api/v10"

CONTEXT_MENU_COMMAND = {
    "name": "Traduire ce message",
    "type": 3,
    "dm_permission": True,
}

SLASH_COMMAND = {
    "name": "traduire",
    "description": "Traduire un message (réponse privée pour toi dans le salon)",
    "type": 1,
    "dm_permission": True,
    "options": [
        {
            "name": "message",
            "description": "URL ou ID du message (optionnel — sinon le dernier message)",
            "type": 3,
            "required": False,
        },
        {
            "name": "langue",
            "description": "Langue cible (optionnel — sinon rôle Langue)",
            "type": 3,
            "required": False,
            "choices": [
                {"name": "Français", "value": "fr"},
                {"name": "English", "value": "en"},
                {"name": "Español", "value": "es"},
                {"name": "Deutsch", "value": "de"},
                {"name": "Italiano", "value": "it"},
                {"name": "Português BR", "value": "pt"},
                {"name": "Nederlands", "value": "nl"},
                {"name": "日本語", "value": "ja"},
            ],
        },
    ],
}

COMMANDS = [CONTEXT_MENU_COMMAND, SLASH_COMMAND]


def _load_env() -> tuple[str, str]:
    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    client_id = os.environ.get("DISCORD_CLIENT_ID", "").strip()
    if not token:
        print("DISCORD_BOT_TOKEN manquant.", file=sys.stderr)
        sys.exit(1)
    if not client_id:
        print("DISCORD_CLIENT_ID manquant.", file=sys.stderr)
        sys.exit(1)
    return token, client_id


def main() -> None:
    parser = argparse.ArgumentParser(description="Enregistre les commandes traduction Discord")
    parser.add_argument("--confirm", action="store_true", help="Envoie les commandes à l'API Discord")
    args = parser.parse_args()

    token, client_id = _load_env()
    url = f"{DISCORD_API}/applications/{client_id}/commands"
    headers = {
        "Authorization": f"Bot {token}",
        "Content-Type": "application/json",
        "User-Agent": "Nexoria/1.0",
    }

    print("Commandes à enregistrer :")
    print(json.dumps(COMMANDS, ensure_ascii=False, indent=2))
    print(f"\nEndpoint : PUT {url}")

    if not args.confirm:
        print("\nDry-run — relance avec --confirm pour enregistrer.")
        return

    with httpx.Client(timeout=30.0) as client:
        r = client.put(url, headers=headers, json=COMMANDS)
        if r.status_code not in (200, 201):
            print(f"Échec HTTP {r.status_code}: {r.text[:500]}", file=sys.stderr)
            sys.exit(1)
        registered = r.json()
        print(f"\n{len(registered)} commande(s) enregistrée(s) :")
        for cmd in registered:
            print(f"  - {cmd.get('name')} (id={cmd.get('id')}, type={cmd.get('type')})")
        print("\nLes commandes peuvent prendre quelques minutes à apparaître dans Discord.")


if __name__ == "__main__":
    main()
