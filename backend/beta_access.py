"""Beta access helpers — keys, validation, account activation."""
from __future__ import annotations

import secrets as _secrets
from datetime import datetime, timezone
from typing import Any, Optional

BETA_COOKIE = "nexoria_beta"
_BETA_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
BETA_KEY_MAX_LEN = 32

BETA_BADGE_ID = "beta_testeur"
BETA_TITLE_ID = "beta_tester"
BETA_XP_REWARD = 500
BETA_AETHER_REWARD = 200
BETA_CLASS_CHANGES_ALLOWED = 1


def is_beta_key_tester(user: dict | None) -> bool:
    """Joueur ayant activé une clé beta sur son compte."""
    if not user:
        return False
    return bool(user.get("beta_access") and user.get("beta_key_used"))


def beta_class_changes_used(user: dict | None) -> int:
    return int((user or {}).get("beta_class_changes_used", 0) or 0)


def beta_class_change_available(user: dict | None) -> bool:
    if not is_beta_key_tester(user):
        return False
    return beta_class_changes_used(user) < BETA_CLASS_CHANGES_ALLOWED


def gen_beta_key() -> str:
    def part(n: int) -> str:
        return "".join(_secrets.choice(_BETA_ALPHABET) for _ in range(n))
    return f"BETA-{part(4)}-{part(4)}"


def normalize_beta_key(key: str) -> str:
    return (key or "").strip().upper()[:BETA_KEY_MAX_LEN]


def beta_key_is_available(doc: Optional[dict]) -> bool:
    if not doc or not doc.get("active", True):
        return False
    if doc.get("used_by_user_id"):
        return False
    max_uses = doc.get("max_uses")
    if max_uses is None:
        max_uses = 1
    max_uses = int(max_uses)
    if max_uses == 0:
        return True
    uses = int(doc.get("uses", 0) or 0)
    return uses < max_uses


def beta_key_grants_access(doc: Optional[dict], user_id: str | None = None) -> bool:
    """Clé valide, disponible, ou déjà consommée par ce joueur."""
    if not doc or not doc.get("active", True):
        return False
    uid = (user_id or "").strip()
    if uid and doc.get("used_by_user_id") == uid:
        return True
    return beta_key_is_available(doc)


def beta_key_matches_user(doc: dict, user_id: str) -> bool:
    assigned = doc.get("assigned_user_id")
    if not assigned:
        return True
    return assigned == user_id


async def find_beta_key(db, key: str) -> Optional[dict]:
    norm = normalize_beta_key(key)
    if not norm or len(norm) < 8:
        return None
    return await db.beta_keys.find_one({"key": norm})


def new_beta_key_doc(
    *,
    key: str,
    label: str,
    created_by: str,
    assigned_user_id: Optional[str] = None,
    assigned_username: Optional[str] = None,
    max_uses: int = 1,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "key": key,
        "label": label,
        "active": True,
        "max_uses": max(1, max_uses),
        "uses": 0,
        "created_at": now,
        "created_by": created_by,
        "last_used_at": None,
        "used_by_user_id": None,
        "used_by_username": None,
        "used_at": None,
        "assigned_user_id": assigned_user_id,
        "assigned_username": assigned_username,
    }
