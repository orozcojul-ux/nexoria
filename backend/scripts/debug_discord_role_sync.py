#!/usr/bin/env python3
"""Debug Discord language/country role sync for a NEXORIA user.

Usage:
  python scripts/debug_discord_role_sync.py --username "PSEUDO"
  python scripts/debug_discord_role_sync.py --user-id "USER_ID"
  python scripts/debug_discord_role_sync.py --apply --username "PSEUDO"
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from motor.motor_asyncio import AsyncIOMotorClient

import discord_international as di
import discord_sync


def _connect():
    mongo_url = os.environ.get("MONGO_URL", "").strip()
    db_name = os.environ.get("DB_NAME", "nexoria").strip()
    if not mongo_url:
        raise SystemExit("MONGO_URL manquant — chargez le .env backend existant (sans le modifier).")
    client = AsyncIOMotorClient(mongo_url)
    return client, client[db_name]


def _env_status() -> dict:
    keys = [
        "DISCORD_SYNC_ENABLED",
        "DISCORD_BOT_TOKEN",
        "DISCORD_GUILD_ID",
    ]
    for spec in di.LANGUAGE_SPECS:
        keys.append(spec["role_env"])
    for spec in di.COUNTRY_SPECS:
        keys.append(spec["role_env"])
    out = {}
    for key in keys:
        val = os.environ.get(key, "").strip()
        if key == "DISCORD_BOT_TOKEN":
            out[key] = "set" if val else "missing"
        else:
            out[key] = val or "missing"
    return out


def _expected_roles(user: dict) -> dict:
    lang = di.get_user_preferred_language_from_profile(user)
    country = (user.get("country_code") or "").strip().lower() or None
    return {
        "language": lang,
        "languageRoleId": di.language_role_id(lang),
        "country": country,
        "countryRoleId": di.country_role_id(country) if country else None,
    }


async def _fetch_member_roles(discord_id: str) -> tuple[dict | None, list[str]]:
    if not discord_sync.is_configured():
        return None, []
    import httpx

    cfg = discord_sync._config()
    async with httpx.AsyncClient(timeout=15.0) as client:
        member = await discord_sync._fetch_member(client, cfg["guild_id"], discord_id, cfg["token"])
    if not member:
        return None, []
    return member, list(member.get("roles") or [])


async def run(args: argparse.Namespace) -> int:
    client, db = _connect()
    try:
        query = {}
        if args.user_id:
            query["user_id"] = args.user_id
        elif args.username:
            query["username"] = {"$regex": f"^{args.username}$", "$options": "i"}
        else:
            raise SystemExit("Indiquez --username ou --user-id")

        user = await db.users.find_one(query, {"_id": 0})
        if not user:
            print("Utilisateur introuvable.")
            return 1

        print("=== Utilisateur ===")
        print(json.dumps({
            "user_id": user.get("user_id"),
            "username": user.get("username"),
            "language": user.get("language"),
            "preferredLanguage": user.get("language"),
            "country": user.get("country_code"),
            "country_code": user.get("country_code"),
            "discordId": user.get("discord_id"),
            "discord_linked": bool(user.get("discord_id")),
        }, indent=2, ensure_ascii=False))

        print("\n=== Variables .env (sans token) ===")
        print(json.dumps(_env_status(), indent=2, ensure_ascii=False))

        print("\n=== Rôles attendus ===")
        print(json.dumps(_expected_roles(user), indent=2, ensure_ascii=False))

        print("\n=== État sync Discord ===")
        print(json.dumps({
            "sync_enabled": discord_sync.is_sync_enabled(),
            "configured": discord_sync.is_configured(),
        }, indent=2))

        discord_id = user.get("discord_id")
        if discord_id:
            member, roles = await _fetch_member_roles(str(discord_id))
            if member is None:
                print("\nMembre Discord: introuvable sur le serveur (not_in_guild)")
            else:
                lang_map, country_map, lang_ids, country_ids = di._collect_role_env_maps()
                intl = set(roles) & (lang_ids | country_ids)
                print("\n=== Membre Discord ===")
                print(json.dumps({
                    "discordId": discord_id,
                    "rolesCount": len(roles),
                    "internationalRolesOnMember": sorted(intl),
                    "languageRoleOnMember": di.role_id_to_language(roles),
                    "countryRoleOnMember": di.role_id_to_country(roles),
                }, indent=2, ensure_ascii=False))
        else:
            print("\nMembre Discord: compte non lié")

        if args.apply:
            print("\n=== Application sync ===")
            result = await di.sync_discord_language_country_roles(db, user)
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print("\nDry-run — ajoutez --apply pour lancer sync_discord_language_country_roles().")

        return 0
    finally:
        client.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Debug sync rôles langue/pays Discord")
    parser.add_argument("--username", help="Pseudo NEXORIA")
    parser.add_argument("--user-id", help="user_id NEXORIA")
    parser.add_argument("--apply", action="store_true", help="Exécute la synchronisation")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(run(args)))


if __name__ == "__main__":
    main()
