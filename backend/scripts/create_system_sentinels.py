#!/usr/bin/env python3
"""Crée ou met à jour les comptes système Sentinelles (Naria + Shumi).

Usage:
  python scripts/create_system_sentinels.py --dry-run
  python scripts/create_system_sentinels.py --apply
  python scripts/create_system_sentinels.py --verify
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

from naria_system import (
    NARIA_LEGACY_USER_ID,
    NARIA_SYSTEM_KEY,
    SENTINEL_REGISTRY,
    build_system_sentinel_document,
    ensure_indexes,
    find_system_sentinel,
    migrate_team_profile_user_id,
    public_safe_summary,
    verify_system_sentinel,
)


def _connect():
    mongo_url = os.environ.get("MONGO_URL", "").strip()
    db_name = os.environ.get("DB_NAME", "nexoria").strip()
    if not mongo_url:
        raise SystemExit("MONGO_URL manquant — chargez le .env backend existant.")
    client = AsyncIOMotorClient(mongo_url)
    return client, client[db_name]


async def _dry_run_one(db, system_key: str) -> None:
    defn = SENTINEL_REGISTRY[system_key]
    existing = await find_system_sentinel(db, system_key)
    if existing:
        doc = build_system_sentinel_document(defn, existing=existing)
        print(f"{defn.username} existe déjà — mise à jour prévue:")
        print(json.dumps(public_safe_summary(existing), indent=2, ensure_ascii=False))
        print("\nChamps qui seraient synchronisés:")
        for key in sorted(doc.keys()):
            if key == "password_hash":
                print("  - password_hash: [conservé]")
            elif existing.get(key) != doc.get(key):
                print(f"  - {key}: {existing.get(key)!r} → {doc.get(key)!r}")
    else:
        doc = build_system_sentinel_document(defn)
        print(f"{defn.username} sera créée:")
        print(json.dumps(public_safe_summary(doc), indent=2, ensure_ascii=False))
        print(f"\nNouveau user_id: {doc['user_id']}")


async def run_dry_run(db) -> int:
    for system_key in SENTINEL_REGISTRY:
        await _dry_run_one(db, system_key)
        print()

    legacy_profile = await db.team_page_profiles.find_one({"user_id": NARIA_LEGACY_USER_ID})
    if legacy_profile:
        naria = await find_system_sentinel(db, NARIA_SYSTEM_KEY)
        uid = naria["user_id"] if naria else "(nouveau)"
        print(f"Profil équipe legacy ({NARIA_LEGACY_USER_ID}) → migrera vers {uid}")
    return 0


async def _apply_one(db, system_key: str) -> tuple[str, str]:
    defn = SENTINEL_REGISTRY[system_key]
    existing = await find_system_sentinel(db, system_key)
    doc = build_system_sentinel_document(
        defn,
        user_id=existing.get("user_id") if existing else None,
        existing=existing,
    )

    if existing:
        await db.users.update_one({"user_id": existing["user_id"]}, {"$set": doc})
        return "updated", existing["user_id"]

    collision = await db.users.find_one({
        "username": doc["username"],
        "system_key": {"$ne": doc["system_key"]},
    })
    if collision:
        raise SystemExit(
            f"Collision: un compte humain porte déjà le username '{doc['username']}' "
            f"(user_id={collision.get('user_id')}). Renommez-le avant d'appliquer."
        )
    await db.users.insert_one(doc)
    return "created", doc["user_id"]


async def run_apply(db) -> int:
    await ensure_indexes(db)
    exit_code = 0

    for system_key in SENTINEL_REGISTRY:
        defn = SENTINEL_REGISTRY[system_key]
        action, user_id = await _apply_one(db, system_key)
        ok, errors, user = await verify_system_sentinel(db, system_key)
        print(f"{defn.username} {action} (user_id={user_id})")
        print(json.dumps(public_safe_summary(user or {}), indent=2, ensure_ascii=False))
        if not ok:
            print("Avertissements:", ", ".join(errors))
            exit_code = 1
        print()

    naria = await find_system_sentinel(db, NARIA_SYSTEM_KEY)
    if naria:
        migrated = await migrate_team_profile_user_id(
            db, naria["user_id"], legacy_user_id=NARIA_LEGACY_USER_ID,
        )
        if migrated:
            print(f"Profil équipe migré depuis {NARIA_LEGACY_USER_ID}")

    if exit_code == 0:
        print("OK — Sentinelles système prêtes.")
    return exit_code


async def run_verify(db) -> int:
    exit_code = 0
    for system_key in SENTINEL_REGISTRY:
        defn = SENTINEL_REGISTRY[system_key]
        ok, errors, user = await verify_system_sentinel(db, system_key)
        print(f"=== {defn.username} ===")
        if not user:
            print("ÉCHEC — compte absent.")
            print(f"Exécutez: python scripts/create_system_sentinels.py --apply")
            exit_code = 1
            continue
        print(json.dumps(public_safe_summary(user), indent=2, ensure_ascii=False))
        if ok:
            print("OK")
        else:
            print("ÉCHEC —", "; ".join(errors))
            exit_code = 1
        print()
    return exit_code


async def main() -> int:
    parser = argparse.ArgumentParser(description="Comptes système Sentinelles (Naria + Shumi)")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true")
    group.add_argument("--apply", action="store_true")
    group.add_argument("--verify", action="store_true")
    args = parser.parse_args()

    client, db = _connect()
    try:
        if args.dry_run:
            return await run_dry_run(db)
        if args.apply:
            return await run_apply(db)
        return await run_verify(db)
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
