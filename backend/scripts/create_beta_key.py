"""Génère une clé beta dans MongoDB (affichée une seule fois).

Usage (depuis backend/) :
    python scripts/create_beta_key.py --label "Beta Discord Julien"
    python scripts/create_beta_key.py --label "Beta user" --user-id USER_ID
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
sys.path.insert(0, str(ROOT))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

import beta_access  # noqa: E402


async def main() -> int:
    parser = argparse.ArgumentParser(description="Créer une clé beta NEXORIA")
    parser.add_argument("--label", default="", help="Libellé de la clé")
    parser.add_argument("--user-id", default="", help="Réserver la clé à un user_id")
    parser.add_argument("--created-by", default="script", help="Auteur (audit)")
    args = parser.parse_args()

    mongo_url = __import__("os").environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = __import__("os").environ.get("DB_NAME", "nexoria")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    assigned_user_id = args.user_id.strip() or None
    assigned_username = None
    label = args.label.strip()
    if assigned_user_id:
        user = await db.users.find_one({"user_id": assigned_user_id}, {"username": 1, "beta_access": 1})
        if not user:
            print(f"ERREUR: utilisateur {assigned_user_id} introuvable")
            return 1
        if user.get("beta_access"):
            print("ERREUR: compte déjà activé beta")
            return 1
        assigned_username = user.get("username")
        if not label:
            label = f"Beta — {assigned_username}"

    key = beta_access.gen_beta_key()
    while await db.beta_keys.find_one({"key": key}):
        key = beta_access.gen_beta_key()

    doc = beta_access.new_beta_key_doc(
        key=key,
        label=label or "Clé beta",
        created_by=args.created_by,
        assigned_user_id=assigned_user_id,
        assigned_username=assigned_username,
        max_uses=1,
    )
    await db.beta_keys.insert_one(doc)

    print("\n=== Clé beta créée (copie-la maintenant — non récupérable) ===")
    print(f"Clé   : {key}")
    print(f"Label : {doc['label']}")
    if assigned_user_id:
        print(f"Assignée à : {assigned_username} ({assigned_user_id})")
    print("============================================================\n")
    client.close()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
