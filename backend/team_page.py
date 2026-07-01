"""Team page (Communauté) — présentation staff éditable sans toucher aux rangs."""
from __future__ import annotations

from typing import Any

from game_data import TITLES
from naria_system import find_naria_user, is_official_sentinel, merge_naria_team_row, NARIA_SYSTEM_KEY

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
}


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
    }
    if is_official_sentinel(user):
        return merge_naria_team_row(user, profile, owner_username)
    return row


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
    naria_user = await find_naria_user(db)
    if not naria_user or not naria_user.get("show_in_community_team", True):
        return None
    row = merge_naria_team_row(naria_user, profiles.get(naria_user["user_id"]), owner_username)
    if not row.get("team_visible", True):
        return None
    return row


async def build_public_team(db, owner_username: str) -> tuple[dict, list[dict]]:
    settings = await get_team_page_settings(db)
    profiles = await load_team_profiles_map(db)
    staff_rows = await db.users.find(
        {"role": {"$in": ["admin", "moderator"]}},
        {"_id": 0, "user_id": 1, "username": 1, "display_name": 1, "role": 1,
         "avatar_url": 1, "discord_avatar_url": 1, "level": 1, "rank": 1,
         "active_title": 1, "class_name": 1, "quote": 1, "bio": 1, "location": 1,
         "public_role": 1, "team_role": 1},
    ).to_list(50)

    merged = []
    for u in staff_rows:
        row = merge_team_member(u, profiles.get(u["user_id"]), owner_username)
        if row.get("team_visible", True):
            merged.append(row)

    naria_row = await load_naria_for_team(db, profiles, owner_username)
    if naria_row:
        merged.append(naria_row)

    return settings, sort_team_members(merged)


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
    """True when user_id refers to Naria (system sentinel)."""
    naria = await find_naria_user(db)
    if not naria:
        return user_id == NARIA_SENTINEL_USER_ID, None
    if user_id in (naria["user_id"], NARIA_SENTINEL_USER_ID):
        return True, naria
    return False, None


def naria_system_key(user_id: str, naria_user: dict | None) -> bool:
    if naria_user and user_id == naria_user["user_id"]:
        return True
    return user_id == NARIA_SENTINEL_USER_ID
