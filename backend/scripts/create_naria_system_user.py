#!/usr/bin/env python3
"""Crée ou met à jour le compte système Naria dans MongoDB (idempotent).

Usage:
  python scripts/create_naria_system_user.py --dry-run
  python scripts/create_naria_system_user.py --apply
  python scripts/create_naria_system_user.py --verify
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
    build_naria_document,
    find_naria_user,
    migrate_team_profile_user_id,
    public_safe_summary,
    verify_naria,
    ensure_indexes,
)


def _connect():
    mongo_url = os.environ.get("MONGO_URL", "").strip()
    db_name = os.environ.get("DB_NAME", "nexoria").strip()
    if not mongo_url:
        raise SystemExit("MONGO_URL manquant — chargez le .env backend existant.")
    client = AsyncIOMotorClient(mongo_url)
    return client, client[db_name]


async def run_dry_run(db) -> int:
    existing = await find_naria_user(db)
    if existing:
        doc = build_naria_document(existing=existing)
        print("Naria existe déjà — mise à jour prévue (champs système + présentation):")
        print(json.dumps(public_safe_summary(existing), indent=2, ensure_ascii=False))
        print("\nChamps qui seraient synchronisés (sans écraser created_at / password_hash):")
        for key in sorted(doc.keys()):
            if key in ("password_hash",):
                print(f"  - {key}: [conservé]")
            elif existing.get(key) != doc.get(key):
                print(f"  - {key}: {existing.get(key)!r} → {doc.get(key)!r}")
    else:
        doc = build_naria_document()
        print("Naria sera créée:")
        print(json.dumps(public_safe_summary(doc), indent=2, ensure_ascii=False))
        print(f"\nNouveau user_id: {doc['user_id']}")

    legacy_profile = await db.team_page_profiles.find_one({"user_id": NARIA_LEGACY_USER_ID})
    if legacy_profile:
        uid = existing["user_id"] if existing else doc["user_id"]
        print(f"\nProfil équipe legacy ({NARIA_LEGACY_USER_ID}) → migrera vers {uid}")
    return 0


async def run_apply(db) -> int:
    await ensure_indexes(db)
    existing = await find_naria_user(db)
    doc = build_naria_document(
        user_id=existing.get("user_id") if existing else None,
        existing=existing,
    )

    if existing:
        await db.users.update_one({"user_id": existing["user_id"]}, {"$set": doc})
        user_id = existing["user_id"]
        action = "updated"
    else:
        # Double-check no username collision with a human account
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
        user_id = doc["user_id"]
        action = "created"

    migrated = await migrate_team_profile_user_id(db, user_id)
    ok, errors, user = await verify_naria(db)

    print(f"Naria {action} (user_id={user_id})")
    if migrated:
        print(f"Profil équipe migré depuis {NARIA_LEGACY_USER_ID}")
    print(json.dumps(public_safe_summary(user or doc), indent=2, ensure_ascii=False))
    if not ok:
        print("Avertissements post-apply:", ", ".join(errors))
        return 1
    print("OK — Naria prête.")
    return 0


async def run_verify(db) -> int:
    ok, errors, user = await verify_naria(db)
    if not user:
        print("ÉCHEC — Naria absente de la collection users.")
        print("Exécutez: python scripts/create_naria_system_user.py --apply")
        return 1
    print(json.dumps(public_safe_summary(user), indent=2, ensure_ascii=False))
    if ok:
        print("OK — vérification réussie.")
        return 0
    print("ÉCHEC —", "; ".join(errors))
    return 1


async def main() -> int:
    parser = argparse.ArgumentParser(description="Compte système Naria (Sentinelle officielle)")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="Simuler sans écrire")
    group.add_argument("--apply", action="store_true", help="Créer ou mettre à jour Naria")
    group.add_argument("--verify", action="store_true", help="Vérifier que Naria existe")
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
