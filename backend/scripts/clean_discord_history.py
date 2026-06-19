"""Nettoyage sécurisé de l'historique Discord NEXORIA avant le lancement officiel.

Ne supprime JAMAIS : salons, catégories, rôles, permissions, membres.
Par défaut : dry-run, messages du bot uniquement, épinglés conservés.

Usage (depuis backend/) :
    python scripts/clean_discord_history.py --dry-run
    python scripts/clean_discord_history.py --confirm --bot-only
    python scripts/clean_discord_history.py --confirm --channel-id 1514271132667347055 --bot-only
    python scripts/clean_discord_history.py --confirm --bot-only --launch-cutoff 2026-06-20
    python scripts/clean_discord_history.py --confirm --clean-db --confirm-db
"""
from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(SCRIPTS))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import httpx

DISCORD_API = "https://discord.com/api/v10"

# ─── Configuration par défaut ───────────────────────────────────────────────
DRY_RUN_DEFAULT = True

# Salons « flux automatique » à nettoyer (pas les embeds épinglés de présentation)
DEFAULT_CHANNEL_ENV_KEYS = [
    ("DISCORD_AUTH_FORUM_CHANNEL_ID", "1515325507208745080", "Chroniques / connexions"),
    ("DISCORD_NOTIFY_CHANNEL_ID", "", "Notifications (fallback connexions)"),
    ("DISCORD_REWARDS_CHANNEL_ID", "1514271132667347055", "XP & récompenses"),
    ("DISCORD_LEVELUP_CHANNEL_ID", "1514271122412146739", "Level-up"),
    ("DISCORD_TRADE_CHANNEL_ID", "1514271130557612052", "Inventaire & échanges"),
    ("DISCORD_RIFT_CHANNEL_ID", "1514271140338470932", "Failles dimensionnelles"),
    ("DISCORD_BETA_TEST_CHANNEL_ID", "1517470908476821575", "Beta test — bugs"),
    # Oracle : messages de test IA (pas l'embed épinglé si bot-only + patterns)
    ("DISCORD_ORACLE_CHANNEL_ID", "1514271180268240977", "Paroles de l'Oracle"),
]

# Salons volontairement exclus du nettoyage par défaut (embeds officiels épinglés)
EXCLUDED_BY_DEFAULT = {
    "1514271114405216359",  # bienvenue
    "1514271110101995651",  # règlement
    "1514271112136228864",  # annonces
    "1514271204481962146",  # faq
    "1517470910427168770",  # inscriptions-beta (candidatures réelles)
}

# Motifs de messages de test / automatiques (insensible à la casse)
TEST_PATTERNS = re.compile(
    r"|".join([
        r"connexion", r"d[ée]connexion", r"connect[ée]", r"d[ée]connect[ée]",
        r"inscription", r"signup", r"sign-up", r"login", r"logout", r"register",
        r"level.?up", r"niveau", r"mont[ée]e de niveau", r"pass[ée] niveau",
        r"\bXP\b", r"[ÉE]clats", r"r[ée]compense", r"reward", r"badge",
        r"chroniques du nexus", r"nexus chronicles",
        r"traduction", r"translated", r"translation", r"traduit depuis",
        r"beta test", r"b[êe]ta", r"test diagnostic", r"diagnostic nexoria",
        r"oracle", r"paroles de l", r"faille", r"rift", r"dimensionnel",
        r"pass ascendant", r"boutique", r"recharg[ée]", r"top.?up", r"achat",
        r"[ée]change conclu", r"trade completed", r"offert", r"gifted", r"envoy[ée]",
        r"smouzyi", r"test connexion", r"test message",
    ]),
    re.IGNORECASE,
)

TEXT_TYPES = {0, 5, 10, 11, 12, 15, 16}  # text, announce, threads


@dataclass
class MessageCandidate:
    message_id: str
    channel_id: str
    channel_name: str
    created_at: datetime
    author_id: str
    author_name: str
    preview: str
    pinned: bool
    reason: str


@dataclass
class ChannelReport:
    channel_id: str
    channel_name: str
    total_fetched: int = 0
    candidates: list[MessageCandidate] = field(default_factory=list)


def headers(token: str, json: bool = False) -> dict:
    h = {"Authorization": f"Bot {token}", "User-Agent": "Nexoria/1.0 (cleanup)"}
    if json:
        h["Content-Type"] = "application/json"
    return h


def resolve_target_channels(extra_channel_id: str = "") -> list[tuple[str, str]]:
    """Retourne [(channel_id, label), ...] sans doublons."""
    seen: set[str] = set()
    out: list[tuple[str, str]] = []
    if extra_channel_id:
        cid = extra_channel_id.strip()
        if cid and cid not in EXCLUDED_BY_DEFAULT:
            seen.add(cid)
            out.append((cid, f"Salon spécifié ({cid})"))
    for env_key, default_id, label in DEFAULT_CHANNEL_ENV_KEYS:
        cid = os.environ.get(env_key, default_id).strip()
        if not cid or cid in seen or cid in EXCLUDED_BY_DEFAULT:
            continue
        seen.add(cid)
        out.append((cid, label))
    return out


def parse_discord_timestamp(ts: str) -> datetime:
    if ts.endswith("Z"):
        ts = ts[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(ts).astimezone(timezone.utc)
    except ValueError:
        return datetime.now(timezone.utc)


def parse_cutoff(value: str | None) -> datetime | None:
    if not value:
        env = os.environ.get("DISCORD_LAUNCH_CUTOFF", "").strip()
        value = env or None
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            dt = datetime.strptime(value.replace("Z", ""), fmt.replace("Z", ""))
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    raise ValueError(f"Date invalide : {value!r} (attendu YYYY-MM-DD ou ISO)")


def message_text(msg: dict) -> str:
    parts = [msg.get("content") or ""]
    for emb in msg.get("embeds") or []:
        parts.extend([
            emb.get("title") or "",
            emb.get("description") or "",
        ])
        for f in emb.get("fields") or []:
            parts.extend([f.get("name") or "", f.get("value") or ""])
        footer = emb.get("footer") or {}
        parts.append(footer.get("text") or "")
    return "\n".join(p for p in parts if p).strip()


def preview_text(text: str, limit: int = 120) -> str:
    flat = re.sub(r"\s+", " ", text).strip()
    return flat[:limit] + ("…" if len(flat) > limit else "")


def is_candidate(
    msg: dict,
    *,
    bot_id: str,
    bot_only: bool,
    include_pinned: bool,
    before: datetime | None,
    after: datetime | None,
) -> tuple[bool, str]:
    if msg.get("pinned") and not include_pinned:
        return False, "épinglé (conservé)"

    created = parse_discord_timestamp(msg.get("timestamp") or "")
    if before and created >= before:
        return False, "après la date limite (conservé)"
    if after and created < after:
        return False, "avant la plage (conservé)"

    author = msg.get("author") or {}
    author_id = str(author.get("id") or "")
    is_bot = bool(author.get("bot")) or (bot_id and author_id == bot_id)

    text = message_text(msg)

    if bot_only:
        if not is_bot:
            return False, "message utilisateur (conservé)"
        return True, "message bot"

    if is_bot:
        return True, "message bot"
    if text and TEST_PATTERNS.search(text):
        return True, "motif test/automatique"
    return False, "hors critères (conservé)"


async def fetch_bot_id(client: httpx.AsyncClient, token: str) -> str:
    r = await client.get(f"{DISCORD_API}/users/@me", headers=headers(token))
    r.raise_for_status()
    return str(r.json().get("id") or "")


async def fetch_guild_name(client: httpx.AsyncClient, guild_id: str, token: str) -> str:
    r = await client.get(f"{DISCORD_API}/guilds/{guild_id}", headers=headers(token))
    if r.status_code == 200:
        return r.json().get("name") or guild_id
    return guild_id


async def fetch_channel_name(client: httpx.AsyncClient, channel_id: str, token: str) -> str:
    r = await client.get(f"{DISCORD_API}/channels/{channel_id}", headers=headers(token))
    if r.status_code == 200:
        return r.json().get("name") or channel_id
    return channel_id


async def fetch_pinned_ids(client: httpx.AsyncClient, channel_id: str, token: str) -> set[str]:
    r = await client.get(f"{DISCORD_API}/channels/{channel_id}/pins", headers=headers(token))
    if r.status_code != 200:
        return set()
    return {str(p.get("id") or "") for p in r.json() if p.get("id")}


async def fetch_all_messages(client: httpx.AsyncClient, channel_id: str, token: str) -> list[dict]:
    messages: list[dict] = []
    before: str | None = None
    while True:
        params: dict = {"limit": 100}
        if before:
            params["before"] = before
        r = await client.get(
            f"{DISCORD_API}/channels/{channel_id}/messages",
            headers=headers(token),
            params=params,
        )
        if r.status_code == 429:
            retry = float(r.headers.get("Retry-After", 2))
            await asyncio.sleep(retry)
            continue
        if r.status_code != 200:
            print(f"  ⚠️  Lecture messages échouée ({channel_id}): HTTP {r.status_code}")
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


async def analyze_channel(
    client: httpx.AsyncClient,
    channel_id: str,
    label: str,
    token: str,
    bot_id: str,
    *,
    bot_only: bool,
    include_pinned: bool,
    before: datetime | None,
    after: datetime | None,
) -> ChannelReport:
    name = await fetch_channel_name(client, channel_id, token)
    pinned_ids = await fetch_pinned_ids(client, channel_id, token)
    msgs = await fetch_all_messages(client, channel_id, token)
    report = ChannelReport(channel_id=channel_id, channel_name=name or label, total_fetched=len(msgs))

    for msg in msgs:
        mid = str(msg.get("id") or "")
        if mid in pinned_ids:
            msg["pinned"] = True
        ok, reason = is_candidate(
            msg,
            bot_id=bot_id,
            bot_only=bot_only,
            include_pinned=include_pinned,
            before=before,
            after=after,
        )
        if not ok:
            continue
        author = msg.get("author") or {}
        text = message_text(msg)
        report.candidates.append(MessageCandidate(
            message_id=mid,
            channel_id=channel_id,
            channel_name=report.channel_name,
            created_at=parse_discord_timestamp(msg.get("timestamp") or ""),
            author_id=str(author.get("id") or ""),
            author_name=author.get("username") or "?",
            preview=preview_text(text),
            pinned=bool(msg.get("pinned")),
            reason=reason,
        ))
    return report


def print_report(guild_name: str, reports: list[ChannelReport], *, dry_run: bool) -> int:
    total_fetched = sum(r.total_fetched for r in reports)
    total_candidates = sum(len(r.candidates) for r in reports)

    print("\n" + "=" * 72)
    print(f"Serveur : {guild_name}")
    print(f"Mode    : {'DRY-RUN (aucune suppression)' if dry_run else 'SUPPRESSION RÉELLE'}")
    print(f"Salons  : {len(reports)} analysés")
    print(f"Messages lus       : {total_fetched}")
    print(f"Messages candidats : {total_candidates}")
    print("=" * 72)

    for rep in reports:
        print(f"\n#{rep.channel_name} ({rep.channel_id})")
        print(f"  Lus: {rep.total_fetched}  |  À supprimer: {len(rep.candidates)}")
        if rep.candidates:
            dates = [c.created_at for c in rep.candidates]
            print(f"  Plus ancien candidat : {min(dates).strftime('%Y-%m-%d %H:%M UTC')}")
            print(f"  Plus récent candidat : {max(dates).strftime('%Y-%m-%d %H:%M UTC')}")
            print("  Exemples :")
            for c in rep.candidates[:5]:
                pin = " 📌" if c.pinned else ""
                print(f"    • [{c.created_at.strftime('%Y-%m-%d %H:%M')}] {c.author_name}{pin}")
                print(f"      {c.preview}")
                print(f"      ({c.reason})")
        else:
            print("  (aucun message candidat)")

    print("\n" + "=" * 72)
    return total_candidates


async def delete_message(client: httpx.AsyncClient, channel_id: str, message_id: str, token: str) -> bool:
    r = await client.delete(
        f"{DISCORD_API}/channels/{channel_id}/messages/{message_id}",
        headers=headers(token),
    )
    if r.status_code == 429:
        retry = float(r.headers.get("Retry-After", 2))
        await asyncio.sleep(retry)
        return await delete_message(client, channel_id, message_id, token)
    return r.status_code in (200, 204)


async def bulk_delete_recent(
    client: httpx.AsyncClient,
    channel_id: str,
    message_ids: list[str],
    token: str,
) -> tuple[int, list[str]]:
    """Bulk delete (< 14 jours). Retourne (supprimés, ids restants)."""
    if not message_ids:
        return 0, []
    r = await client.post(
        f"{DISCORD_API}/channels/{channel_id}/messages/bulk-delete",
        headers=headers(token, json=True),
        json={"messages": message_ids[:100]},
    )
    if r.status_code in (200, 204):
        return len(message_ids[:100]), message_ids[100:]
    return 0, message_ids


async def purge_candidates(
    client: httpx.AsyncClient,
    reports: list[ChannelReport],
    token: str,
) -> int:
    deleted_total = 0
    now = datetime.now(timezone.utc)
    recent_cutoff_ts = now.timestamp() - 14 * 86400

    for rep in reports:
        if not rep.candidates:
            continue
        print(f"\n🧹 Nettoyage #{rep.channel_name} ({len(rep.candidates)} messages)…")
        channel_deleted = 0

        recent = [c for c in rep.candidates if c.created_at.timestamp() >= recent_cutoff_ts]
        old = [c for c in rep.candidates if c.created_at.timestamp() < recent_cutoff_ts]

        # Bulk delete (messages < 14 jours, max 100 par requête)
        recent_ids = [c.message_id for c in recent]
        idx = 0
        while idx < len(recent_ids):
            chunk = recent_ids[idx : idx + 100]
            n, _ = await bulk_delete_recent(client, rep.channel_id, chunk, token)
            if n > 0:
                channel_deleted += n
                idx += 100
                await asyncio.sleep(0.6)
            else:
                for mid in chunk:
                    if await delete_message(client, rep.channel_id, mid, token):
                        channel_deleted += 1
                    await asyncio.sleep(0.3)
                idx += 100

        for c in old:
            if await delete_message(client, rep.channel_id, c.message_id, token):
                channel_deleted += 1
            await asyncio.sleep(0.3)

        deleted_total += channel_deleted
        print(f"  ✅ #{rep.channel_name} : {channel_deleted} message(s) supprimé(s)")

    return deleted_total


async def clean_db_dry_run(db) -> dict[str, int]:
    stats: dict[str, int] = {}
    collections = [
        "translation_cache",
        "discord_translatable_messages",
        "discord_sync_log",
        "oracle_logs",
    ]
    for name in collections:
        if name not in await db.list_collection_names():
            continue
        col = db[name]
        if name == "translation_cache":
            count = await col.count_documents({"$or": [{"key": None}, {"key": ""}, {"key": {"$exists": False}}]})
        else:
            count = await col.count_documents({})
        stats[name] = count
    return stats


async def clean_db_confirm(db) -> dict[str, int]:
    deleted: dict[str, int] = {}
    if "translation_cache" in await db.list_collection_names():
        r = await db.translation_cache.delete_many({
            "$or": [{"key": None}, {"key": ""}, {"key": {"$exists": False}}],
        })
        deleted["translation_cache_orphans"] = r.deleted_count
    for name in ("discord_translatable_messages", "discord_sync_log"):
        if name in await db.list_collection_names():
            r = await db[name].delete_many({})
            deleted[name] = r.deleted_count
    # oracle_logs : uniquement entrées de test explicites
    if "oracle_logs" in await db.list_collection_names():
        r = await db.oracle_logs.delete_many({"prompt": {"$regex": "test", "$options": "i"}})
        deleted["oracle_logs_test"] = r.deleted_count
    return deleted


async def main() -> int:
    parser = argparse.ArgumentParser(description="Nettoyage historique Discord NEXORIA (sécurisé)")
    parser.add_argument("--dry-run", action="store_true", default=None, help="Simuler sans supprimer")
    parser.add_argument("--confirm", action="store_true", help="Autoriser la suppression réelle")
    parser.add_argument("--channel-id", default="", help="Salon cible additionnel")
    parser.add_argument("--before", default="", help="Supprimer uniquement les messages avant cette date (ISO)")
    parser.add_argument("--after", default="", help="Supprimer uniquement les messages après cette date (ISO)")
    parser.add_argument("--launch-cutoff", default="", help="Alias --before (messages avant le lancement)")
    parser.add_argument("--bot-only", action="store_true", default=True, help="Uniquement messages du bot (défaut)")
    parser.add_argument("--all-authors", action="store_true", help="Inclure messages utilisateurs matching motifs test")
    parser.add_argument("--include-pinned", action="store_true", help="Autoriser suppression des épinglés")
    parser.add_argument("--clean-db", action="store_true", help="Inclure nettoyage MongoDB (dry-run ou confirm-db)")
    parser.add_argument("--confirm-db", action="store_true", help="Confirmer nettoyage MongoDB")
    parser.add_argument("--post-start-notice", action="store_true", help="Poster l'annonce « Nouveau départ » après nettoyage")
    args = parser.parse_args()

    if args.confirm:
        dry_run = False
    elif args.dry_run:
        dry_run = True
    else:
        dry_run = DRY_RUN_DEFAULT

    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    guild_id = os.environ.get("DISCORD_GUILD_ID", "").strip()
    if not token:
        print("❌ DISCORD_BOT_TOKEN manquant dans backend/.env")
        return 1
    if not guild_id:
        print("❌ DISCORD_GUILD_ID manquant dans backend/.env")
        return 1

    channels = resolve_target_channels(args.channel_id)
    if not channels:
        print("❌ Aucun salon cible configuré.")
        return 1

    bot_only = not args.all_authors
    before: datetime | None = None
    after: datetime | None = None
    try:
        cutoff = args.launch_cutoff or args.before
        if cutoff:
            before = parse_cutoff(cutoff)
        if args.after:
            after = parse_cutoff(args.after)
    except ValueError as exc:
        print(f"❌ {exc}")
        return 1

    if not dry_run and not args.confirm:
        print("❌ Refusé : ajoutez --confirm pour supprimer réellement.")
        print("   Exemple : python scripts/clean_discord_history.py --confirm --bot-only")
        return 1

    print("NEXORIA — Nettoyage historique Discord")
    print(f"Salons cibles ({len(channels)}) :")
    for cid, label in channels:
        print(f"  • {label} → {cid}")
    if before:
        print(f"Date limite (--before / --launch-cutoff) : avant {before.strftime('%Y-%m-%d %H:%M UTC')}")
    if after:
        print(f"Plage (--after) : après {after.strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"Bot only : {bot_only}  |  Épinglés supprimables : {args.include_pinned}")

    async with httpx.AsyncClient(timeout=30.0) as client:
        bot_id = await fetch_bot_id(client, token)
        guild_name = await fetch_guild_name(client, guild_id, token)

        reports: list[ChannelReport] = []
        for cid, label in channels:
            print(f"\n📂 Analyse #{label} ({cid})…")
            rep = await analyze_channel(
                client, cid, label, token, bot_id,
                bot_only=bot_only,
                include_pinned=args.include_pinned,
                before=before,
                after=after,
            )
            reports.append(rep)

        total = print_report(guild_name, reports, dry_run=dry_run)

        if dry_run:
            print("\n✅ Dry-run terminé. Aucun message supprimé.")
            print("   Pour supprimer : python scripts/clean_discord_history.py --confirm --bot-only")
        elif total == 0:
            print("\n✅ Rien à supprimer.")
        else:
            print(f"\n⚠️  Suppression de {total} message(s) en cours…")
            deleted = await purge_candidates(client, reports, token)
            print(f"\n✅ {deleted} message(s) supprimé(s) au total.")

            if args.post_start_notice:
                from post_official_start_notice import post_notice  # noqa: WPS433
                ann_id = os.environ.get("DISCORD_ANNOUNCE_CHANNEL_ID", "1514271112136228864").strip()
                ok = await post_notice(client, ann_id, token, dry_run=False)
                print("📢 Annonce « Nouveau départ » publiée." if ok else "⚠️  Annonce non publiée.")

    if args.clean_db:
        mongo_url = os.environ.get("MONGO_URL", "").strip()
        db_name = os.environ.get("DB_NAME", "").strip()
        if not mongo_url or not db_name:
            print("⚠️  MongoDB non configuré — skip --clean-db")
        else:
            from motor.motor_asyncio import AsyncIOMotorClient
            mclient = AsyncIOMotorClient(mongo_url)
            db = mclient[db_name]
            if not args.confirm_db:
                stats = await clean_db_dry_run(db)
                print("\n── MongoDB (dry-run) ──")
                for name, count in stats.items():
                    print(f"  {name}: {count} document(s) éligibles")
                print("  Pour supprimer : ajoutez --confirm-db avec --confirm")
            elif dry_run:
                print("⚠️  --confirm-db ignoré en mode dry-run Discord")
            else:
                deleted = await clean_db_confirm(db)
                print("\n── MongoDB nettoyé ──")
                for name, count in deleted.items():
                    print(f"  {name}: {count} supprimé(s)")
            mclient.close()

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
