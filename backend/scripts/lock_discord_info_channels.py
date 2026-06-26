"""Verrouille les salons informatifs Discord (lecture seule pour @everyone).

Les joueurs peuvent lire mais pas écrire dans bienvenue, règlement, annonces, FAQ, etc.
Ne modifie jamais les salons de discussion ouverts (global-chat, langues, inscriptions-beta…).

Usage (depuis backend/) :
    python scripts/lock_discord_info_channels.py              # dry-run
    python scripts/lock_discord_info_channels.py --confirm    # applique
"""
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

import discord_international as di

DISCORD_API = "https://discord.com/api/v10"

# Permissions Discord (decimal)
PERM_VIEW = 1024
PERM_SEND = 2048
PERM_HISTORY = 65536
PERM_ADD_REACTIONS = 64
PERM_EMBED = 16384
PERM_ATTACH = 32768
PERM_MANAGE_MESSAGES = 8192
PERM_MANAGE_THREADS = 17179869184
PERM_CREATE_PUBLIC_THREADS = 34359738368
PERM_SEND_IN_THREADS = 17179869184

ROLE_GARDIEN = os.environ.get("DISCORD_GUARDIAN_ROLE_ID", "1515273093483073667").strip()
ROLE_SAGE = os.environ.get("DISCORD_SAGE_ROLE_ID", "1515273094258888775").strip()
ROLE_SENTINELLE = os.environ.get("DISCORD_SENTINELLE_ROLE_ID", "1515273095663980554").strip()

TEXT_TYPES = {0, 5, 15, 16}

# Salons informatifs connus (IDs du serveur NEXORIA)
LOCK_CHANNEL_IDS = {
    "1514271114405216359",  # bienvenue
    "1514271110101995651",  # règlement
    "1514271112136228864",  # annonces
    "1514271204481962146",  # faq
    "1514271116582191158",  # lore-du-monde
    "1514271118532411565",  # classes-et-races
    "1514271120415658115",  # création-de-perso
    "1514271180268240977",  # paroles-de-l-oracle
    "1514271122412146739",  # rôles-et-titres
    "1515325507208745080",  # chroniques-du-nexus
}

# Ne jamais modifier ces salons (discussion, beta, staff, international)
SKIP_CHANNEL_IDS = {
    "1517470910427168770",  # inscriptions-beta (forum public)
    "1517470908476821575",  # beta-test (privé)
    "1517470912256016534",  # salon-vip
    "1514271209272115200",  # conseil — modération
    "1514271211679650013",
    "1514271214607007935",
    "1514271217077452962",
    # AVENTURE — discussion
    "1514271126694662387",  # hub
    "1514271132667347055",  # xp / récompenses
    "1514271130557612052",  # inventaire
    "1514271140338470932",  # failles
    # GUILDES
    "1514271154213355540",
    "1514271156042203377",
    # ÉVÉNEMENTS
    "1514271167785996360",
    "1514271172647325768",
    # CRÉATIONS
    "1514271191094001765",
    "1514271194508034049",
}

LOCK_NAME_FRAGMENTS = (
    "bienvenue",
    "règlement",
    "reglement",
    "annonces",
    "faq",
    "lore",
    "classes",
    "création-de-perso",
    "creation-de-perso",
    "oracle",
    "paroles-de-l-oracle",
    "rôles-et-titres",
    "roles-et-titres",
    "chroniques",
    "news-du-royaume",
    "news",
    "guides",
    "maintenance",
    "présentation",
    "presentation",
)

OPEN_NAME_FRAGMENTS = (
    "global-chat",
    "global_chat",
    "inscriptions-beta",
    "inscription-beta",
    "beta-test",
    "salon-vip",
    "français",
    "francais",
    "english",
    "español",
    "espanol",
    "deutsch",
    "italiano",
    "português",
    "portugues",
    "nederlands",
    "日本語",
    "hub",
    "guilde",
    "ordre",
    "événement",
    "evenement",
    "création",
    "creation",
    "troc",
    "commerce",
    "faille",
    "inventaire",
    "xp",
    "récompense",
    "recompense",
    "conseil",
    "modération",
    "moderation",
)


def headers(token: str, *, json: bool = False) -> dict:
    h = {"Authorization": f"Bot {token}", "User-Agent": "Nexoria/1.0"}
    if json:
        h["Content-Type"] = "application/json"
    return h


def staff_role_ids() -> list[str]:
    return [r for r in (ROLE_GARDIEN, ROLE_SAGE, ROLE_SENTINELLE) if r]


def channel_name(ch: dict) -> str:
    return (ch.get("name") or "").lower()


def matches_fragment(name: str, fragments: tuple[str, ...]) -> bool:
    return any(frag in name for frag in fragments)


def classify_channel(ch: dict) -> str:
    """Retourne 'skip', 'open' ou 'lock'."""
    cid = ch.get("id", "")
    if ch.get("type") not in TEXT_TYPES:
        return "skip"
    if cid in SKIP_CHANNEL_IDS:
        return "skip"
    if cid in LOCK_CHANNEL_IDS:
        return "lock"

    name = channel_name(ch)

    # Salons langue (international)
    for spec in di.LANGUAGE_SPECS:
        if spec["channel_name"].lower().replace("┃", "").replace("|", "") in name.replace("┃", ""):
            return "open"
    if di.GLOBAL_CHAT_NAME.lower().replace("┃", "") in name.replace("┃", ""):
        return "open"

    if matches_fragment(name, OPEN_NAME_FRAGMENTS):
        return "open"
    if matches_fragment(name, LOCK_NAME_FRAGMENTS):
        return "lock"

    # Annonces Discord (type 5) hors liste ouverte → informatif
    if ch.get("type") == 5:
        return "lock"

    return "skip"


def info_lock_overwrites(guild_id: str, bot_user_id: str) -> list[dict]:
    """@everyone lecture seule ; staff + bot peuvent poster."""
    everyone_allow = PERM_VIEW | PERM_HISTORY | PERM_ADD_REACTIONS
    everyone_deny = PERM_SEND | PERM_CREATE_PUBLIC_THREADS | PERM_SEND_IN_THREADS

    rows: list[dict] = [{
        "id": guild_id,
        "type": 0,
        "allow": str(everyone_allow),
        "deny": str(everyone_deny),
    }]

    staff_allow = (
        PERM_VIEW | PERM_SEND | PERM_HISTORY
        | PERM_MANAGE_MESSAGES | PERM_MANAGE_THREADS
    )
    for rid in staff_role_ids():
        rows.append({"id": rid, "type": 0, "allow": str(staff_allow)})

    if bot_user_id:
        bot_allow = (
            PERM_VIEW | PERM_SEND | PERM_HISTORY
            | PERM_EMBED | PERM_ATTACH | PERM_MANAGE_MESSAGES
        )
        rows.append({"id": bot_user_id, "type": 1, "allow": str(bot_allow)})

    return rows


async def fetch_bot_user_id(client: httpx.AsyncClient, token: str) -> str:
    r = await client.get(f"{DISCORD_API}/users/@me", headers=headers(token))
    if r.status_code == 200:
        return str(r.json().get("id") or "")
    return ""


async def patch_channel_permissions(
    client: httpx.AsyncClient,
    channel_id: str,
    guild_id: str,
    bot_user_id: str,
    token: str,
    *,
    confirm: bool,
) -> bool:
    overwrites = info_lock_overwrites(guild_id, bot_user_id)
    if not confirm:
        return True
    r = await client.patch(
        f"{DISCORD_API}/channels/{channel_id}",
        headers=headers(token, json=True),
        json={"permission_overwrites": overwrites},
    )
    return r.status_code == 200


async def run(confirm: bool) -> int:
    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    guild_id = os.environ.get("DISCORD_GUILD_ID", "").strip()
    if not token or not guild_id:
        print("DISCORD_BOT_TOKEN ou DISCORD_GUILD_ID manquant.", file=sys.stderr)
        return 1

    mode = "CONFIRM — application" if confirm else "DRY-RUN"
    print(f"=== lock_discord_info_channels ({mode}) ===\n")

    async with httpx.AsyncClient(timeout=30.0) as client:
        bot_user_id = await fetch_bot_user_id(client, token)
        r = await client.get(
            f"{DISCORD_API}/guilds/{guild_id}/channels",
            headers=headers(token),
        )
        if r.status_code != 200:
            print(f"Erreur lecture salons: HTTP {r.status_code}", file=sys.stderr)
            return 1
        channels = r.json()

        to_lock: list[dict] = []
        skipped: list[dict] = []
        open_channels: list[dict] = []

        for ch in channels:
            kind = classify_channel(ch)
            if kind == "lock":
                to_lock.append(ch)
            elif kind == "open":
                open_channels.append(ch)
            else:
                skipped.append(ch)

        print(f"Salons à verrouiller ({len(to_lock)}) :")
        for ch in sorted(to_lock, key=lambda c: c.get("name", "")):
            print(f"  🔒 {ch['id']}  #{ch.get('name')}")
            print(
                "     @everyone: voir=lire réactions=oui | envoyer=non | threads=non"
            )
            print(
                "     staff/bot: envoyer=oui | gérer messages=oui"
            )

        print(f"\nSalons ouverts — ignorés ({len(open_channels)}) :")
        for ch in sorted(open_channels, key=lambda c: c.get("name", "")):
            print(f"  ✅ {ch['id']}  #{ch.get('name')}")

        print(f"\nAutres — ignorés ({len(skipped)}) :")
        for ch in sorted(skipped, key=lambda c: c.get("name", ""))[:20]:
            print(f"  — {ch['id']}  #{ch.get('name')} (type={ch.get('type')})")
        if len(skipped) > 20:
            print(f"  … et {len(skipped) - 20} autres")

        if not confirm:
            print("\nDry-run — relance avec --confirm pour appliquer.")
            return 0

        ok = 0
        fail = 0
        for ch in to_lock:
            cid = ch["id"]
            success = await patch_channel_permissions(
                client, cid, guild_id, bot_user_id, token, confirm=True,
            )
            if success:
                ok += 1
                print(f"  ✓ verrouillé #{ch.get('name')}")
            else:
                fail += 1
                print(f"  ✗ échec #{ch.get('name')} ({cid})")
            await asyncio.sleep(0.4)

        print(f"\nTerminé: {ok} verrouillé(s), {fail} échec(s).")
        return 0 if fail == 0 else 1


def main() -> None:
    parser = argparse.ArgumentParser(description="Verrouille les salons informatifs Discord")
    parser.add_argument("--confirm", action="store_true", help="Applique les changements")
    args = parser.parse_args()
    sys.exit(asyncio.run(run(args.confirm)))


if __name__ == "__main__":
    main()
