"""Tchat Nexus Online par salle — persistance, anti-spam, modération."""

from __future__ import annotations

import re
import time
import uuid
from datetime import datetime, timezone, timedelta

ROOM_CHAT_MAX_LEN = 300
ROOM_CHAT_HISTORY_LIMIT = 50
ROOM_CHAT_RATE_SECONDS = 1.0
ROOM_CHAT_BUFFER_MAX = 60

# Liste basique configurable — compléter via admin plus tard.
BAD_WORDS = {
    "connard", "salope", "encule", "enculé", "fdp", "ntm", "pute", "merde",
    "fuck", "shit", "bitch", "nigger", "nigga",
}

_chat_rate_limit: dict[str, float] = {}
_chat_dup_tracker: dict[str, tuple[str, int, float]] = {}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_iso(value) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value) if isinstance(value, str) else value
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def user_chat_muted_until(user: dict | None) -> datetime | None:
    if not user:
        return None
    return parse_iso(user.get("nexus_chat_muted_until"))


def is_user_chat_muted(user: dict | None) -> bool:
    until = user_chat_muted_until(user)
    return bool(until and until > datetime.now(timezone.utc))


def normalize_content(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def contains_bad_word(text: str) -> bool:
    lowered = text.lower()
    return any(w in lowered for w in BAD_WORDS)


def check_rate_limit(sid: str) -> bool:
    """True si autorisé."""
    now = time.time()
    last = _chat_rate_limit.get(sid, 0)
    if now - last < ROOM_CHAT_RATE_SECONDS:
        return False
    _chat_rate_limit[sid] = now
    return True


def check_duplicate_spam(sid: str, text: str) -> bool:
    """True si spam (message identique répété)."""
    now = time.time()
    prev = _chat_dup_tracker.get(sid)
    if prev and prev[0] == text and now - prev[2] < 8:
        count = prev[1] + 1
        _chat_dup_tracker[sid] = (text, count, now)
        return count >= 3
    _chat_dup_tracker[sid] = (text, 1, now)
    return False


def validate_message(text: str, sid: str) -> tuple[str | None, str | None]:
    content = normalize_content(text)
    if not content:
        return None, "Message vide."
    if len(content) > ROOM_CHAT_MAX_LEN:
        return None, f"Message trop long (max {ROOM_CHAT_MAX_LEN} caractères)."
    if not check_rate_limit(sid):
        return None, "Patience — un message par seconde."
    if check_duplicate_spam(sid, content):
        return None, "Message répété trop rapidement."
    if contains_bad_word(content):
        return None, "Message refusé."
    return content, None


def build_message_doc(p: dict, room_id: str, room_name: str, content: str) -> dict:
    return {
        "message_id": f"rc_{uuid.uuid4().hex[:12]}",
        "room_id": room_id,
        "room_name": room_name,
        "user_id": p["user_id"],
        "username": p["username"],
        "role": p.get("role", "user"),
        "is_nexus_supreme": bool(p.get("is_nexus_supreme")),
        "class_name": p.get("class_name"),
        "level": p.get("level", 1),
        "rank": p.get("rank"),
        "is_vip": bool(p.get("is_vip")),
        "chat_color": p.get("nexus_chat_color"),
        "content": content,
        "created_at": now_iso(),
        "ts": time.time(),
        "deleted": False,
        "deleted_by": None,
        "deleted_at": None,
        "delete_reason": None,
    }


async def clear_room_messages(db, room_id: str, moderator: dict | None = None) -> int:
    """Soft-delete tous les messages actifs d'une salle."""
    if db is None:
        return 0
    patch = {
        "deleted": True,
        "deleted_at": now_iso(),
        "delete_reason": "cleared_by_command",
    }
    if moderator:
        patch["deleted_by"] = moderator.get("user_id")
        patch["deleted_by_username"] = moderator.get("username")
    result = await db.nexus_room_chat.update_many(
        {"room_id": room_id, "deleted": {"$ne": True}},
        {"$set": patch},
    )
    return int(result.modified_count)


async def persist_message(db, doc: dict) -> dict:
    await db.nexus_room_chat.insert_one(doc)
    return doc


async def fetch_room_history(db, room_id: str, limit: int = ROOM_CHAT_HISTORY_LIMIT) -> list[dict]:
    if db is None:
        return []
    cursor = db.nexus_room_chat.find(
        {"room_id": room_id, "deleted": {"$ne": True}},
        {"_id": 0},
    ).sort("created_at", -1).limit(limit)
    rows = await cursor.to_list(length=limit)
    rows.reverse()
    return rows


async def soft_delete_message(db, message_id: str, moderator: dict, reason: str = "") -> dict | None:
    if db is None:
        return None
    doc = await db.nexus_room_chat.find_one({"message_id": message_id}, {"_id": 0})
    if not doc:
        return None
    patch = {
        "deleted": True,
        "deleted_by": moderator.get("user_id"),
        "deleted_by_username": moderator.get("username"),
        "deleted_at": now_iso(),
        "delete_reason": (reason or "")[:200],
    }
    await db.nexus_room_chat.update_one({"message_id": message_id}, {"$set": patch})
    return {**doc, **patch}


async def set_chat_mute(db, user_id: str, minutes: int) -> str:
    until = datetime.now(timezone.utc) + timedelta(minutes=max(1, int(minutes)))
    iso = until.isoformat()
    if db is not None:
        await db.users.update_one({"user_id": user_id}, {"$set": {"nexus_chat_muted_until": iso}})
    return iso


async def clear_chat_mute(db, user_id: str) -> None:
    if db is not None:
        await db.users.update_one({"user_id": user_id}, {"$unset": {"nexus_chat_muted_until": ""}})
