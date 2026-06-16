"""One-shot: promote SmouzYi as sole admin. Run: python scripts/promote_owner.py"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from server import enforce_owner_roles, db, client, OWNER_USERNAME  # noqa: E402


async def main():
    await enforce_owner_roles()
    owner = await db.users.find_one(
        {"username": OWNER_USERNAME},
        {"_id": 0, "username": 1, "role": 1, "email": 1},
    )
    staff = await db.users.find(
        {"role": {"$in": ["admin", "moderator"]}},
        {"_id": 0, "username": 1, "role": 1},
    ).to_list(20)
    print("owner:", owner)
    print("staff_remaining:", staff)
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
