"""Configure le serveur Discord NEXORIA pour l'international.

Crée / vérifie :
  - rôles Langue — * et Pays — *
  - catégorie 🌍 International + salons par langue
  - #global-chat multilingue
  - permissions beta (forum public, salon privé)

Usage (depuis backend/) :
    python scripts/setup_discord_international.py              # dry-run (défaut)
    python scripts/setup_discord_international.py --confirm    # applique les changements

Ne supprime jamais de salon ni de rôle existant.
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

ROLE_GARDIEN = os.environ.get("DISCORD_GUARDIAN_ROLE_ID", "").strip()
ROLE_SAGE = os.environ.get("DISCORD_SAGE_ROLE_ID", "").strip()
ROLE_SENTINELLE = os.environ.get("DISCORD_SENTINELLE_ROLE_ID", "").strip()
ROLE_BETA_TESTER = os.environ.get("DISCORD_BETA_TESTER_ROLE_ID", "").strip()

PERM_VIEW = 1024
PERM_SEND = 2048
PERM_HISTORY = 65536
PERM_CREATE_PUBLIC_THREADS = 34359738368
PERM_SEND_IN_THREADS = 17179869184

# Couleurs distinctes pour rôles langue (decimal)
LANG_ROLE_COLORS = {
    "fr": 0x5865F2,
    "en": 0x57F287,
    "es": 0xFEE75C,
    "de": 0xEB459E,
    "it": 0xED4245,
    "pt": 0xF26522,
    "nl": 0x00D166,
    "ja": 0x9B59B6,
}
COUNTRY_ROLE_COLOR = 0x95A5A6


def headers(token: str, json: bool = False) -> dict:
    h = {"Authorization": f"Bot {token}", "User-Agent": "Nexoria/1.0"}
    if json:
        h["Content-Type"] = "application/json"
    return h


def staff_ids() -> list[str]:
    return [r for r in (ROLE_GARDIEN, ROLE_SAGE, ROLE_SENTINELLE) if r]


def lang_channel_overwrites(guild_id: str, lang_role_id: str) -> list[dict]:
    """Salon langue : visible par le rôle langue + staff."""
    rows = [
        {"id": guild_id, "type": 0, "deny": str(PERM_VIEW | PERM_SEND)},
    ]
    if lang_role_id:
        rows.append({
            "id": lang_role_id, "type": 0,
            "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY),
        })
    for sid in staff_ids():
        rows.append({
            "id": sid, "type": 0,
            "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY),
        })
    return rows


def beta_signup_forum_overwrites(guild_id: str) -> list[dict]:
    public = PERM_VIEW | PERM_SEND | PERM_CREATE_PUBLIC_THREADS | PERM_SEND_IN_THREADS | PERM_HISTORY
    return [{"id": guild_id, "type": 0, "allow": str(public)}]


def beta_test_overwrites(guild_id: str) -> list[dict]:
    rows = [{"id": guild_id, "type": 0, "deny": str(PERM_VIEW | PERM_SEND)}]
    for rid in staff_ids():
        rows.append({"id": rid, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)})
    if ROLE_BETA_TESTER:
        rows.append({"id": ROLE_BETA_TESTER, "type": 0, "allow": str(PERM_VIEW | PERM_SEND | PERM_HISTORY)})
    return rows


def global_chat_overwrites(guild_id: str) -> list[dict]:
    """#global-chat — visible par tous, multilingue."""
    public = PERM_VIEW | PERM_SEND | PERM_HISTORY
    return [{"id": guild_id, "type": 0, "allow": str(public)}]


async def fetch_guild_channels(client: httpx.AsyncClient, guild_id: str, token: str) -> list[dict]:
    r = await client.get(f"{DISCORD_API}/guilds/{guild_id}/channels", headers=headers(token))
    r.raise_for_status()
    return r.json()


async def fetch_guild_roles(client: httpx.AsyncClient, guild_id: str, token: str) -> list[dict]:
    r = await client.get(f"{DISCORD_API}/guilds/{guild_id}/roles", headers=headers(token))
    r.raise_for_status()
    return r.json()


def find_by_name(items: list[dict], name: str, *, ch_type: int | None = None) -> dict | None:
    target = name.lower()
    for item in items:
        if ch_type is not None and item.get("type") != ch_type:
            continue
        if (item.get("name") or "").lower() == target:
            return item
    return None


def find_role_by_name(roles: list[dict], name: str) -> dict | None:
    target = name.lower()
    for role in roles:
        if (role.get("name") or "").lower() == target.lower():
            return role
    return None


def find_channel_contains(channels: list[dict], fragment: str, ch_type: int | None = None) -> dict | None:
    frag = fragment.lower()
    for ch in channels:
        if ch_type is not None and ch.get("type") != ch_type:
            continue
        if frag in (ch.get("name") or "").lower():
            return ch
    return None


async def ensure_role(
    client: httpx.AsyncClient,
    guild_id: str,
    token: str,
    name: str,
    color: int,
    roles: list[dict],
    confirm: bool,
) -> tuple[str, str]:
    """Returns (role_id, action)."""
    existing = find_role_by_name(roles, name)
    if existing:
        return existing["id"], "exists"
    if not confirm:
        return "", "would_create"
    r = await client.post(
        f"{DISCORD_API}/guilds/{guild_id}/roles",
        headers=headers(token, json=True),
        json={"name": name, "color": color, "hoist": True, "mentionable": False},
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Création rôle {name} échouée: {r.status_code} {r.text[:200]}")
    rid = r.json()["id"]
    roles.append(r.json())
    return rid, "created"


async def ensure_category(
    client: httpx.AsyncClient,
    guild_id: str,
    token: str,
    channels: list[dict],
    confirm: bool,
) -> tuple[str, str]:
    cat = find_by_name(channels, di.INTERNATIONAL_CATEGORY_NAME, ch_type=4)
    if cat:
        return cat["id"], "exists"
    if not confirm:
        return "", "would_create"
    r = await client.post(
        f"{DISCORD_API}/guilds/{guild_id}/channels",
        headers=headers(token, json=True),
        json={"name": di.INTERNATIONAL_CATEGORY_NAME, "type": 4, "position": 1},
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Création catégorie échouée: {r.status_code} {r.text[:200]}")
    cid = r.json()["id"]
    channels.append(r.json())
    return cid, "created"


async def ensure_text_channel(
    client: httpx.AsyncClient,
    guild_id: str,
    token: str,
    channels: list[dict],
    *,
    name: str,
    topic: str,
    parent_id: str,
    overwrites: list[dict],
    confirm: bool,
) -> tuple[str, str]:
    existing = find_by_name(channels, name, ch_type=0)
    if existing:
        if confirm and overwrites:
            r = await client.patch(
                f"{DISCORD_API}/channels/{existing['id']}",
                headers=headers(token, json=True),
                json={"topic": topic, "permission_overwrites": overwrites, "parent_id": parent_id},
            )
            if r.status_code == 200:
                return existing["id"], "updated"
        return existing["id"], "exists"
    if not confirm:
        return "", "would_create"
    payload: dict = {
        "name": name,
        "type": 0,
        "topic": topic,
        "permission_overwrites": overwrites,
    }
    if parent_id:
        payload["parent_id"] = parent_id
    r = await client.post(
        f"{DISCORD_API}/guilds/{guild_id}/channels",
        headers=headers(token, json=True),
        json=payload,
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Création #{name} échouée: {r.status_code} {r.text[:200]}")
    cid = r.json()["id"]
    channels.append(r.json())
    return cid, "created"


async def patch_channel_permissions(
    client: httpx.AsyncClient,
    token: str,
    channel_id: str,
    overwrites: list[dict],
    confirm: bool,
) -> str:
    if not channel_id:
        return "skipped"
    if not confirm:
        return "would_patch"
    r = await client.patch(
        f"{DISCORD_API}/channels/{channel_id}",
        headers=headers(token, json=True),
        json={"permission_overwrites": overwrites},
    )
    return "patched" if r.status_code == 200 else f"fail_{r.status_code}"


def print_manual_onboarding() -> None:
    print("\n" + "=" * 60)
    print("ONBOARDING DISCORD — À CONFIGURER MANUELLEMENT")
    print("=" * 60)
    print("""
L'API Discord ne permet pas de configurer entièrement l'Onboarding via bot.
Dans Discord → Paramètres du serveur → Onboarding :

1. Activer « Onboarding » (serveur Community requis).

2. Question 1 : « Quelle est ta langue principale ? »
   Réponses (chaque réponse → rôle Langue correspondant) :
   🇫🇷 Français        → Langue — Français
   🇬🇧 English         → Langue — English
   🇪🇸 Español         → Langue — Español
   🇩🇪 Deutsch         → Langue — Deutsch
   🇮🇹 Italiano        → Langue — Italiano
   🇧🇷 Português BR    → Langue — Português BR
   🇳🇱 Nederlands      → Langue — Nederlands
   🇯🇵 日本語           → Langue — 日本語

3. Question 2 : « Quel est ton pays ou ta région ? »
   Réponses (chaque réponse → rôle Pays correspondant) :
   🇫🇷 France → Pays — France
   🇧🇪 Belgique → Pays — Belgique
   🇨🇭 Suisse → Pays — Suisse
   🇨🇦 Canada → Pays — Canada
   🇺🇸 USA → Pays — USA
   🇬🇧 UK → Pays — UK
   🇪🇸 Espagne → Pays — Espagne
   🇩🇪 Allemagne → Pays — Allemagne
   🇮🇹 Italie → Pays — Italie
   🇧🇷 Brésil → Pays — Brésil
   🇳🇱 Pays-Bas → Pays — Pays-Bas
   🇯🇵 Japon → Pays — Japon
   🌍 Autre → Pays — Autre

4. Salons par défaut suggérés pour nouveaux membres :
   #bienvenue, #règlement, #global-chat, forum #inscriptions-beta

5. Modération recommandée :
   - Rules Screening (vérification règlement)
   - AutoMod (anti-spam, liens suspects)
   - Logs modération dans Conseil Obscur

6. Hiérarchie des rôles :
   Place le rôle du bot AU-DESSUS des rôles Langue / Pays pour qu'il puisse les attribuer.
""")


async def main(confirm: bool) -> int:
    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    guild_id = os.environ.get("DISCORD_GUILD_ID", "").strip()
    if not token or not guild_id:
        print("ERREUR: DISCORD_BOT_TOKEN et DISCORD_GUILD_ID requis")
        return 1

    mode = "CONFIRM" if confirm else "DRY-RUN"
    print(f"=== Setup Discord International NEXORIA [{mode}] ===\n")

    env_lines: dict[str, str] = {}
    report: list[str] = []

    async with httpx.AsyncClient(timeout=45.0) as client:
        channels = await fetch_guild_channels(client, guild_id, token)
        roles = await fetch_guild_roles(client, guild_id, token)

        # ── Rôles langue ──
        print("--- Rôles langue ---")
        lang_role_ids: dict[str, str] = {}
        for spec in di.LANGUAGE_SPECS:
            rid, action = await ensure_role(
                client, guild_id, token,
                spec["name"],
                LANG_ROLE_COLORS.get(spec["code"], 0x99AAB5),
                roles, confirm,
            )
            lang_role_ids[spec["code"]] = rid
            env_lines[spec["role_env"]] = rid
            print(f"  [{action}] {spec['name']} → {rid or '(nouveau)'}")
            report.append(f"lang_role:{spec['code']}:{action}")

        # ── Rôles pays ──
        print("\n--- Rôles pays ---")
        for spec in di.COUNTRY_SPECS:
            rid, action = await ensure_role(
                client, guild_id, token,
                spec["name"], COUNTRY_ROLE_COLOR, roles, confirm,
            )
            env_lines[spec["role_env"]] = rid
            print(f"  [{action}] {spec['name']} → {rid or '(nouveau)'}")
            report.append(f"country_role:{spec['code']}:{action}")

        # ── Catégorie International ──
        print("\n--- Catégorie ---")
        cat_id, cat_action = await ensure_category(client, guild_id, token, channels, confirm)
        env_lines["DISCORD_INTERNATIONAL_CATEGORY_ID"] = cat_id
        print(f"  [{cat_action}] {di.INTERNATIONAL_CATEGORY_NAME} → {cat_id or '(nouveau)'}")

        # ── Salons par langue ──
        print("\n--- Salons par langue ---")
        for spec in di.LANGUAGE_SPECS:
            lang_rid = lang_role_ids.get(spec["code"]) or os.environ.get(spec["role_env"], "").strip()
            topic = (
                f"Salon {spec['flag']} {spec['name'].split('—', 1)[-1].strip()} — "
                "discussions NEXORIA dans ta langue."
            )
            ch_id, action = await ensure_text_channel(
                client, guild_id, token, channels,
                name=spec["channel_name"],
                topic=topic,
                parent_id=cat_id or None,
                overwrites=lang_channel_overwrites(guild_id, lang_rid) if lang_rid else [],
                confirm=confirm,
            )
            env_lines[spec["channel_env"]] = ch_id
            print(f"  [{action}] #{spec['channel_name']} → {ch_id or '(nouveau)'}")
            report.append(f"lang_channel:{spec['code']}:{action}")

        # ── Global chat ──
        print("\n--- Salon global ---")
        g_id, g_action = await ensure_text_channel(
            client, guild_id, token, channels,
            name=di.GLOBAL_CHAT_NAME,
            topic="Chat international NEXORIA — multilingue. Utilise 🌍 Traduire sur les annonces officielles.",
            parent_id=cat_id or None,
            overwrites=global_chat_overwrites(guild_id),
            confirm=confirm,
        )
        env_lines[di.GLOBAL_CHAT_ENV] = g_id
        print(f"  [{g_action}] #{di.GLOBAL_CHAT_NAME} → {g_id or '(nouveau)'}")

        # ── Salons communs (permissions seulement) ──
        print("\n--- Permissions salons communs ---")
        for spec in di.COMMON_CHANNEL_SPECS:
            ch_id = os.environ.get(spec["env"], "").strip()
            ch = None
            if ch_id:
                ch = next((c for c in channels if c.get("id") == ch_id), None)
            if not ch:
                ch = find_channel_contains(channels, spec["match_name"])
            if not ch:
                print(f"  [skip] {spec['key']} — salon non trouvé ({spec['match_name']})")
                continue
            cid = ch["id"]
            env_lines[spec["env"]] = cid
            if spec["key"] == "beta_signup":
                ow = beta_signup_forum_overwrites(guild_id)
            elif spec["key"] == "beta_test":
                ow = beta_test_overwrites(guild_id)
            else:
                ow = global_chat_overwrites(guild_id) if spec.get("public") else None
            if ow:
                status = await patch_channel_permissions(client, token, cid, ow, confirm)
                print(f"  [{status}] #{ch.get('name')} ({spec['key']})")
                report.append(f"common:{spec['key']}:{status}")

    # ── Rapport .env ──
    print("\n--- Variables à ajouter au .env du VPS (sans secrets) ---")
    for key, val in env_lines.items():
        if val:
            print(f"{key}={val}")
        else:
            print(f"{key}=")

    print_manual_onboarding()

    print("\n--- Résumé ---")
    print(f"  Actions planifiées/exécutées : {len(report)}")
    if not confirm:
        print("\n  Relancez avec --confirm pour appliquer les changements.")
    else:
        print("\n  Copiez les variables ci-dessus dans le .env du VPS, puis redémarrez le backend.")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Setup Discord international NEXORIA")
    parser.add_argument("--confirm", action="store_true", help="Appliquer les changements (sinon dry-run)")
    args = parser.parse_args()
    sys.exit(asyncio.run(main(confirm=args.confirm)))
