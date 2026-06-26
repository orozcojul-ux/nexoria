"""One-shot: normalize avatar_url / banner_url in MongoDB to public relative /uploads/ paths.

Run on VPS from backend directory:
  python scripts/normalize_avatar_urls.py
  python scripts/normalize_avatar_urls.py --apply
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from server import db, client  # noqa: E402
from upload_storage import normalize_public_media_url  # noqa: E402


def _needs_fix(value: str | None) -> bool:
    if not value or not isinstance(value, str):
        return False
    normalized = normalize_public_media_url(value)
    return normalized != value.strip()


async def main(apply: bool) -> None:
    cursor = db.users.find({}, {"_id": 0, "user_id": 1, "username": 1, "avatar_url": 1, "banner_url": 1})
    changed = 0
    async for user in cursor:
        patch = {}
        for field in ("avatar_url", "banner_url"):
            raw = user.get(field)
            if not _needs_fix(raw):
                continue
            patch[field] = normalize_public_media_url(raw)
        if not patch:
            continue
        changed += 1
        print(f"{user.get('username')} ({user.get('user_id')}): {patch}")
        if apply:
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": patch})

    mode = "APPLIED" if apply else "DRY-RUN"
    print(f"\n{mode}: {changed} user(s) to update.")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write changes to MongoDB")
    args = parser.parse_args()
    asyncio.run(main(apply=args.apply))
