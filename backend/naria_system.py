"""Comptes système Sentinelles — Naria (communauté) et Shumi (modération)."""
from __future__ import annotations

import secrets
from dataclasses import dataclass
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

SHUMI_USERNAME = "Shumi"
SHUMI_SYSTEM_KEY = "shumi"
SHUMI_LEGACY_SYSTEM_KEY = "vigile"
SHUMI_LEGACY_USERNAME = "Vigile"
SHUMI_PUBLIC_ROLE = "Sentinelle"
SHUMI_INTERNAL_EMAIL = "shumi@system.nexoria"
SHUMI_DEFAULT_BIO = (
    "Shumi applique les règles du Nexus et veille au respect de la communauté."
)
SHUMI_DEFAULT_AVATAR = "/assets/icons/couronne-violet.png"

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
    "is_moderation_actor",
})


@dataclass(frozen=True)
class SystemSentinelDef:
    system_key: str
    username: str
    legacy_user_id: str | None
    internal_email: str
    public_role: str
    default_bio: str
    default_avatar: str
    default_rank: str
    profile_accent: str
    display_class_id: str
    show_in_community_team: bool
    show_in_team: bool
    is_moderation_actor: bool
    is_official_sentinel: bool
    default_country_code: str = ""
    default_nationality: str = ""


SENTINEL_REGISTRY: dict[str, SystemSentinelDef] = {
    NARIA_SYSTEM_KEY: SystemSentinelDef(
        system_key=NARIA_SYSTEM_KEY,
        username=NARIA_USERNAME,
        legacy_user_id=NARIA_LEGACY_USER_ID,
        internal_email=NARIA_INTERNAL_EMAIL,
        public_role=NARIA_PUBLIC_ROLE,
        default_bio=NARIA_DEFAULT_BIO,
        default_avatar=NARIA_DEFAULT_AVATAR,
        default_rank="Sentinelle officielle du Nexus",
        profile_accent="#F97316",
        display_class_id="chronomancer",
        show_in_community_team=True,
        show_in_team=True,
        is_moderation_actor=True,
        is_official_sentinel=True,
        default_country_code="fr",
        default_nationality="France",
    ),
    SHUMI_SYSTEM_KEY: SystemSentinelDef(
        system_key=SHUMI_SYSTEM_KEY,
        username=SHUMI_USERNAME,
        legacy_user_id=None,
        internal_email=SHUMI_INTERNAL_EMAIL,
        public_role=SHUMI_PUBLIC_ROLE,
        default_bio=SHUMI_DEFAULT_BIO,
        default_avatar=SHUMI_DEFAULT_AVATAR,
        default_rank="Sentinelle de modération du Nexus",
        profile_accent="#EA580C",
        display_class_id="assassin",
        show_in_community_team=True,
        show_in_team=True,
        is_moderation_actor=True,
        is_official_sentinel=True,
        default_country_code="us",
        default_nationality="USA",
    ),
}

SYSTEM_SENTINEL_KEYS = frozenset(SENTINEL_REGISTRY.keys())
LEGACY_SYSTEM_SENTINEL_KEYS = frozenset({SHUMI_LEGACY_SYSTEM_KEY})


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_sentinel_def(system_key: str | None) -> SystemSentinelDef | None:
    if not system_key:
        return None
    if system_key == SHUMI_LEGACY_SYSTEM_KEY:
        return SENTINEL_REGISTRY[SHUMI_SYSTEM_KEY]
    return SENTINEL_REGISTRY.get(system_key)


def is_naria_sentinel(user: dict | None) -> bool:
    if not user:
        return False
    key = user.get("system_key")
    if key == NARIA_SYSTEM_KEY:
        return True
    return user.get("user_id") == NARIA_LEGACY_USER_ID


def is_shumi_sentinel(user: dict | None) -> bool:
    if not user:
        return False
    if is_naria_sentinel(user):
        return False
    key = (user.get("system_key") or "").lower()
    if key in (SHUMI_SYSTEM_KEY, SHUMI_LEGACY_SYSTEM_KEY):
        return True
    username = user.get("username") or ""
    if username in (SHUMI_USERNAME, SHUMI_LEGACY_USERNAME):
        return True
    return bool(user.get("is_moderation_actor"))


def sanitize_shumi_public_text(text: str | None) -> str:
    if not text:
        return ""
    return (
        str(text)
        .replace("Vigile", SHUMI_USERNAME)
        .replace("vigile", SHUMI_USERNAME)
        .replace("VIGILE", SHUMI_USERNAME.upper())
    )


def apply_shumi_display_identity(fields: dict) -> dict:
    """Affiche Shumi au lieu de l'ancien nom Vigile sur les surfaces publiques."""
    out = dict(fields)
    out["username"] = SHUMI_USERNAME
    out["display_name"] = SHUMI_USERNAME
    out["system_key"] = SHUMI_SYSTEM_KEY
    for key in ("bio", "quote", "story", "status_message", "team_bio", "team_tagline", "rank"):
        if out.get(key):
            out[key] = sanitize_shumi_public_text(out[key])
    bio = (out.get("bio") or "").strip()
    if not bio or "Vigile" in bio or bio.startswith(SHUMI_LEGACY_USERNAME):
        out["bio"] = SHUMI_DEFAULT_BIO
    team_bio = (out.get("team_bio") or "").strip()
    if not team_bio or "Vigile" in team_bio:
        out["team_bio"] = out.get("bio") or SHUMI_DEFAULT_BIO
    return out


def is_system_user(user: dict | None) -> bool:
    if not user:
        return False
    key = user.get("system_key")
    if key in SYSTEM_SENTINEL_KEYS:
        return True
    if user.get("is_system") or user.get("is_system_account"):
        return True
    if user.get("user_id") == NARIA_LEGACY_USER_ID:
        return True
    return False


def is_official_sentinel(user: dict | None) -> bool:
    if not user:
        return False
    key = user.get("system_key")
    if key == SHUMI_LEGACY_SYSTEM_KEY:
        return True
    if key:
        defn = SENTINEL_REGISTRY.get(key)
        return bool(defn and defn.is_official_sentinel)
    if user.get("user_id") == NARIA_LEGACY_USER_ID:
        return True
    return user.get("role") == "sentinelle" and user.get("is_system")


def is_moderation_actor_user(user: dict | None) -> bool:
    if not user:
        return False
    key = user.get("system_key")
    if key:
        defn = SENTINEL_REGISTRY.get(key)
        return bool(defn and defn.is_moderation_actor)
    return bool(user.get("is_moderation_actor"))


def can_system_user_login(user: dict | None) -> bool:
    if not is_system_user(user):
        return True
    return bool(user.get("can_login"))


def player_users_filter(extra: dict | None = None) -> dict:
    """Mongo filter excluding comptes système des stats joueurs."""
    base: dict[str, Any] = {
        "system_key": {"$nin": list(SYSTEM_SENTINEL_KEYS) + list(LEGACY_SYSTEM_SENTINEL_KEYS)},
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


def sentinel_lookup_filter(system_key: str) -> dict:
    defn = SENTINEL_REGISTRY[system_key]
    clauses: list[dict] = [{"system_key": system_key}, {"username": defn.username}]
    if defn.legacy_user_id:
        clauses.append({"user_id": defn.legacy_user_id})
    if system_key == SHUMI_SYSTEM_KEY:
        clauses.append({"system_key": SHUMI_LEGACY_SYSTEM_KEY})
        clauses.append({"username": SHUMI_LEGACY_USERNAME})
    return {"$or": clauses}


def naria_lookup_filter() -> dict:
    return sentinel_lookup_filter(NARIA_SYSTEM_KEY)


def shumi_lookup_filter() -> dict:
    return sentinel_lookup_filter(SHUMI_SYSTEM_KEY)


async def find_system_sentinel(db, system_key: str) -> dict | None:
    if system_key not in SENTINEL_REGISTRY:
        return None
    return await db.users.find_one(sentinel_lookup_filter(system_key), {"_id": 0})


async def find_naria_user(db) -> dict | None:
    return await find_system_sentinel(db, NARIA_SYSTEM_KEY)


async def find_shumi_user(db) -> dict | None:
    return await find_system_sentinel(db, SHUMI_SYSTEM_KEY)


find_vigile_user = find_shumi_user


async def find_moderation_actor_user(db, system_key: str | None = None) -> dict | None:
    if system_key:
        defn = SENTINEL_REGISTRY.get(system_key)
        if defn and defn.is_moderation_actor:
            return await find_system_sentinel(db, system_key)
        return None
    for key, defn in SENTINEL_REGISTRY.items():
        if not defn.is_moderation_actor:
            continue
        user = await find_system_sentinel(db, key)
        if user:
            return user
    return None


COMMUNITY_MODERATION_CONTENT_TYPES = frozenset({
    "forum_thread", "forum_reply", "forum", "profile", "guild", "generic",
    "feed_post", "feed_comment", "news_comment", "friend_message",
})
NEXUS_MODERATION_CONTENT_TYPES = frozenset({
    "nexus_room_chat", "nexus_global_chat", "nexus_trade_chat",
    "nexus_guild_chat", "guild_chat",
})


def moderation_actor_system_key(content_type: str | None) -> str:
    """Naria — communauté (forum, profil, guildes) ; Shumi — temps réel (Nexus chat)."""
    ct = (content_type or "generic").lower()
    if ct in NEXUS_MODERATION_CONTENT_TYPES or ct.startswith("nexus_"):
        return SHUMI_SYSTEM_KEY
    if ct in COMMUNITY_MODERATION_CONTENT_TYPES or ct.startswith("forum"):
        return NARIA_SYSTEM_KEY
    return NARIA_SYSTEM_KEY


def build_system_sentinel_document(
    defn: SystemSentinelDef,
    *,
    user_id: str | None = None,
    existing: dict | None = None,
) -> dict:
    uid = user_id or (existing or {}).get("user_id") or generate_user_id()
    now = now_iso()
    unusable_secret = secrets.token_hex(48)

    from game_data import CLASSES
    class_id = defn.display_class_id if defn.display_class_id in CLASSES else "explorer"
    class_name = CLASSES[class_id]["name"]

    doc = {
        "user_id": uid,
        "username": defn.username,
        "display_name": defn.username,
        "email": defn.internal_email,
        "password_hash": hash_password(unusable_secret),
        "class_id": class_id,
        "class_name": class_name,
        "secondary_class_id": None,
        "avatar_url": defn.default_avatar,
        "banner_url": None,
        "bio": defn.default_bio,
        "story": "",
        "quote": "",
        "status_message": "",
        "pronouns": "",
        "location": "Le Nexus",
        "website_url": "",
        "social_links": {},
        "profile_accent": defn.profile_accent,
        "featured_badge_id": None,
        "profile_show_stats": False,
        "profile_show_dna": False,
        "profile_show_chronicle": False,
        "profile_visibility": "private",
        "profile_hide_hero_card": True,
        "level": 99,
        "xp": 0,
        "rank": defn.default_rank,
        "reputation": 0,
        "aether": 0,
        "skill_points": 0,
        "active_title": "sentinelle",
        "role": "sentinelle",
        "public_role": defn.public_role,
        "team_role": defn.public_role,
        "system_key": defn.system_key,
        "is_system": True,
        "is_system_account": True,
        "is_moderation_actor": defn.is_moderation_actor,
        "can_login": False,
        "auth_provider": "system",
        "account_type": "system",
        "is_active": True,
        "is_staff_visible": defn.show_in_team,
        "show_in_team": defn.show_in_team,
        "show_in_community_team": defn.show_in_community_team,
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
    if defn.default_country_code:
        doc["country_code"] = defn.default_country_code

    if existing:
        if existing.get("password_hash"):
            doc["password_hash"] = existing["password_hash"]
        for key in ("created_at", "avatar_url", "quote", "rank"):
            if existing.get(key):
                doc[key] = existing[key]
        existing_bio = sanitize_shumi_public_text(existing.get("bio")) if defn.system_key == SHUMI_SYSTEM_KEY else (existing.get("bio") or "")
        if existing_bio and "Vigile" not in existing_bio and existing_bio != SHUMI_DEFAULT_BIO.replace(SHUMI_USERNAME, SHUMI_LEGACY_USERNAME):
            doc["bio"] = existing_bio
        else:
            doc["bio"] = defn.default_bio

    return doc


def build_naria_document(*, user_id: str | None = None, existing: dict | None = None) -> dict:
    return build_system_sentinel_document(
        SENTINEL_REGISTRY[NARIA_SYSTEM_KEY],
        user_id=user_id,
        existing=existing,
    )


def build_shumi_document(*, user_id: str | None = None, existing: dict | None = None) -> dict:
    return build_system_sentinel_document(
        SENTINEL_REGISTRY[SHUMI_SYSTEM_KEY],
        user_id=user_id,
        existing=existing,
    )


build_vigile_document = build_shumi_document


def merge_official_sentinel_team_row(user: dict, profile: dict | None, owner_username: str) -> dict:
    """Merge team_page profile onto an official community sentinel."""
    from team_page import normalize_member_profile, resolve_team_country_fields

    p = normalize_member_profile(profile)
    tagline = p["tagline"] or user.get("quote") or ""
    bio = p["bio"] or user.get("bio") or ""
    role_label = p["role_label"] or user.get("public_role") or user.get("team_role") or "Sentinelle"
    defn = get_sentinel_def(user.get("system_key"))
    default_country = defn.default_country_code if defn else ""
    default_nationality = defn.default_nationality if defn else ""
    nationality, country_code = resolve_team_country_fields(
        user, profile,
        default_country=default_country,
        default_nationality=default_nationality,
    )
    row = {
        **user,
        "is_nexus_supreme": False,
        "is_official_sentinel": bool(defn.is_official_sentinel if defn else True),
        "is_automated_sentinel": False,
        "is_system_sentinel": True,
        "active_title_name": "Sentinelle",
        "team_profile": p,
        "team_role_label": role_label,
        "team_nationality": nationality,
        "team_country_code": country_code,
        "team_tagline": tagline,
        "team_bio": bio,
        "team_specialties": p["specialties"],
        "team_visible": p["visible"] if profile else user.get("show_in_community_team", True),
        "team_sort_order": p["sort_order"],
        "team_moderator_trial": p["moderator_trial"],
        "team_sentinelle_trial": p["sentinelle_trial"],
    }
    if is_shumi_sentinel(user):
        row = apply_shumi_display_identity(row)
    return row


merge_naria_team_row = merge_official_sentinel_team_row


def public_safe_summary(user: dict) -> dict:
    return {
        "user_id": user.get("user_id"),
        "username": user.get("username"),
        "display_name": user.get("display_name"),
        "role": user.get("public_role") or user.get("role"),
        "rank": user.get("rank"),
        "show_in_team": user.get("show_in_team"),
        "show_in_community_team": user.get("show_in_community_team"),
        "is_moderation_actor": user.get("is_moderation_actor"),
        "can_login": user.get("can_login"),
        "is_system": user.get("is_system"),
        "system_key": user.get("system_key"),
        "is_active": user.get("is_active"),
        "updated_at": user.get("updated_at"),
    }


async def migrate_team_profile_user_id(db, new_user_id: str, *, legacy_user_id: str) -> int:
    """Move team_page_profiles from legacy sentinel id to real user id."""
    legacy = await db.team_page_profiles.find_one({"user_id": legacy_user_id}, {"_id": 0})
    if not legacy:
        return 0
    existing_new = await db.team_page_profiles.find_one({"user_id": new_user_id}, {"_id": 0})
    if existing_new:
        await db.team_page_profiles.delete_one({"user_id": legacy_user_id})
        return 0
    await db.team_page_profiles.update_one(
        {"user_id": legacy_user_id},
        {"$set": {"user_id": new_user_id, "updated_at": now_iso(), "updated_by": "system"}},
    )
    return 1


async def ensure_system_sentinels(db) -> None:
    """Crée ou resynchronise Naria et Shumi (idempotent — safe au démarrage serveur)."""
    import logging

    logger = logging.getLogger("nexoria.naria_system")
    await ensure_indexes(db)

    for system_key, defn in SENTINEL_REGISTRY.items():
        existing = await find_system_sentinel(db, system_key)
        doc = build_system_sentinel_document(
            defn,
            user_id=existing.get("user_id") if existing else None,
            existing=existing,
        )

        if existing:
            sync_keys = (
                "system_key", "username", "display_name", "show_in_community_team", "show_in_team",
                "is_moderation_actor", "is_system", "is_system_account", "can_login",
                "public_role", "team_role", "is_active", "auth_provider", "account_type",
                "country_code",
            )
            patch = {k: doc[k] for k in sync_keys if existing.get(k) != doc.get(k)}
            if patch:
                patch["updated_at"] = now_iso()
                await db.users.update_one({"user_id": existing["user_id"]}, {"$set": patch})
                logger.info("Sentinelle synchronisée (%s): %s", defn.username, ", ".join(patch.keys()))
            user_id = existing["user_id"]
        else:
            collision = await db.users.find_one({
                "username": doc["username"],
                "system_key": {"$ne": doc["system_key"]},
            })
            if collision:
                logger.warning(
                    "Sentinelle %s non créée — username déjà pris (user_id=%s)",
                    defn.username, collision.get("user_id"),
                )
                continue
            await db.users.insert_one(doc)
            user_id = doc["user_id"]
            logger.info("Sentinelle système créée: %s (user_id=%s)", defn.username, user_id)

        if system_key == NARIA_SYSTEM_KEY and defn.legacy_user_id:
            migrated = await migrate_team_profile_user_id(
                db, user_id, legacy_user_id=defn.legacy_user_id,
            )
            if migrated:
                logger.info("Profil équipe Naria migré depuis %s", defn.legacy_user_id)

        if defn.default_nationality:
            existing_profile = await db.team_page_profiles.find_one({"user_id": user_id}, {"_id": 0, "nationality": 1})
            if not (existing_profile or {}).get("nationality"):
                await db.team_page_profiles.update_one(
                    {"user_id": user_id},
                    {
                        "$set": {"nationality": defn.default_nationality, "updated_by": "system"},
                        "$setOnInsert": {"visible": True, "sort_order": 50},
                    },
                    upsert=True,
                )


async def ensure_indexes(db) -> None:
    await db.users.create_index("system_key", unique=True, sparse=True)


async def verify_system_sentinel(db, system_key: str) -> tuple[bool, list[str], dict | None]:
    defn = SENTINEL_REGISTRY.get(system_key)
    if not defn:
        return False, [f"system_key inconnu: {system_key}"], None

    errors: list[str] = []
    user = await find_system_sentinel(db, system_key)
    if not user:
        errors.append(f"{defn.username} introuvable dans users")
        return False, errors, None
    if user.get("system_key") != system_key:
        errors.append(f"system_key != '{system_key}'")
    if user.get("can_login") is not False:
        errors.append("can_login doit être false")
    if user.get("show_in_team") is not defn.show_in_team:
        errors.append(f"show_in_team doit être {defn.show_in_team}")
    if user.get("show_in_community_team") is not defn.show_in_community_team:
        errors.append(f"show_in_community_team doit être {defn.show_in_community_team}")
    if user.get("is_moderation_actor") is not defn.is_moderation_actor:
        errors.append(f"is_moderation_actor doit être {defn.is_moderation_actor}")
    if not user.get("user_id"):
        errors.append("user_id manquant")
    if user.get("username") != defn.username:
        errors.append(f"username attendu '{defn.username}'")
    ok = len(errors) == 0
    return ok, errors, user


async def verify_naria(db) -> tuple[bool, list[str], dict | None]:
    return await verify_system_sentinel(db, NARIA_SYSTEM_KEY)


async def verify_shumi(db) -> tuple[bool, list[str], dict | None]:
    return await verify_system_sentinel(db, SHUMI_SYSTEM_KEY)


verify_vigile = verify_shumi


_moderation_actor_cache: dict[str, dict] = {}


def clear_moderation_actor_cache() -> None:
    global _moderation_actor_cache
    _moderation_actor_cache = {}


clear_naria_actor_cache = clear_moderation_actor_cache


def official_sentinel_card_user(user: dict, team_row: dict | None = None) -> dict:
    """Champs publics pour la carte héros fermée d'une Sentinelle officielle."""
    team_row = team_row or {}
    base = {
        "user_id": user["user_id"],
        "username": user.get("username"),
        "display_name": user.get("display_name") or user.get("username"),
        "avatar_url": user.get("avatar_url"),
        "class_name": user.get("class_name") or "Sentinelle",
        "class_id": user.get("class_id") or "explorer",
        "rank": user.get("rank") or "Sentinelle officielle du Nexus",
        "level": user.get("level", 99),
        "role": "moderator",
        "is_official_sentinel": True,
        "bio": team_row.get("team_bio") or user.get("bio") or "",
        "quote": team_row.get("team_tagline") or user.get("quote") or "",
        "team_role_label": team_row.get("team_role_label") or user.get("public_role") or "Sentinelle",
        "team_specialties": team_row.get("team_specialties") or [],
        "active_title_name": "Sentinelle",
        "active_title": "sentinelle",
    }
    if is_shumi_sentinel(user):
        return apply_shumi_display_identity(base)
    return base


async def build_official_sentinel_team_row(db, user: dict, owner_username: str) -> dict:
    from team_page import load_team_profiles_map

    profiles = await load_team_profiles_map(db)
    return merge_official_sentinel_team_row(user, profiles.get(user["user_id"]), owner_username)


def _actor_payload(user: dict, *, action_source: str) -> dict:
    return {
        "user_id": user["user_id"],
        "username": user.get("username"),
        "display_name": user.get("display_name") or user.get("username"),
        "role": user.get("public_role") or user.get("role") or NARIA_PUBLIC_ROLE,
        "actor_type": "sentinelle",
        "action_source": action_source,
    }


async def resolve_moderation_actor(db, content_type: str | None = None) -> dict:
    """Acteur Sentinelle pour logs/notifications — Naria ou Shumi selon la zone."""
    key = moderation_actor_system_key(content_type)
    if key in _moderation_actor_cache:
        return _moderation_actor_cache[key]

    user = await find_moderation_actor_user(db, key)
    defn = SENTINEL_REGISTRY[key]
    if user:
        payload = _actor_payload(user, action_source=key)
    else:
        payload = {
            "user_id": defn.username.lower(),
            "username": defn.username,
            "display_name": defn.username,
            "role": defn.public_role,
            "actor_type": "sentinelle",
            "action_source": key,
        }
    _moderation_actor_cache[key] = payload
    return payload


async def resolve_naria_actor(db) -> dict:
    return await resolve_moderation_actor(db, "profile")


async def resolve_shumi_actor(db) -> dict:
    return await resolve_moderation_actor(db, "nexus_room_chat")


async def load_community_sentinels_for_team(db, profiles: dict, owner_username: str) -> list[dict]:
    rows: list[dict] = []
    for key, defn in SENTINEL_REGISTRY.items():
        if not defn.show_in_community_team:
            continue
        user = await find_system_sentinel(db, key)
        if not user:
            continue
        if not user.get("show_in_community_team", defn.show_in_community_team):
            continue
        row = merge_official_sentinel_team_row(user, profiles.get(user["user_id"]), owner_username)
        if row.get("team_visible", True):
            rows.append(row)
    return rows


async def resolve_community_sentinel_by_id(db, user_id: str) -> tuple[bool, dict | None]:
    """True when user_id refers to a community official sentinel (ex. Naria)."""
    for key, defn in SENTINEL_REGISTRY.items():
        if not defn.show_in_community_team:
            continue
        user = await find_system_sentinel(db, key)
        if not user:
            if defn.legacy_user_id and user_id == defn.legacy_user_id:
                return True, None
            continue
        if user_id in (user["user_id"], defn.legacy_user_id):
            return True, user
    return False, None
