"""Naria — compte système officiel (Sentinelle du Nexus)."""
from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any

from auth import generate_user_id, hash_password

NARIA_USERNAME = "Naria"
NARIA_SYSTEM_KEY = "naria"
NARIA_LEGACY_USER_ID = "naria_sentinelle"
NARIA_PUBLIC_ROLE = "Sentinelle"
NARIA_INTERNAL_EMAIL = "naria@system.nexoria"
NARIA_DEFAULT_BIO = (
    "Naria veille sur le Nexus, protège les échanges et accompagne la modération du royaume."
)
NARIA_DEFAULT_AVATAR = "/assets/icons/couronne-violet.png"

SYSTEM_FIELDS_PRIVATE = frozenset({
    "password_hash",
    "email",
    "system_key",
    "is_system",
    "is_system_account",
    "can_login",
    "auth_provider",
    "account_type",
    "created_by",
    "is_staff_visible",
    "show_in_team",
    "show_in_community_team",
    "public_role",
    "team_role",
})


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def is_system_user(user: dict | None) -> bool:
    if not user:
        return False
    if user.get("system_key") == NARIA_SYSTEM_KEY:
        return True
    if user.get("is_system") or user.get("is_system_account"):
        return True
    if user.get("user_id") == NARIA_LEGACY_USER_ID:
        return True
    return False


def is_official_sentinel(user: dict | None) -> bool:
    if not user:
        return False
    if user.get("system_key") == NARIA_SYSTEM_KEY:
        return True
    if user.get("role") == "sentinelle" and user.get("is_system"):
        return True
    return False


def can_system_user_login(user: dict | None) -> bool:
    if not is_system_user(user):
        return True
    return bool(user.get("can_login"))


def player_users_filter(extra: dict | None = None) -> dict:
    """Mongo filter excluding comptes système (ex. Naria) des stats joueurs."""
    base: dict[str, Any] = {
        "system_key": {"$ne": NARIA_SYSTEM_KEY},
        "is_system": {"$ne": True},
        "is_system_account": {"$ne": True},
        "user_id": {"$ne": NARIA_LEGACY_USER_ID},
    }
    if extra:
        base = {"$and": [base, extra]}
    return base


def strip_system_fields(user: dict | None) -> dict:
    if not user:
        return {}
    out = {k: v for k, v in user.items() if k not in SYSTEM_FIELDS_PRIVATE}
    if is_official_sentinel(user):
        out["is_official_sentinel"] = True
    out.pop("is_automated_sentinel", None)
    out.pop("sentinel_status", None)
    return out


def naria_lookup_filter() -> dict:
    return {
        "$or": [
            {"system_key": NARIA_SYSTEM_KEY},
            {"username": NARIA_USERNAME},
            {"user_id": NARIA_LEGACY_USER_ID},
        ]
    }


async def find_naria_user(db) -> dict | None:
    return await db.users.find_one(naria_lookup_filter(), {"_id": 0})


def build_naria_document(*, user_id: str | None = None, existing: dict | None = None) -> dict:
    """Build/update document respecting the existing users schema."""
    uid = user_id or (existing or {}).get("user_id") or generate_user_id()
    now = now_iso()
    unusable_secret = secrets.token_hex(48)

    doc = {
        "user_id": uid,
        "username": NARIA_USERNAME,
        "display_name": NARIA_USERNAME,
        "email": NARIA_INTERNAL_EMAIL,
        "password_hash": hash_password(unusable_secret),
        "class_id": "explorer",
        "class_name": "Sentinelle",
        "secondary_class_id": None,
        "avatar_url": NARIA_DEFAULT_AVATAR,
        "banner_url": None,
        "bio": NARIA_DEFAULT_BIO,
        "story": "",
        "quote": "",
        "status_message": "",
        "pronouns": "",
        "location": "Le Nexus",
        "website_url": "",
        "social_links": {},
        "profile_accent": "#8B5CF6",
        "featured_badge_id": None,
        "profile_show_stats": False,
        "profile_show_dna": False,
        "profile_show_chronicle": False,
        "profile_visibility": "private",
        "profile_hide_hero_card": True,
        "level": 99,
        "xp": 0,
        "rank": "Sentinelle officielle du Nexus",
        "reputation": 0,
        "aether": 0,
        "skill_points": 0,
        "active_title": "sentinelle",
        "role": "sentinelle",
        "public_role": NARIA_PUBLIC_ROLE,
        "team_role": NARIA_PUBLIC_ROLE,
        "system_key": NARIA_SYSTEM_KEY,
        "is_system": True,
        "is_system_account": True,
        "can_login": False,
        "auth_provider": "system",
        "account_type": "system",
        "is_active": True,
        "is_staff_visible": True,
        "show_in_team": True,
        "show_in_community_team": True,
        "appear_offline": True,
        "created_by": "system",
        "created_at": (existing or {}).get("created_at") or now,
        "updated_at": now,
        "dna": {
            "creativity": 0, "ambition": 0, "sociability": 0,
            "curiosity": 0, "persistence": 0, "influence": 0,
        },
        "kingdom": {},
        "skills_allocated": {},
        "followers": 0,
        "following": 0,
        "beta_access": False,
    }

    if existing:
        # Preserve password hash on update — login remains impossible via can_login.
        if existing.get("password_hash"):
            doc["password_hash"] = existing["password_hash"]
        for key in ("created_at", "avatar_url", "bio", "quote", "rank"):
            if existing.get(key):
                doc[key] = existing[key]

    return doc


def merge_naria_team_row(user: dict, profile: dict | None, owner_username: str) -> dict:
    """Merge team_page profile onto Naria without recursion."""
    from team_page import normalize_member_profile

    p = normalize_member_profile(profile)
    tagline = p["tagline"] or user.get("quote") or ""
    bio = p["bio"] or user.get("bio") or ""
    role_label = p["role_label"] or user.get("public_role") or user.get("team_role") or "Sentinelle"
    return {
        **user,
        "is_nexus_supreme": False,
        "is_official_sentinel": True,
        "is_automated_sentinel": False,
        "active_title_name": "Sentinelle",
        "team_profile": p,
        "team_role_label": role_label,
        "team_nationality": p["nationality"] or user.get("location") or "",
        "team_tagline": tagline,
        "team_bio": bio,
        "team_specialties": p["specialties"],
        "team_visible": p["visible"] if profile else user.get("show_in_community_team", True),
        "team_sort_order": p["sort_order"],
    }


def public_safe_summary(user: dict) -> dict:
    return {
        "user_id": user.get("user_id"),
        "username": user.get("username"),
        "display_name": user.get("display_name"),
        "role": user.get("public_role") or user.get("role"),
        "rank": user.get("rank"),
        "show_in_team": user.get("show_in_team"),
        "show_in_community_team": user.get("show_in_community_team"),
        "can_login": user.get("can_login"),
        "is_system": user.get("is_system"),
        "system_key": user.get("system_key"),
        "is_active": user.get("is_active"),
        "updated_at": user.get("updated_at"),
    }


async def migrate_team_profile_user_id(db, new_user_id: str) -> int:
    """Move team_page_profiles from legacy sentinel id to real user id."""
    legacy = await db.team_page_profiles.find_one({"user_id": NARIA_LEGACY_USER_ID}, {"_id": 0})
    if not legacy:
        return 0
    existing_new = await db.team_page_profiles.find_one({"user_id": new_user_id}, {"_id": 0})
    if existing_new:
        await db.team_page_profiles.delete_one({"user_id": NARIA_LEGACY_USER_ID})
        return 0
    await db.team_page_profiles.update_one(
        {"user_id": NARIA_LEGACY_USER_ID},
        {"$set": {"user_id": new_user_id, "updated_at": now_iso(), "updated_by": "system"}},
    )
    return 1


async def ensure_indexes(db) -> None:
    await db.users.create_index("system_key", unique=True, sparse=True)


async def verify_naria(db) -> tuple[bool, list[str], dict | None]:
    errors: list[str] = []
    user = await find_naria_user(db)
    if not user:
        errors.append("Naria introuvable dans users")
        return False, errors, None
    if user.get("system_key") != NARIA_SYSTEM_KEY:
        errors.append("system_key != 'naria'")
    if user.get("can_login") is not False:
        errors.append("can_login doit être false")
    if not user.get("show_in_team"):
        errors.append("show_in_team doit être true")
    if not user.get("show_in_community_team"):
        errors.append("show_in_community_team doit être true")
    if not user.get("user_id"):
        errors.append("user_id manquant")
    if user.get("username") != NARIA_USERNAME:
        errors.append(f"username attendu '{NARIA_USERNAME}'")
    ok = len(errors) == 0
    return ok, errors, user


_naria_actor_cache: dict | None = None


def clear_naria_actor_cache() -> None:
    global _naria_actor_cache
    _naria_actor_cache = None


async def resolve_naria_actor(db) -> dict:
    """Actor metadata for moderation logs and notifications."""
    global _naria_actor_cache
    if _naria_actor_cache:
        return _naria_actor_cache

    user = await find_naria_user(db)
    if user:
        _naria_actor_cache = {
            "user_id": user["user_id"],
            "username": user.get("username") or NARIA_USERNAME,
            "display_name": user.get("display_name") or NARIA_USERNAME,
            "role": user.get("public_role") or NARIA_PUBLIC_ROLE,
            "actor_type": "system",
            "action_source": "naria",
        }
    else:
        _naria_actor_cache = {
            "user_id": NARIA_LEGACY_USER_ID,
            "username": NARIA_USERNAME,
            "display_name": NARIA_USERNAME,
            "role": NARIA_PUBLIC_ROLE,
            "actor_type": "system",
            "action_source": "naria",
        }
    return _naria_actor_cache
