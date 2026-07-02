"""Team page (Communauté) — présentation staff éditable sans toucher aux rangs."""
from __future__ import annotations

from typing import Any

from game_data import TITLES, CLASSES, resolve_class_id
from naria_system import (
    get_sentinel_def,
    is_official_sentinel,
    is_shumi_sentinel,
    merge_official_sentinel_team_row,
    load_community_sentinels_for_team,
    resolve_community_sentinel_by_id,
)

TEAM_PAGE_SETTINGS_ID = "team_page"
# Legacy id — profils équipe migrés vers le vrai user_id via create_naria_system_user.py
NARIA_SENTINEL_USER_ID = "naria_sentinelle"
DEFAULT_TEAM_PAGE_SETTINGS = {
    "title": "L'Équipe",
    "subtitle": "Les gardiens du Nexus",
    "intro": "Sages, Sentinelles et artisans du royaume — ceux qui façonnent l'expérience NEXORIA.",
}

DEFAULT_MEMBER_PROFILE = {
    "visible": True,
    "sort_order": 100,
    "role_label": "",
    "nationality": "",
    "tagline": "",
    "bio": "",
    "specialties": [],
    "moderator_trial": False,
}

PLAYABLE_CLASS_IDS = tuple(CLASSES.keys())


def _needs_team_class_override(user: dict) -> bool:
    if is_official_sentinel(user):
        return True
    if user.get("role") in ("moderator", "sentinelle"):
        return True
    name = (user.get("class_name") or "").strip().lower()
    return name in ("", "sentinelle")


def team_card_class_fields(user: dict) -> dict[str, str]:
    """Classe affichée en pied de carte équipe — variée pour les modos sans classe héros."""
    name = (user.get("class_name") or "").strip().lower()
    cid = resolve_class_id(user)
    if cid and cid in CLASSES and name not in ("", "sentinelle"):
        return {"class_id": cid, "class_name": CLASSES[cid]["name"]}

    defn = get_sentinel_def(user.get("system_key"))
    if not defn and is_shumi_sentinel(user):
        defn = get_sentinel_def("shumi")
    if defn and defn.display_class_id in CLASSES:
        cid = defn.display_class_id
        return {"class_id": cid, "class_name": CLASSES[cid]["name"]}

    seed = user.get("user_id") or user.get("username") or "mod"
    idx = sum(ord(c) for c in seed) % len(PLAYABLE_CLASS_IDS)
    cid = PLAYABLE_CLASS_IDS[idx]
    return {"class_id": cid, "class_name": CLASSES[cid]["name"]}


def apply_team_card_class(row: dict, user: dict) -> dict:
    if not _needs_team_class_override(user):
        return row
    return {**row, **team_card_class_fields(user)}


def is_team_eligible(user: dict, owner_username: str) -> bool:
    if not user:
        return False
    if is_official_sentinel(user):
        return True
    role = user.get("role")
    if role in ("admin", "moderator"):
        return True
    return (user.get("username") or "").lower() == (owner_username or "").lower()


def normalize_specialties(raw) -> list[str]:
    if not raw:
        return []
    if isinstance(raw, str):
        parts = [p.strip() for p in raw.replace(";", ",").split(",")]
    elif isinstance(raw, list):
        parts = [str(p).strip() for p in raw]
    else:
        return []
    out = []
    for p in parts:
        if not p:
            continue
        out.append(p[:40])
        if len(out) >= 8:
            break
    return out


def normalize_member_profile(doc: dict | None) -> dict:
    base = {**DEFAULT_MEMBER_PROFILE}
    if not doc:
        return base
    base["visible"] = bool(doc.get("visible", True))
    try:
        base["sort_order"] = int(doc.get("sort_order", 100))
    except (TypeError, ValueError):
        base["sort_order"] = 100
    for key in ("role_label", "nationality", "tagline", "bio"):
        base[key] = str(doc.get(key) or "").strip()
    base["specialties"] = normalize_specialties(doc.get("specialties"))
    base["moderator_trial"] = bool(doc.get("moderator_trial", False))
    return base


async def get_team_page_settings(db) -> dict:
    doc = await db.site_settings.find_one({"_id": TEAM_PAGE_SETTINGS_ID}, {"_id": 0})
    if not doc:
        return dict(DEFAULT_TEAM_PAGE_SETTINGS)
    return {
        "title": str(doc.get("title") or DEFAULT_TEAM_PAGE_SETTINGS["title"])[:80],
        "subtitle": str(doc.get("subtitle") or DEFAULT_TEAM_PAGE_SETTINGS["subtitle"])[:200],
        "intro": str(doc.get("intro") or "")[:800],
    }


async def load_team_profiles_map(db) -> dict[str, dict]:
    rows = await db.team_page_profiles.find({}, {"_id": 0}).to_list(200)
    return {r["user_id"]: normalize_member_profile(r) for r in rows if r.get("user_id")}


def merge_team_member(user: dict, profile: dict | None, owner_username: str) -> dict:
    p = normalize_member_profile(profile)
    title_id = user.get("active_title") or "novice"
    title_doc = next((t for t in TITLES if t["id"] == title_id), None)
    is_supreme = (user.get("username") or "").lower() == (owner_username or "").lower()
    tagline = p["tagline"] or user.get("quote") or ""
    bio = p["bio"] or user.get("bio") or ""
    row = {
        **user,
        "is_nexus_supreme": is_supreme,
        "active_title_name": title_doc["name"] if title_doc else title_id.replace("_", " ").title(),
        "team_profile": p,
        "team_role_label": p["role_label"] or user.get("public_role") or user.get("team_role") or "",
        "team_nationality": p["nationality"] or user.get("location") or "",
        "team_tagline": tagline,
        "team_bio": bio,
        "team_specialties": p["specialties"],
        "team_visible": p["visible"],
        "team_sort_order": p["sort_order"],
        "team_moderator_trial": p["moderator_trial"],
    }
    if is_official_sentinel(user):
        return apply_team_card_class(merge_official_sentinel_team_row(user, profile, owner_username), user)
    return apply_team_card_class(row, user)


def sort_team_members(members: list[dict]) -> list[dict]:
    role_order = {"admin": 0, "moderator": 1, "sentinelle": 2}

    def key(u):
        supreme = 0 if u.get("is_nexus_supreme") else 1
        official = 0 if u.get("is_official_sentinel") else 1
        sort = u.get("team_sort_order", 100)
        role = role_order.get(u.get("role"), 9)
        level = -(u.get("level") or 0)
        return (supreme, official, sort, role, level)

    return sorted(members, key=key)


async def load_naria_for_team(db, profiles: dict, owner_username: str) -> dict | None:
    rows = await load_community_sentinels_for_team(db, profiles, owner_username)
    return rows[0] if rows else None


async def load_community_team_sentinels(db, profiles: dict, owner_username: str) -> list[dict]:
    return await load_community_sentinels_for_team(db, profiles, owner_username)


async def build_team_members(
    db,
    owner_username: str,
    *,
    include_hidden: bool = False,
) -> list[dict]:
    profiles = await load_team_profiles_map(db)
    staff_rows = await db.users.find(
        {"role": {"$in": ["admin", "moderator"]}},
        {"_id": 0, "user_id": 1, "username": 1, "display_name": 1, "role": 1,
         "system_key": 1, "is_system": 1, "is_moderation_actor": 1,
         "avatar_url": 1, "discord_avatar_url": 1, "level": 1, "rank": 1,
         "active_title": 1, "class_id": 1, "class_name": 1, "quote": 1, "bio": 1,
         "location": 1, "public_role": 1, "team_role": 1},
    ).to_list(100)

    merged_by_id: dict[str, dict] = {}

    def _upsert(row: dict) -> None:
        if not include_hidden and not row.get("team_visible", True):
            return
        uid = row.get("user_id")
        if not uid:
            return
        prev = merged_by_id.get(uid)
        if prev is None:
            merged_by_id[uid] = row
            return
        if row.get("is_official_sentinel") and not prev.get("is_official_sentinel"):
            merged_by_id[uid] = row

    for u in staff_rows:
        if is_official_sentinel(u):
            continue
        _upsert(merge_team_member(u, profiles.get(u["user_id"]), owner_username))

    for row in await load_community_team_sentinels(db, profiles, owner_username):
        _upsert(row)

    return sort_team_members(list(merged_by_id.values()))


async def build_public_team(db, owner_username: str) -> tuple[dict, list[dict]]:
    settings = await get_team_page_settings(db)
    members = await build_team_members(db, owner_username, include_hidden=False)
    return settings, members


def member_to_admin_dict(m: dict) -> dict:
    return {
        "user_id": m["user_id"],
        "username": m.get("username"),
        "display_name": m.get("display_name"),
        "role": m.get("role"),
        "avatar_url": m.get("avatar_url"),
        "discord_avatar_url": m.get("discord_avatar_url"),
        "level": m.get("level"),
        "class_name": m.get("class_name"),
        "is_nexus_supreme": m.get("is_nexus_supreme"),
        "is_official_sentinel": m.get("is_official_sentinel", False),
        "is_automated_sentinel": False,
        "profile": m.get("team_profile"),
    }


async def resolve_team_member_id(db, user_id: str) -> tuple[bool, dict | None]:
    """True when user_id refers to a community official sentinel (ex. Naria)."""
    return await resolve_community_sentinel_by_id(db, user_id)


def naria_system_key(user_id: str, naria_user: dict | None) -> bool:
    if naria_user and user_id == naria_user["user_id"]:
        return True
    return user_id == NARIA_SENTINEL_USER_ID
