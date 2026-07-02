"""Discord account linking — OAuth state tokens (survives OAuth redirect)."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


DISCORD_OAUTH_STATE_TTL_MINUTES = 20


async def create_discord_oauth_state(db, user_id: str, *, purpose: str) -> str:
    state = secrets.token_urlsafe(32)
    expires = now_utc() + timedelta(minutes=DISCORD_OAUTH_STATE_TTL_MINUTES)
    await db.discord_oauth_states.insert_one({
        "state": state,
        "user_id": user_id,
        "purpose": purpose,
        "created_at": now_utc().isoformat(),
        "expires_at": expires.isoformat(),
    })
    return state


async def consume_discord_oauth_state(db, state: str, *, purpose: str) -> str | None:
    key = (state or "").strip()
    if not key:
        return None
    doc = await db.discord_oauth_states.find_one_and_delete(
        {"state": key, "purpose": purpose},
        {"_id": 0, "user_id": 1, "expires_at": 1},
    )
    if not doc:
        return None
    expires_at = doc.get("expires_at")
    if expires_at:
        try:
            exp = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < now_utc():
                return None
        except Exception:
            return None
    return doc.get("user_id")
