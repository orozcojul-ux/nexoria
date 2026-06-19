"""Réorganise le serveur Discord NEXORIA sans supprimer aucun salon.

Actions :
  - Repositionne les catégories et salons
  - Restreint #inscriptions-beta aux Sages (+ Gardien Suprême)
  - Nettoie les messages de chaque salon texte/annonce
  - Republie un message de présentation par salon

Usage (depuis backend/) :
    python scripts/reorganize_discord_guild.py
    python scripts/reorganize_discord_guild.py --dry-run
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(SCRIPTS))
load_dotenv(ROOT / ".env")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import httpx

import discord_translate
from discord_channel_welcomes_fr import channel_welcomes

DISCORD_API = "https://discord.com/api/v10"
SITE_URL = os.environ.get("FRONTEND_URL", "https://nexoria.gg").rstrip("/")

# Rôles staff (ne jamais supprimer / toucher aux rôles classe & progression)
ROLE_GARDIEN = os.environ.get("DISCORD_GUARDIAN_ROLE_ID", "1515273093483073667").strip()
ROLE_SAGE = os.environ.get("DISCORD_SAGE_ROLE_ID", "1515273094258888775").strip()
ROLE_SENTINELLE = os.environ.get("DISCORD_SENTINELLE_ROLE_ID", "1515273095663980554").strip()
ROLE_BETA_TESTER = os.environ.get("DISCORD_BETA_TESTER_ROLE_ID", "").strip()
ROLE_VIP = os.environ.get("DISCORD_VIP_ROLE_ID", "1516862967801446400").strip()

# Permissions Discord
PERM_VIEW = 1024
PERM_SEND = 2048
PERM_HISTORY = 65536
PERM_PIN = 1 << 35  # MANAGE_MESSAGES for pin? Actually PIN_MESSAGES = 1<<5 = 32... use SEND

TEXT_TYPES = {0, 5, 15, 16}

# Ordre des catégories (par ID — aucune suppression)
CATEGORY_ORDER = [
    "1514271107559985306",   # NEXORIA
    "1517470906644168775",   # Beta & VIP
    "1514271124236537856",   # AVENTURE
    "1514271151856160910",   # GUILDES
    "1514271165043048509",   # ÉVÉNEMENTS
    "1514271188828819466",   # CRÉATIONS
    "1514271206952402975",   # CONSEIL OBSCUR
]

# Salons orphelins → catégorie parente
ORPHAN_PARENT = {
    "1514271204481962146": "1514271107559985306",   # faq → NEXORIA
    "1514271180268240977": "1514271107559985306",   # oracle → NEXORIA
}

# Salons liés au site — ordre dans leur catégorie (channel_id → position)
CHANNEL_POSITIONS = {
    # NEXORIA
    "1514271114405216359": 0,   # bienvenue
    "1514271110101995651": 1,   # règlement
    "1514271112136228864": 2,   # annonces
    "1514271204481962146": 3,   # faq
    "1514271116582191158": 4,   # lore
    "1514271118532411565": 5,   # classes
    "1514271120415658115": 6,   # création perso
    "1514271180268240977": 7,   # oracle
    "1514271122412146739": 8,   # rôles & titres
    "1515325507208745080": 9,   # chroniques
    # Beta & VIP
    "1517470910427168770": 0,   # inscriptions-beta
    "1517470908476821575": 1,   # beta-test
    "1517470912256016534": 2,   # salon-vip
    # AVENTURE
    "1514271126694662387": 0,   # hub
    "1514271132667347055": 1,   # xp
    "1514271130557612052": 2,   # inventaire
    "1514271140338470932": 3,   # failles
    # GUILDES
    "1514271154213355540": 0,
    "1514271156042203377": 1,
    # ÉVÉNEMENTS
    "1514271167785996360": 0,
    "1514271172647325768": 1,
    # CRÉATIONS
    "1514271191094001765": 0,
    "1514271194508034049": 1,
    # CONSEIL OBSCUR
    "1514271209272115200": 0,
    "1514271211679650013": 1,
    "1514271214607007935": 2,
    "1514271217077452962": 3,
}

# Messages de bienvenue par salon (français)
CHANNEL_WELCOMES: dict[str, dict] = channel_welcomes(SITE_URL)


def headers(token: str, json: bool = False) -> dict:
    h = {"Authorization": f"Bot {token}", "User-Agent": "Nexoria/1.0"}
    if json:
        h["Content-Type"] = "application/json"
    return h


def staff_view_overwrites(guild_id: str) -> list[dict]:
    """@everyone denied ; Gardien + Sage peuvent voir et lire."""
    return [
        {"id": guild_id, "type": 0, "deny": str(PERM_VIEW | PERM_SEND)},
        {"id": ROLE_GARDIEN, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
        {"id": ROLE_SAGE, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
    ]


def vip_overwrites(guild_id: str) -> list[dict]:
    return [
        {"id": guild_id, "type": 0, "deny": str(PERM_VIEW)},
        {"id": ROLE_VIP, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
        {"id": ROLE_GARDIEN, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
        {"id": ROLE_SAGE, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
    ]


def council_overwrites(guild_id: str) -> list[dict]:
    """Conseil Obscur — staff only."""
    return [
        {"id": guild_id, "type": 0, "deny": str(PERM_VIEW)},
        {"id": ROLE_GARDIEN, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
        {"id": ROLE_SAGE, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)},
    ]


def beta_test_overwrites(guild_id: str) -> list[dict]:
    """Salon bugs — Beta testeurs + staff (Gardien, Sage, Sentinelle)."""
    rows = [{"id": guild_id, "type": 0, "deny": str(PERM_VIEW | PERM_SEND)}]
    for rid in (ROLE_GARDIEN, ROLE_SAGE, ROLE_SENTINELLE):
        if rid:
            rows.append({"id": rid, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)})
    if ROLE_BETA_TESTER:
        rows.append({"id": ROLE_BETA_TESTER, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)})
    return rows


SPECIAL_OVERWRITES = {
    "1517470910427168770": staff_view_overwrites,      # inscriptions-beta
    "1517470908476821575": beta_test_overwrites,         # beta-test
    "1517470912256016534": vip_overwrites,              # salon-vip
    "1514271209272115200": council_overwrites,
    "1514271211679650013": council_overwrites,
    "1514271214607007935": council_overwrites,
    "1514271217077452962": council_overwrites,
}


async def fetch_all_messages(client: httpx.AsyncClient, channel_id: str, token: str) -> list[dict]:
    messages: list[dict] = []
    before = None
    while True:
        params = {"limit": 100}
        if before:
            params["before"] = before
        r = await client.get(
            f"{DISCORD_API}/channels/{channel_id}/messages",
            headers=headers(token),
            params=params,
        )
        if r.status_code != 200:
            break
        batch = r.json()
        if not batch:
            break
        messages.extend(batch)
        before = batch[-1]["id"]
        if len(batch) < 100:
            break
        await asyncio.sleep(0.35)
    return messages


async def purge_channel(client: httpx.AsyncClient, channel_id: str, token: str, dry_run: bool) -> int:
    msgs = await fetch_all_messages(client, channel_id, token)
    if not msgs or dry_run:
        return len(msgs)

    ids = [m["id"] for m in msgs]
    deleted = 0
    # Bulk delete (messages < 14 days, max 100)
    for i in range(0, len(ids), 100):
        chunk = ids[i : i + 100]
        r = await client.post(
            f"{DISCORD_API}/channels/{channel_id}/messages/bulk-delete",
            headers=headers(token, json=True),
            json={"messages": chunk},
        )
        if r.status_code in (200, 204):
            deleted += len(chunk)
        else:
            for mid in chunk:
                dr = await client.delete(
                    f"{DISCORD_API}/channels/{channel_id}/messages/{mid}",
                    headers=headers(token),
                )
                if dr.status_code in (200, 204):
                    deleted += 1
                await asyncio.sleep(0.25)
        await asyncio.sleep(0.5)
    return deleted


async def post_welcome(client: httpx.AsyncClient, channel_id: str, token: str, dry_run: bool) -> bool:
    spec = CHANNEL_WELCOMES.get(channel_id)
    if not spec:
        return False
    if dry_run:
        return True
    payload = {
        "embeds": [{
            "title": spec["title"],
            "description": spec["description"],
            "color": spec.get("color", 0x7C3AED),
            "footer": {"text": "NEXORIA — forge ta légende"},
        }],
    }
    payload = discord_translate.attach_translate_components(payload)
    r = await client.post(
        f"{DISCORD_API}/channels/{channel_id}/messages",
        headers=headers(token, json=True),
        json=payload,
    )
    if r.status_code not in (200, 201):
        return False
    msg_id = r.json().get("id")
    if msg_id:
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            mongo_url = os.environ.get("MONGO_URL", "").strip()
            db_name = os.environ.get("DB_NAME", "").strip()
            if mongo_url and db_name:
                mclient = AsyncIOMotorClient(mongo_url)
                discord_translate.init(mclient[db_name])
                await discord_translate.after_post(channel_id, r.json(), source_lang="fr")
                mclient.close()
        except Exception:
            pass
        await client.put(
            f"{DISCORD_API}/channels/{channel_id}/pins/{msg_id}",
            headers=headers(token),
        )
    return True


async def patch_channel(client: httpx.AsyncClient, channel_id: str, token: str, payload: dict, dry_run: bool) -> bool:
    if dry_run:
        return True
    r = await client.patch(
        f"{DISCORD_API}/channels/{channel_id}",
        headers=headers(token, json=True),
        json=payload,
    )
    return r.status_code == 200


async def main(dry_run: bool = False) -> int:
    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    guild_id = os.environ.get("DISCORD_GUILD_ID", "").strip()
    if not token or not guild_id:
        print("ERREUR: DISCORD_BOT_TOKEN et DISCORD_GUILD_ID requis")
        return 1

    print("=== Réorganisation Discord NEXORIA ===")
    if dry_run:
        print("(mode dry-run — aucune modification)")

    async with httpx.AsyncClient(timeout=60.0) as client:
        chans = (await client.get(f"{DISCORD_API}/guilds/{guild_id}/channels", headers=headers(token))).json()
        by_id = {c["id"]: c for c in chans}

        # 1. Repositionner catégories
        print("\n--- Catégories ---")
        for pos, cat_id in enumerate(CATEGORY_ORDER):
            name = by_id.get(cat_id, {}).get("name", "?")
            ok = await patch_channel(client, cat_id, token, {"position": pos}, dry_run)
            print(f"  {'OK' if ok else 'FAIL'} position {pos}: {name} ({cat_id})")

        # 2. Rattacher orphelins + positions + permissions
        print("\n--- Salons ---")
        for ch in chans:
            cid = ch["id"]
            if ch.get("type") not in TEXT_TYPES and ch.get("type") != 2:
                continue

            payload: dict = {}
            if cid in ORPHAN_PARENT:
                payload["parent_id"] = ORPHAN_PARENT[cid]
            if cid in CHANNEL_POSITIONS:
                payload["position"] = CHANNEL_POSITIONS[cid]
            if cid in SPECIAL_OVERWRITES:
                payload["permission_overwrites"] = SPECIAL_OVERWRITES[cid](guild_id)

            if payload:
                ok = await patch_channel(client, cid, token, payload, dry_run)
                print(f"  {'OK' if ok else 'FAIL'} patch {ch.get('name')} ({cid})")

        await asyncio.sleep(1)

        # 3. Nettoyer + republier messages (texte & annonces uniquement)
        print("\n--- Nettoyage & messages ---")
        text_channels = [
            c for c in chans
            if c.get("type") in TEXT_TYPES and c["id"] in CHANNEL_WELCOMES
        ]
        for ch in sorted(text_channels, key=lambda x: x.get("name", "")):
            cid = ch["id"]
            name = ch.get("name", "?")
            n = await purge_channel(client, cid, token, dry_run)
            print(f"  {name}: {n} message(s) {'à supprimer' if dry_run else 'supprimé(s)'}")
            if not dry_run:
                await asyncio.sleep(0.6)
            ok = await post_welcome(client, cid, token, dry_run)
            print(f"    → présentation {'(dry)' if dry_run else 'publiée' if ok else 'ÉCHEC'}")
            await asyncio.sleep(0.5)

    print("\n=== Terminé — aucun salon supprimé ===")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    sys.exit(asyncio.run(main(dry_run=args.dry_run)))
