"""Verrouille les salons Discord informatifs (lecture seule pour @everyone).

Ne supprime jamais de salon ni de rôle. Dry-run par défaut.

Usage (depuis backend/) :
    python scripts/lock_discord_info_channels.py
    python scripts/lock_discord_info_channels.py --confirm
"""
from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import httpx

DISCORD_API = "https://discord.com/api/v10"

# ─── Permissions Discord ───
PERM_ADD_REACTIONS = 64
PERM_VIEW = 1024
PERM_SEND = 2048
PERM_HISTORY = 65536
PERM_MANAGE_MESSAGES = 8192
PERM_CREATE_PUBLIC_THREADS = 34359738368
PERM_SEND_IN_THREADS = 17179869184
PERM_MANAGE_THREADS = 10823323776256
PERM_EMBED_LINKS = 16384
PERM_ATTACH_FILES = 32768

EVERYONE_ALLOW = PERM_VIEW | PERM_HISTORY | PERM_ADD_REACTIONS
EVERYONE_DENY = PERM_SEND | PERM_CREATE_PUBLIC_THREADS | PERM_SEND_IN_THREADS

STAFF_ALLOW = (
    PERM_VIEW | PERM_SEND | PERM_HISTORY | PERM_MANAGE_MESSAGES
    | PERM_CREATE_PUBLIC_THREADS | PERM_SEND_IN_THREADS | PERM_MANAGE_THREADS
    | PERM_EMBED_LINKS | PERM_ATTACH_FILES
)

BOT_ALLOW = (
    PERM_VIEW | PERM_SEND | PERM_HISTORY | PERM_MANAGE_MESSAGES
    | PERM_EMBED_LINKS | PERM_ATTACH_FILES
    | PERM_CREATE_PUBLIC_THREADS | PERM_SEND_IN_THREADS
)

TEXT_TYPES = {0, 5, 15, 16}  # text, announcement, forum, media

ROLE_GARDIEN = os.environ.get("DISCORD_GUARDIAN_ROLE_ID", "1515273093483073667").strip()
ROLE_SAGE = os.environ.get("DISCORD_SAGE_ROLE_ID", "1515273094258888775").strip()
ROLE_SENTINELLE = os.environ.get("DISCORD_SENTINELLE_ROLE_ID", "1515273095663980554").strip()

# Salons informatifs — verrouillage explicite par ID
LOCK_BY_ID: set[str] = {
    "1514271114405216359",  # bienvenue
    "1514271110101995651",  # règlement
    "1514271112136228864",  # annonces
    "1514271204481962146",  # faq
    "1514271116582191158",  # lore-du-monde / lore
    "1514271118532411565",  # classes-et-races / classes
    "1514271120415658115",  # création-de-perso
    "1514271180268240977",  # paroles-de-l-oracle / oracle
    "1514271122412146739",  # rôles-et-titres
    "1515325507208745080",  # chroniques-du-nexus / chroniques
    "1514271132667347055",  # xp (flux auto)
    "1514271130557612052",  # inventaire (flux auto)
    "1514271140338470932",  # failles (flux auto)
}

# Ne jamais modifier (permissions spéciales ou salons ouverts)
NEVER_MODIFY_IDS: set[str] = {
    "1517470910427168770",  # inscriptions-beta — public
    "1517470908476821575",  # beta-test — privé beta
    "1517470912256016534",  # salon-vip
    "1514271209272115200",  # staff
    "1514271211679650013",  # logs-mod
    "1514271214607007935",  # config-bot
    "1514271217077452962",  # stats
    # Salons de discussion ouverts
    "1514271126694662387",  # hub / global-chat
    "1514271154213355540",  # guildes
    "1514271156042203377",  # recrutement
    "1514271167785996360",  # agenda
    "1514271172647325768",  # défis
    "1514271191094001765",  # fan-art
    "1514271194508034049",  # captures
}

# Motifs de noms — salons informatifs (verrouiller)
LOCK_NAME_PATTERNS: list[re.Pattern] = [
    re.compile(p, re.I) for p in (
        r"bienvenue",
        r"r[eè]glement",
        r"annonces?",
        r"\bfaq\b",
        r"lore",
        r"classes?",
        r"cr[eé]ation",
        r"oracle",
        r"r[oô]les?",
        r"chroniques?",
        r"news",
        r"guides?",
        r"maintenance",
        r"\bxp\b",
        r"inventaire",
        r"failles?",
        r"paroles",
    )
]

# Motifs — salons de discussion (ne pas verrouiller)
OPEN_NAME_PATTERNS: list[re.Pattern] = [
    re.compile(p, re.I) for p in (
        r"global[- ]?chat",
        r"hub",
        r"fran[cç]ais",
        r"english",
        r"espa[nñ]ol",
        r"deutsch",
        r"italiano",
        r"portugu",
        r"nederlands",
        r"日本語|japanese|nihongo",
        r"inscriptions?[- ]?beta",
        r"beta[- ]?test",
        r"salon[- ]?vip|vip",
        r"recrutement",
        r"guildes?",
        r"fan[- ]?art",
        r"captures?",
        r"agenda",
        r"d[eé]fis",
        r"staff",
        r"logs?[- ]?mod",
        r"config",
        r"statistiques?|\bstats\b",
    )
]


def headers(token: str, json_ct: bool = False) -> dict:
    h = {"Authorization": f"Bot {token}", "User-Agent": "Nexoria/1.0"}
    if json_ct:
        h["Content-Type"] = "application/json"
    return h


def normalize_name(name: str) -> str:
    return (name or "").lower().replace("┃", "").replace("│", "").strip()


def is_open_by_name(name: str) -> bool:
    n = normalize_name(name)
    return any(p.search(n) for p in OPEN_NAME_PATTERNS)


def is_lock_by_name(name: str) -> bool:
    n = normalize_name(name)
    if is_open_by_name(n):
        return False
    return any(p.search(n) for p in LOCK_NAME_PATTERNS)


def should_lock_channel(ch: dict) -> tuple[bool, str]:
    cid = ch["id"]
    name = ch.get("name", "")

    if cid in NEVER_MODIFY_IDS:
        return False, "never_modify"
    if ch.get("type") not in TEXT_TYPES:
        return False, "not_text"
    if cid in LOCK_BY_ID:
        return True, "explicit_id"
    if is_open_by_name(name):
        return False, "open_name"
    if is_lock_by_name(name):
        return True, "info_name"
    return False, "unclassified"


def _parse_perm_int(value) -> int:
    if value is None:
        return 0
    return int(value) if value else 0


def _merge_overwrite(
    overwrites: list[dict],
    target_id: str,
    *,
    allow: int | None = None,
    deny: int | None = None,
    overwrite_type: int = 0,
) -> list[dict]:
    """Merge allow/deny bits into an existing overwrite or create one."""
    out = [dict(o) for o in overwrites]
    idx = next((i for i, o in enumerate(out) if o.get("id") == target_id and o.get("type") == overwrite_type), None)

    if idx is None:
        entry = {"id": target_id, "type": overwrite_type}
        if allow:
            entry["allow"] = str(allow)
        if deny:
            entry["deny"] = str(deny)
        out.append(entry)
        return out

    cur = out[idx]
    cur_allow = _parse_perm_int(cur.get("allow"))
    cur_deny = _parse_perm_int(cur.get("deny"))

    if allow is not None:
        cur_allow = allow
    if deny is not None:
        cur_deny = deny

    cur["allow"] = str(cur_allow) if cur_allow else "0"
    cur["deny"] = str(cur_deny) if cur_deny else "0"
    out[idx] = cur
    return out


def build_lock_overwrites(
    existing: list[dict],
    guild_id: str,
    bot_user_id: str | None,
) -> list[dict]:
    """Apply read-only @everyone + staff/bot send permissions."""
    ow = list(existing)

    # @everyone — read only
    ow = _merge_overwrite(ow, guild_id, allow=EVERYONE_ALLOW, deny=EVERYONE_DENY)

    for role_id in (ROLE_GARDIEN, ROLE_SAGE, ROLE_SENTINELLE):
        if role_id:
            ow = _merge_overwrite(ow, role_id, allow=STAFF_ALLOW, deny=0)

    if bot_user_id:
        ow = _merge_overwrite(ow, bot_user_id, allow=BOT_ALLOW, deny=0, overwrite_type=1)

    return ow


def describe_change(before: list[dict], after: list[dict], guild_id: str) -> str:
    def get_entry(ows, tid):
        for o in ows:
            if o.get("id") == tid and o.get("type") == 0:
                return o
        return {}

    b = get_entry(before, guild_id)
    a = get_entry(after, guild_id)
    b_deny = _parse_perm_int(b.get("deny"))
    a_deny = _parse_perm_int(a.get("deny"))
    send_denied = bool(a_deny & PERM_SEND) and not bool(b_deny & PERM_SEND)
    if send_denied:
        return "@everyone: SEND_MESSAGES → refusé (lecture seule)"
    if a != b:
        return f"@everyone allow={a.get('allow', '0')} deny={a.get('deny', '0')}"
    return "permissions déjà conformes"


async def main(confirm: bool = False) -> int:
    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    guild_id = os.environ.get("DISCORD_GUILD_ID", "").strip()
    if not token or not guild_id:
        print("ERREUR: DISCORD_BOT_TOKEN et DISCORD_GUILD_ID requis (backend/.env)")
        return 1

    mode = "APPLY" if confirm else "DRY-RUN"
    print(f"=== Verrouillage salons informatifs Discord — {mode} ===\n")

    async with httpx.AsyncClient(timeout=60.0) as client:
        me_r = await client.get(f"{DISCORD_API}/users/@me", headers=headers(token))
        bot_user_id = me_r.json().get("id") if me_r.status_code == 200 else None

        ch_r = await client.get(f"{DISCORD_API}/guilds/{guild_id}/channels", headers=headers(token))
        if ch_r.status_code != 200:
            print(f"ERREUR: impossible de lister les salons (HTTP {ch_r.status_code})")
            return 1
        channels = ch_r.json()

        to_lock: list[tuple[dict, str]] = []
        ignored: list[tuple[dict, str]] = []

        for ch in channels:
            lock, reason = should_lock_channel(ch)
            if lock:
                to_lock.append((ch, reason))
            elif ch.get("type") in TEXT_TYPES:
                ignored.append((ch, reason))

        print(f"--- Salons à verrouiller ({len(to_lock)}) ---")
        for ch, reason in sorted(to_lock, key=lambda x: x[0].get("name", "")):
            existing = ch.get("permission_overwrites") or []
            new_ow = build_lock_overwrites(existing, guild_id, bot_user_id)
            change = describe_change(existing, new_ow, guild_id)
            print(f"  🔒 #{ch.get('name')} ({ch['id']}) [{reason}]")
            print(f"      → {change}")

            if confirm:
                r = await client.patch(
                    f"{DISCORD_API}/channels/{ch['id']}",
                    headers=headers(token, json_ct=True),
                    json={"permission_overwrites": new_ow},
                )
                if r.status_code == 200:
                    print("      ✓ appliqué")
                else:
                    print(f"      ✗ échec HTTP {r.status_code}: {r.text[:150]}")
                await asyncio.sleep(0.4)

        print(f"\n--- Salons ignorés / ouverts ({len(ignored)}) ---")
        for ch, reason in sorted(ignored, key=lambda x: x[0].get("name", "")):
            flag = "⏭" if reason == "never_modify" else "💬"
            print(f"  {flag} #{ch.get('name')} ({ch['id']}) — {reason}")

        if not confirm and to_lock:
            print("\n⚠️  Mode dry-run — aucune modification. Relance avec --confirm pour appliquer.")

    print("\n=== Terminé — aucun salon supprimé ===")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verrouille les salons informatifs Discord NEXORIA")
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Appliquer les changements (sans ce flag = dry-run)",
    )
    args = parser.parse_args()
    sys.exit(asyncio.run(main(confirm=args.confirm)))
