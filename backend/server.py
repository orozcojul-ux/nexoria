"""NEXORIA - Plateforme web communautaire RPG.
Backend FastAPI + MongoDB.
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import secrets as _secrets
import logging
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from auth import (
    hash_password, verify_password, create_session_token, session_expiry,
    set_session_cookie, clear_session_cookie, get_current_user, generate_user_id,
)
from game_data import (
    CLASSES, SKILLS, KINGDOM_BUILDINGS, RARITIES, TITLES, BADGES,
    QUEST_TEMPLATES, ITEM_TEMPLATES, xp_for_level, level_from_xp, rank_from_level,
)
from oracle import consult_oracle, generate_personalized_quest
from shop_data import SHOP_ITEMS, get_shop_item
from notifications import push_notification
import discord_auth
import discord_sync
import asyncio
import nexus_world

# ---------- DB ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- App ----------
app = FastAPI(title="NEXORIA API")
api = APIRouter(prefix="/api")

logger = logging.getLogger("nexoria")
logging.basicConfig(level=logging.INFO)

# ---------- Helpers ----------
def now_utc():
    return datetime.now(timezone.utc)


def iso(dt):
    return dt.isoformat() if isinstance(dt, datetime) else dt


def public_user(user: dict) -> dict:
    """Strip sensitive fields, enrich with derived RPG values, and serialize cleanly.

    Derived fields (computed by backend — frontend MUST NOT recompute):
    - xp_next: XP cumulatif requis pour passer au niveau suivant
    - xp_pct: pourcentage de progression vers le niveau suivant (0-100)
    - xp_current_level: XP cumulatif au début du niveau actuel
    """
    if not user:
        return {}
    user = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    for k, v in list(user.items()):
        if isinstance(v, datetime):
            user[k] = v.isoformat()

    # Derive XP curve data (single source of truth)
    lvl = user.get("level", 1)
    xp = user.get("xp", 0)
    if lvl >= 999:
        user["xp_next"] = xp
        user["xp_current_level"] = xp
        user["xp_pct"] = 100.0
    else:
        # Level N starts at xp_for_level(N) for N>=2; level 1 starts at 0
        xp_curr = xp_for_level(lvl) if lvl >= 2 else 0
        xp_next = xp_for_level(lvl + 1)
        span = max(1, xp_next - xp_curr)
        user["xp_current_level"] = xp_curr
        user["xp_next"] = xp_next
        user["xp_pct"] = round(min(100.0, max(0.0, (xp - xp_curr) / span * 100)), 2)
    return user


async def get_user_dep(request: Request):
    return await get_current_user(request, db)


def enforce_ban_or_raise(user: dict):
    """Raise 403 if user is currently banned. Use this on login/oauth endpoints
    (which don't go through get_user_dep). Auto-clears expired bans is handled
    elsewhere — here we only block fresh bans."""
    banned_until = user.get("banned_until")
    if not banned_until:
        return
    if isinstance(banned_until, str):
        try:
            bu = datetime.fromisoformat(banned_until)
        except ValueError:
            return
    else:
        bu = banned_until
    if bu.tzinfo is None:
        bu = bu.replace(tzinfo=timezone.utc)
    if bu > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=403,
            detail={
                "banned": True,
                "reason": user.get("ban_reason", "Violation des règles"),
                "until": bu.isoformat(),
            },
        )


async def get_admin_dep(request: Request):
    user = await get_current_user(request, db)
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user


async def get_staff_dep(request: Request):
    user = await get_current_user(request, db)
    if user.get("role") not in ("admin", "moderator"):
        raise HTTPException(403, "Staff only")
    return user


async def add_chronicle(user_id: str, text: str, kind: str = "event"):
    await db.chronicles.insert_one({
        "chronicle_id": f"chr_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "text": text,
        "kind": kind,
        "created_at": now_utc().isoformat(),
    })

# Pre-build a lookup for badge definitions to enrich user_badges quickly
_BADGE_DEFS_BY_ID = {b["id"]: b for b in BADGES}


def enrich_badges(rows):
    """Join user_badges rows with their static BADGE definition.

    Returns each row enriched with: name, icon (lucide name), rarity, description,
    color, category. Falls back to a safe 'Badge Mystérieux' if def missing.
    """
    out = []
    for row in rows or []:
        bid = row.get("badge_id") or row.get("id")
        defn = _BADGE_DEFS_BY_ID.get(bid) or {}
        out.append({
            **row,
            "badge_id": bid,
            "id": bid,
            "name": defn.get("name") or row.get("name") or "Badge Mystérieux",
            "icon": defn.get("icon") or row.get("icon") or "Sparkles",
            "rarity": defn.get("rarity") or row.get("rarity") or "common",
            "description": defn.get("description") or row.get("description") or "",
            "color": defn.get("color") or row.get("color"),
            "category": defn.get("category") or row.get("category") or "secrets",
        })
    return out




async def grant_badge(user_id: str, badge_id: str):
    existing = await db.user_badges.find_one({"user_id": user_id, "badge_id": badge_id})
    if existing:
        return False
    badge_def = next((b for b in BADGES if b["id"] == badge_id), None)
    if not badge_def:
        return False
    await db.user_badges.insert_one({
        "user_id": user_id,
        "badge_id": badge_id,
        "obtained_at": now_utc().isoformat(),
    })
    await add_chronicle(user_id, f"A obtenu le badge « {badge_def['name']} »", "badge")
    # Send a notification with sound + icon
    await push_notification(
        db, user_id, "badge",
        f"Badge débloqué : {badge_def['name']}",
        badge_def.get("description", ""),
        "ding",
        badge_def.get("icon", "Award"),
    )
    return True


async def grant_xp(user_id: str, amount: int, reason: str = ""):
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        return
    new_xp = user.get("xp", 0) + amount
    old_level = user.get("level", 1)
    new_level = level_from_xp(new_xp)
    new_rank = rank_from_level(new_level)
    update = {"xp": new_xp, "level": new_level, "rank": new_rank}
    if new_level > old_level:
        update["skill_points"] = user.get("skill_points", 0) + (new_level - old_level)
        await add_chronicle(user_id, f"A atteint le niveau {new_level} — Rang {new_rank}", "level_up")
        # Auto-sync Discord roles when level changes (may cross a progression tier)
        old_tier = discord_sync.progression_tier_from_level(old_level)
        new_tier = discord_sync.progression_tier_from_level(new_level)
        if new_tier != old_tier:
            discord_sync.schedule_sync(db, user_id)
            asyncio.create_task(discord_sync.post_notification(
                f"🌟 **{user.get('username','?')}** ascende au rang **{new_tier}** (niv. {new_level})"
            ))
    await db.users.update_one({"user_id": user_id}, {"$set": update})
    # Mirror to active season score (idempotent upsert)
    active_season = await db.seasons.find_one({"active": True}, {"_id": 0, "season_id": 1})
    if active_season:
        await db.season_scores.update_one(
            {"season_id": active_season["season_id"], "user_id": user_id},
            {"$inc": {"season_xp": amount},
             "$setOnInsert": {"first_seen_at": now_utc().isoformat()}},
            upsert=True,
        )


async def grant_aether(user_id: str, amount: int):
    await db.users.update_one({"user_id": user_id}, {"$inc": {"aether": amount}})


async def grant_reputation(user_id: str, amount: int):
    await db.users.update_one({"user_id": user_id}, {"$inc": {"reputation": amount}})


async def progress_quests(user_id: str, action: str, amount: int = 1):
    """Advance all active quests matching the action."""
    quests = await db.user_quests.find({"user_id": user_id, "action": action, "completed": False}).to_list(100)
    for q in quests:
        new_progress = q.get("progress", 0) + amount
        completed = new_progress >= q["target"]
        update = {"progress": new_progress, "completed": completed}
        if completed:
            update["completed_at"] = now_utc().isoformat()
            await db.user_quests.update_one({"_id": q["_id"]}, {"$set": update})
            await grant_xp(user_id, q["xp"], f"quest:{q['quest_id']}")
            await grant_aether(user_id, q["aether"])
            await add_chronicle(user_id, f"A accompli la quête « {q['name']} »", "quest")
            # Quest count badges
            completed_count = await db.user_quests.count_documents({"user_id": user_id, "completed": True})
            if completed_count >= 10:
                await grant_badge(user_id, "quest_finisher")
            if completed_count >= 100:
                await grant_badge(user_id, "quest_champion")
        else:
            await db.user_quests.update_one({"_id": q["_id"]}, {"$set": update})


def _secure_choice(seq):
    return seq[_secrets.randbelow(len(seq))]


def _secure_weighted_choice(items, weights):
    """Cryptographically secure weighted choice."""
    # Scale weights to ints for precision
    scaled = [int(w * 10000) for w in weights]
    total_scaled = sum(scaled)
    r = _secrets.randbelow(total_scaled)
    cumulative = 0
    for item, w in zip(items, scaled):
        cumulative += w
        if r < cumulative:
            return item
    return items[-1]


def pick_random_item():
    """Weighted random item from templates (game RNG)."""
    return _secure_choice(ITEM_TEMPLATES)


async def open_chest(user_id: str):
    """Generate 1-3 random items. If user already owns the (name, rarity), skip it (no duplicate).
    If all items of the rolled rarity are already owned, fallback to another rarity. As last resort,
    return the items the user got (may be fewer than rolled count)."""
    items = []
    count = _secure_weighted_choice([1, 2, 3], [60, 30, 10])
    # Preload owned (name, rarity) pairs for this user once.
    owned_docs = await db.inventory.find(
        {"user_id": user_id}, {"_id": 0, "name": 1, "rarity": 1}
    ).to_list(1000)
    owned_set = {(d["name"], d["rarity"]) for d in owned_docs}

    rarity_ids = list(RARITIES.keys())
    weights = [RARITIES[r]["weight"] for r in rarity_ids]

    attempts = 0
    while len(items) < count and attempts < count * 6:
        attempts += 1
        rarity = _secure_weighted_choice(rarity_ids, weights)
        # Filter templates NOT already owned, of this rarity
        candidates = [t for t in ITEM_TEMPLATES if t["rarity"] == rarity and (t["name"], t["rarity"]) not in owned_set]
        if not candidates:
            # try any rarity not owned
            candidates = [t for t in ITEM_TEMPLATES if (t["name"], t["rarity"]) not in owned_set]
            if not candidates:
                break  # User owns everything — stop, return what we have
        tmpl = _secure_choice(candidates)

        item = {
            "item_id": f"item_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "name": tmpl["name"], "type": tmpl["type"], "rarity": tmpl["rarity"], "icon": tmpl["icon"],
            "quantity": 1,
            "obtained_at": now_utc().isoformat(),
            "last_obtained_at": now_utc().isoformat(),
        }
        await db.inventory.insert_one(item)
        item.pop("_id", None)
        item["duplicate"] = False
        owned_set.add((tmpl["name"], tmpl["rarity"]))
        items.append(item)
        await add_chronicle(user_id, f"A découvert {tmpl['name']} ({RARITIES[tmpl['rarity']]['name']})", "item")
    return items


# ---------- Models ----------
class RegisterReq(BaseModel):
    email: EmailStr
    username: str
    password: str
    class_id: str


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class PostReq(BaseModel):
    content: str


class CommentReq(BaseModel):
    content: str


class OracleReq(BaseModel):
    question: str


class SkillReq(BaseModel):
    skill_id: str


class TitleReq(BaseModel):
    title_id: str


class SessionExchangeReq(BaseModel):
    session_id: str


# ---------- Static game data endpoints ----------
@api.get("/")
async def root():
    return {"name": "NEXORIA API", "status": "online"}


@api.get("/game/classes")
async def get_classes():
    return list(CLASSES.values())


@api.get("/game/skills")
async def get_skills():
    return SKILLS


@api.get("/game/buildings")
async def get_buildings():
    return KINGDOM_BUILDINGS


@api.get("/game/rarities")
async def get_rarities():
    return list(RARITIES.values())


@api.get("/game/titles")
async def get_titles():
    return TITLES


@api.get("/game/badges")
async def get_badges():
    return BADGES


@api.get("/game/xp-rules")
async def get_xp_rules():
    """Source of truth for XP rewards per action — frontend MUST NOT hardcode these."""
    return {
        "post": 20,
        "react": 2,
        "reaction_received": 5,
        "comment": 10,
        "rift_claim": 200,
        "reputation_per_reaction": 2,
        "chest_cost_aether": 50,
        "max_level": 999,
    }


# ---------- Auth: register / login ----------
@api.post("/auth/register")
async def register(req: RegisterReq, response: Response):
    email = req.email.lower()
    if req.class_id not in CLASSES:
        raise HTTPException(400, "Classe invalide")
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email déjà utilisé")
    if await db.users.find_one({"username": req.username}):
        raise HTTPException(400, "Pseudo déjà pris")

    user_id = generate_user_id()
    cls = CLASSES[req.class_id]
    user_doc = {
        "user_id": user_id,
        "email": email,
        "username": req.username,
        "password_hash": hash_password(req.password),
        "class_id": req.class_id,
        "class_name": cls["name"],
        "secondary_class_id": None,
        "avatar_url": None,
        "banner_url": None,
        "bio": "",
        "story": "",
        "quote": "",
        "level": 1,
        "xp": 0,
        "rank": "Novice",
        "reputation": 0,
        "aether": 100,
        "skill_points": 1,
        "active_title": "novice",
        "role": "admin" if email == os.environ.get("ADMIN_EMAIL", "").lower() else "user",
        "auth_provider": "local",
        "created_at": now_utc().isoformat(),
        "dna": {"creativity": 10, "ambition": 10, "sociability": 10, "curiosity": 10, "persistence": 10, "influence": 10},
        "kingdom": {b["id"]: {"level": 1 if b["id"] == "castle" else 0} for b in KINGDOM_BUILDINGS},
        "skills_allocated": {},
        "followers": 0,
        "following": 0,
    }
    # apply class stat bonus
    for stat, bonus in cls.get("stat_bonus", {}).items():
        if stat in user_doc["dna"]:
            user_doc["dna"][stat] += bonus * 5
    await db.users.insert_one(user_doc)

    # session
    token = create_session_token()
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user_id,
        "expires_at": session_expiry().isoformat(),
        "created_at": now_utc().isoformat(),
    })
    set_session_cookie(response, token)

    await add_chronicle(user_id, f"Le héros {req.username} ({cls['name']}) a rejoint NEXORIA", "creation")

    result = public_user(user_doc)
    result["session_token"] = token
    return result


@api.post("/auth/login")
async def login(req: LoginReq, response: Response):
    email = req.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Identifiants invalides")
    # Reject login if currently banned (don't issue a token at all)
    enforce_ban_or_raise(user)
    token = create_session_token()
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user["user_id"],
        "expires_at": session_expiry().isoformat(),
        "created_at": now_utc().isoformat(),
    })
    set_session_cookie(response, token)
    result = public_user(user)
    result["session_token"] = token
    return result


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    clear_session_cookie(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_user_dep)):
    return public_user(user)


# ---------- Emergent Google Auth ----------
@api.post("/auth/google/session")
async def google_session(req: SessionExchangeReq, response: Response):
    """Exchange the Emergent session_id for our own session_token."""
    async with httpx.AsyncClient(timeout=10) as client_http:
        r = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": req.session_id},
        )
        if r.status_code != 200:
            raise HTTPException(401, "Session Google invalide")
        data = r.json()

    email = data["email"].lower()
    name = data.get("name", "Aventurier")
    picture = data.get("picture")
    emergent_token = data["session_token"]

    user = await db.users.find_one({"email": email})
    if user:
        # Reject banned user before creating session
        enforce_ban_or_raise(user)
    if not user:
        # New user — assign default class explorer until they pick one
        user_id = generate_user_id()
        username = name.replace(" ", "") or f"Heros{uuid.uuid4().hex[:6]}"
        # ensure unique username
        i = 0
        base = username
        while await db.users.find_one({"username": username}):
            i += 1
            username = f"{base}{i}"
        cls = CLASSES["explorer"]
        user_doc = {
            "user_id": user_id, "email": email, "username": username,
            "password_hash": None,
            "class_id": "explorer", "class_name": cls["name"],
            "secondary_class_id": None,
            "avatar_url": picture, "banner_url": None,
            "bio": "", "story": "", "quote": "",
            "level": 1, "xp": 0, "rank": "Novice",
            "reputation": 0, "aether": 100, "skill_points": 1,
            "active_title": "novice",
            "role": "admin" if email == os.environ.get("ADMIN_EMAIL", "").lower() else "user",
            "auth_provider": "google",
            "created_at": now_utc().isoformat(),
            "dna": {"creativity": 15, "ambition": 10, "sociability": 10, "curiosity": 13, "persistence": 10, "influence": 10},
            "kingdom": {b["id"]: {"level": 1 if b["id"] == "castle" else 0} for b in KINGDOM_BUILDINGS},
            "skills_allocated": {},
            "followers": 0, "following": 0,
            "needs_class_selection": True,
        }
        await db.users.insert_one(user_doc)
        await add_chronicle(user_id, f"Le héros {username} a rejoint NEXORIA via Google", "creation")
        user = user_doc
    else:
        # update avatar if missing
        if picture and not user.get("avatar_url"):
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"avatar_url": picture}})
            user["avatar_url"] = picture

    # create our session (use the emergent token as the cookie value for simplicity)
    await db.user_sessions.insert_one({
        "session_token": emergent_token,
        "user_id": user["user_id"],
        "expires_at": session_expiry().isoformat(),
        "created_at": now_utc().isoformat(),
        "provider": "google",
    })
    set_session_cookie(response, emergent_token)
    result = public_user(user)
    result["session_token"] = emergent_token
    return result


# ---------- Profile ----------
class ProfileUpdateReq(BaseModel):
    bio: Optional[str] = None
    story: Optional[str] = None
    quote: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    secondary_class_id: Optional[str] = None
    class_id: Optional[str] = None
    active_banner: Optional[str] = None   # SKU of equipped banner cosmetic
    active_frame: Optional[str] = None    # SKU of equipped frame cosmetic
    language: Optional[str] = None        # User-selected language code (fr/en/es/de/it)


@api.put("/profile")
async def update_profile(req: ProfileUpdateReq, user: dict = Depends(get_user_dep)):
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if "class_id" in update:
        if update["class_id"] not in CLASSES:
            raise HTTPException(400, "Classe invalide")
        update["class_name"] = CLASSES[update["class_id"]]["name"]
        update["needs_class_selection"] = False
    if "secondary_class_id" in update and update["secondary_class_id"] not in CLASSES:
        raise HTTPException(400, "Classe secondaire invalide")
    # Validate cosmetic ownership for active_* fields
    if "active_banner" in update and update["active_banner"]:
        owned = await db.user_cosmetics.find_one({"user_id": user["user_id"], "sku": update["active_banner"]})
        if not owned:
            raise HTTPException(400, "Cette bannière n'a pas été acquise")
    if "active_frame" in update and update["active_frame"]:
        owned = await db.user_cosmetics.find_one({"user_id": user["user_id"], "sku": update["active_frame"]})
        if not owned:
            raise HTTPException(400, "Ce cadre n'a pas été acquis")
    # Language change tracking → polyglot badge after 2 distinct languages
    if "language" in update and update["language"]:
        await db.user_languages.update_one(
            {"user_id": user["user_id"], "language": update["language"]},
            {"$set": {"last_used_at": now_utc().isoformat()},
             "$setOnInsert": {"user_id": user["user_id"], "language": update["language"], "first_used_at": now_utc().isoformat()}},
            upsert=True,
        )
        distinct_count = await db.user_languages.count_documents({"user_id": user["user_id"]})
        if distinct_count >= 2:
            await grant_badge(user["user_id"], "polyglot")

    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})

    # Discord sync triggers
    sync_class_or_progress = "class_id" in update or "level" in update
    if sync_class_or_progress:
        discord_sync.schedule_sync(db, user["user_id"])
    if "class_id" in update:
        # Optional notification
        cls_name = update.get("class_name", update["class_id"])
        asyncio.create_task(discord_sync.post_notification(
            f"⚔️ **{user['username']}** a embrassé la voie du **{cls_name}**"
        ))

    # Badges + XP for customization (only for textual/avatar/banner_url changes)
    if "avatar_url" in update or "banner_url" in update:
        await grant_badge(user["user_id"], "shapeshifter")
        await grant_xp(user["user_id"], 30, "customization")
    if "story" in update and update.get("story", "").strip():
        await grant_badge(user["user_id"], "storyteller")
        await grant_xp(user["user_id"], 50, "story_written")

    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return public_user(fresh)


@api.get("/profile/{username}")
async def get_profile_by_username(username: str):
    user = await db.users.find_one({"username": username}, {"_id": 0, "password_hash": 0, "email": 0})
    if not user:
        raise HTTPException(404, "Héros introuvable")
    user_badges = await db.user_badges.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    return {"profile": public_user(user), "badges": enrich_badges(user_badges), "xp_next": xp_for_level(user["level"] + 1) if user["level"] < 999 else None}


@api.put("/profile/title")
async def set_title(req: TitleReq, user: dict = Depends(get_user_dep)):
    title = next((t for t in TITLES if t["id"] == req.title_id), None)
    if not title or user["level"] < title["unlock_level"]:
        raise HTTPException(400, "Titre non débloqué")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"active_title": req.title_id}})
    return {"ok": True}


# ---------- Skill tree ----------
@api.post("/skills/allocate")
async def allocate_skill(req: SkillReq, user: dict = Depends(get_user_dep)):
    if req.skill_id not in [s["id"] for s in SKILLS]:
        raise HTTPException(400, "Compétence invalide")
    if user.get("skill_points", 0) <= 0:
        raise HTTPException(400, "Aucun point de compétence disponible")
    skills_alloc = user.get("skills_allocated", {})
    skills_alloc[req.skill_id] = skills_alloc.get(req.skill_id, 0) + 1
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"skills_allocated": skills_alloc}, "$inc": {"skill_points": -1}},
    )
    total = sum(skills_alloc.values())
    if total >= 5:
        await grant_badge(user["user_id"], "skill_tree_5")
    if total >= 50:
        await grant_badge(user["user_id"], "skill_tree_50")
    return {"ok": True, "skills_allocated": skills_alloc, "skill_points": user["skill_points"] - 1}


# ---------- Inventory ----------
async def dedupe_inventory(user_id: str) -> int:
    """Collapse all (name, rarity) duplicates into a single row with summed quantity.
    Returns the number of duplicate rows removed."""
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": {"name": "$name", "rarity": "$rarity"},
            "ids": {"$push": "$_id"},
            "item_ids": {"$push": "$item_id"},
            "qty_sum": {"$sum": {"$ifNull": ["$quantity", 1]}},
            "first_obtained": {"$min": "$obtained_at"},
            "last_obtained": {"$max": "$last_obtained_at"},
            "count": {"$sum": 1},
        }},
        {"$match": {"count": {"$gt": 1}}},
    ]
    removed = 0
    async for grp in db.inventory.aggregate(pipeline):
        keep_id = grp["ids"][0]
        rest_ids = grp["ids"][1:]
        # Sum quantities into the kept row
        await db.inventory.update_one(
            {"_id": keep_id},
            {"$set": {
                "quantity": grp["qty_sum"],
                "obtained_at": grp["first_obtained"],
                "last_obtained_at": grp["last_obtained"] or grp["first_obtained"],
            }},
        )
        result = await db.inventory.delete_many({"_id": {"$in": rest_ids}})
        removed += result.deleted_count
    return removed


@api.get("/inventory")
async def get_inventory(user: dict = Depends(get_user_dep)):
    # Auto-dedupe on every read (idempotent, cheap when no dupes)
    await dedupe_inventory(user["user_id"])
    items = await db.inventory.find({"user_id": user["user_id"]}, {"_id": 0}).sort("obtained_at", -1).to_list(500)
    return items


@api.post("/inventory/dedupe")
async def dedupe_inventory_endpoint(user: dict = Depends(get_user_dep)):
    """Manual cleanup — collapse duplicates into a single row per (name, rarity)."""
    removed = await dedupe_inventory(user["user_id"])
    return {"removed": removed}


@api.post("/inventory/open-chest")
async def open_chest_endpoint(user: dict = Depends(get_user_dep)):
    cost = 50
    fresh = await db.users.find_one({"user_id": user["user_id"]})
    if fresh.get("aether", 0) < cost:
        raise HTTPException(400, f"Aether insuffisant ({cost} requis)")
    # Defensive: collapse any existing duplicates before computing "already owned"
    await dedupe_inventory(user["user_id"])
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"aether": -cost}})
    items = await open_chest(user["user_id"])
    # If user owns everything → refund the cost (no items granted)
    if not items:
        await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"aether": cost}})
        return {"items": [], "refunded": cost, "reason": "all_owned"}
    # award badges for rarity collection
    for it in items:
        if it["rarity"] == "mythic":
            await grant_badge(user["user_id"], "mythic_owner")
        if it["rarity"] == "divine":
            await grant_badge(user["user_id"], "divine_keeper")
        if it["rarity"] == "cosmic":
            await grant_badge(user["user_id"], "cosmic_chosen")
    total_items = await db.inventory.count_documents({"user_id": user["user_id"]})
    if total_items >= 10:
        await grant_badge(user["user_id"], "relic_hunter")
    if total_items >= 100:
        await grant_badge(user["user_id"], "ultimate_collector")
    return {"items": items}


# ---------- Kingdom ----------
@api.post("/kingdom/upgrade/{building_id}")
async def upgrade_building(building_id: str, user: dict = Depends(get_user_dep)):
    building = next((b for b in KINGDOM_BUILDINGS if b["id"] == building_id), None)
    if not building:
        raise HTTPException(400, "Bâtiment invalide")
    if user["level"] < building["unlock_level"]:
        raise HTTPException(400, f"Niveau {building['unlock_level']} requis")
    kingdom = user.get("kingdom", {})
    current = kingdom.get(building_id, {"level": 0})
    next_level = current["level"] + 1
    cost = 100 * next_level
    fresh = await db.users.find_one({"user_id": user["user_id"]})
    if fresh.get("aether", 0) < cost:
        raise HTTPException(400, f"Coût: {cost} Aether")
    kingdom[building_id] = {"level": next_level}
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {f"kingdom.{building_id}": {"level": next_level}}, "$inc": {"aether": -cost}},
    )
    await add_chronicle(user["user_id"], f"A amélioré son {building['name']} au niveau {next_level}", "kingdom")
    if any(v.get("level", 0) >= 5 for v in kingdom.values()):
        await grant_badge(user["user_id"], "architect_master")
    return {"ok": True, "kingdom": kingdom, "cost": cost}


# ---------- Posts / Feed ----------
@api.get("/feed")
async def get_feed():
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    # enrich with author info
    user_ids = list({p["user_id"] for p in posts})
    users = await db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0, "user_id": 1, "username": 1, "avatar_url": 1, "level": 1, "class_name": 1, "active_title": 1, "rank": 1, "role": 1}).to_list(500)
    umap = {u["user_id"]: u for u in users}
    for p in posts:
        p["author"] = umap.get(p["user_id"], {})
    return posts


@api.post("/posts")
async def create_post(req: PostReq, user: dict = Depends(get_user_dep)):
    if not req.content.strip():
        raise HTTPException(400, "Contenu vide")
    post = {
        "post_id": f"post_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "content": req.content.strip()[:1000],
        "reactions": 0,
        "comments_count": 0,
        "created_at": now_utc().isoformat(),
    }
    await db.posts.insert_one(post)
    post.pop("_id", None)
    XP_PER_POST = 20
    await grant_xp(user["user_id"], XP_PER_POST, "post")
    await progress_quests(user["user_id"], "post", 1)
    # badges
    count = await db.posts.count_documents({"user_id": user["user_id"]})
    if count >= 1:
        await grant_badge(user["user_id"], "first_step")
    if count >= 10:
        await grant_badge(user["user_id"], "creator")
    if count >= 100:
        await grant_badge(user["user_id"], "innovator")
    if count >= 100:
        await grant_badge(user["user_id"], "chatter_100")
    if count >= 1000:
        await grant_badge(user["user_id"], "chatter_1000")
    post["xp_gained"] = XP_PER_POST
    return post


@api.delete("/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(get_user_dep)):
    """Delete a post. Allowed for the author OR any staff (admin/moderator)."""
    post = await db.posts.find_one({"post_id": post_id})
    if not post:
        raise HTTPException(404, "Publication introuvable")
    is_staff = user.get("role") in ("admin", "moderator")
    is_author = post["user_id"] == user["user_id"]
    if not (is_staff or is_author):
        raise HTTPException(403, "Action interdite")
    await db.posts.delete_one({"post_id": post_id})
    await db.comments.delete_many({"post_id": post_id})
    await db.reactions.delete_many({"post_id": post_id})
    if is_staff and not is_author:
        await add_chronicle(post["user_id"], f"Publication retirée par le Conseil ({user['username']})", "moderation")
    return {"ok": True}



@api.post("/posts/{post_id}/react")
async def react_to_post(post_id: str, user: dict = Depends(get_user_dep)):
    XP_REACT = 2
    XP_REACTION_RECEIVED = 5
    REP_REACTION_RECEIVED = 2
    existing = await db.reactions.find_one({"post_id": post_id, "user_id": user["user_id"]})
    if existing:
        await db.reactions.delete_one({"_id": existing["_id"]})
        await db.posts.update_one({"post_id": post_id}, {"$inc": {"reactions": -1}})
        return {"reacted": False, "xp_gained": 0}
    await db.reactions.insert_one({"post_id": post_id, "user_id": user["user_id"], "created_at": now_utc().isoformat()})
    await db.posts.update_one({"post_id": post_id}, {"$inc": {"reactions": 1}})
    post = await db.posts.find_one({"post_id": post_id})
    if post:
        await grant_xp(post["user_id"], XP_REACTION_RECEIVED, "reaction_received")
        await grant_reputation(post["user_id"], REP_REACTION_RECEIVED)
    await grant_xp(user["user_id"], XP_REACT, "react")
    await progress_quests(user["user_id"], "react", 1)
    count = await db.reactions.count_documents({"user_id": user["user_id"]})
    if count >= 50:
        await grant_badge(user["user_id"], "social_butterfly")
    if post and post.get("reactions", 0) + 1 >= 100:
        await grant_badge(post["user_id"], "viral_post")
    return {"reacted": True, "xp_gained": XP_REACT}


@api.get("/posts/{post_id}/comments")
async def get_comments(post_id: str):
    comments = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    user_ids = list({c["user_id"] for c in comments})
    users = await db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0, "user_id": 1, "username": 1, "avatar_url": 1, "level": 1, "role": 1}).to_list(500)
    umap = {u["user_id"]: u for u in users}
    for c in comments:
        c["author"] = umap.get(c["user_id"], {})
    return comments


@api.post("/posts/{post_id}/comments")
async def add_comment(post_id: str, req: CommentReq, user: dict = Depends(get_user_dep)):
    if not req.content.strip():
        raise HTTPException(400, "Commentaire vide")
    XP_PER_COMMENT = 10
    comment = {
        "comment_id": f"cmt_{uuid.uuid4().hex[:12]}",
        "post_id": post_id,
        "user_id": user["user_id"],
        "content": req.content.strip()[:500],
        "created_at": now_utc().isoformat(),
    }
    await db.comments.insert_one(comment)
    comment.pop("_id", None)
    await db.posts.update_one({"post_id": post_id}, {"$inc": {"comments_count": 1}})
    await grant_xp(user["user_id"], XP_PER_COMMENT, "comment")
    await progress_quests(user["user_id"], "comment", 1)
    comment["xp_gained"] = XP_PER_COMMENT
    return comment


# ---------- Follow ----------
@api.post("/follow/{username}")
async def follow_user(username: str, user: dict = Depends(get_user_dep)):
    target = await db.users.find_one({"username": username})
    if not target or target["user_id"] == user["user_id"]:
        raise HTTPException(400, "Impossible")
    existing = await db.follows.find_one({"follower_id": user["user_id"], "target_id": target["user_id"]})
    if existing:
        await db.follows.delete_one({"_id": existing["_id"]})
        await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"following": -1}})
        await db.users.update_one({"user_id": target["user_id"]}, {"$inc": {"followers": -1}})
        return {"following": False}
    await db.follows.insert_one({"follower_id": user["user_id"], "target_id": target["user_id"], "created_at": now_utc().isoformat()})
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"following": 1}})
    await db.users.update_one({"user_id": target["user_id"]}, {"$inc": {"followers": 1}})
    target_follows = (target.get("followers", 0)) + 1
    follower_count = (await db.follows.count_documents({"follower_id": user["user_id"]}))
    if follower_count >= 10:
        await grant_badge(user["user_id"], "loyal_friend")
    if target_follows >= 100:
        await grant_badge(target["user_id"], "mentor")
    if target_follows >= 1000:
        await grant_badge(target["user_id"], "influencer")
    if target_follows >= 10000:
        await grant_badge(target["user_id"], "legend_status")
    return {"following": True}


# ---------- Quests ----------
@api.get("/quests")
async def get_quests(user: dict = Depends(get_user_dep)):
    # Ensure daily quests exist for today
    today = now_utc().date().isoformat()
    week = now_utc().strftime("%Y-W%U")
    month = now_utc().strftime("%Y-%m")

    existing = await db.user_quests.find({"user_id": user["user_id"]}).to_list(500)
    existing_ids = {(q["quest_id"], q.get("period")) for q in existing}

    for tmpl in QUEST_TEMPLATES:
        period = today if tmpl["type"] == "daily" else (week if tmpl["type"] == "weekly" else month)
        if (tmpl["id"], period) in existing_ids:
            continue
        await db.user_quests.insert_one({
            "user_id_quest_id": f"{user['user_id']}_{tmpl['id']}_{period}",
            "user_id": user["user_id"],
            "quest_id": tmpl["id"],
            "name": tmpl["name"],
            "description": tmpl["description"],
            "type": tmpl["type"],
            "action": tmpl["action"],
            "target": tmpl["target"],
            "progress": 0,
            "completed": False,
            "xp": tmpl["xp"],
            "aether": tmpl["aether"],
            "period": period,
            "created_at": now_utc().isoformat(),
        })

    quests = await db.user_quests.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    # filter to current periods only
    valid = [q for q in quests if q.get("period") in (today, week, month)]
    return valid


@api.post("/quests/daily-login")
async def daily_login(user: dict = Depends(get_user_dep)):
    """Mark daily login - progresses login quest."""
    await progress_quests(user["user_id"], "login", 1)
    return {"ok": True}


# ---------- Oracle IA ----------
@api.post("/oracle/consult")
async def oracle_consult(req: OracleReq, user: dict = Depends(get_user_dep)):
    badge_count = await db.user_badges.count_documents({"user_id": user["user_id"]})
    profile = {**user, "badge_count": badge_count, "active_title": user.get("active_title", "novice")}
    response = await consult_oracle(profile, req.question)
    # log oracle consultations
    await db.oracle_logs.insert_one({
        "user_id": user["user_id"],
        "question": req.question[:500],
        "response": response[:2000],
        "created_at": now_utc().isoformat(),
    })
    await progress_quests(user["user_id"], "oracle", 1)
    count = await db.oracle_logs.count_documents({"user_id": user["user_id"]})
    if count >= 10:
        await grant_badge(user["user_id"], "oracle_blessed")
    return {"response": response}


@api.post("/oracle/quest")
async def oracle_quest(user: dict = Depends(get_user_dep)):
    quest = await generate_personalized_quest(user)
    return quest


# ---------- Chronicle ----------
@api.get("/chronicle")
async def my_chronicle(user: dict = Depends(get_user_dep)):
    entries = await db.chronicles.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return entries


@api.get("/chronicle/{username}")
async def user_chronicle(username: str):
    u = await db.users.find_one({"username": username}, {"user_id": 1})
    if not u:
        raise HTTPException(404, "Héros introuvable")
    entries = await db.chronicles.find({"user_id": u["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return entries


# ---------- Badges ----------
@api.get("/badges/mine")
async def my_badges(user: dict = Depends(get_user_dep)):
    obtained = await db.user_badges.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    return enrich_badges(obtained)


@api.get("/badges/user/{username}")
async def user_badges(username: str):
    u = await db.users.find_one({"username": username}, {"user_id": 1})
    if not u:
        raise HTTPException(404, "Héros introuvable")
    rows = await db.user_badges.find({"user_id": u["user_id"]}, {"_id": 0}).to_list(500)
    return enrich_badges(rows)


# ---------- Leaderboards ----------
@api.get("/leaderboard/{category}")
async def leaderboard(category: str):
    sort_field = {"xp": "xp", "reputation": "reputation", "level": "level", "aether": "aether"}.get(category, "xp")
    users = await db.users.find(
        {},
        {"_id": 0, "password_hash": 0, "email": 0},
    ).sort(sort_field, -1).limit(50).to_list(50)
    return users


@api.get("/hall-of-legends")
async def hall_of_legends():
    users = await db.users.find({}, {"_id": 0, "password_hash": 0, "email": 0}).sort("level", -1).limit(10).to_list(10)
    return users


# ---------- Dimensional rifts (random events) ----------
@api.get("/rifts/check")
async def check_rift(user: dict = Depends(get_user_dep)):
    """Random chance of a dimensional rift event each call."""
    last = await db.rifts.find_one({"user_id": user["user_id"]}, sort=[("created_at", -1)])
    if last:
        last_time = datetime.fromisoformat(last["created_at"]) if isinstance(last["created_at"], str) else last["created_at"]
        if last_time.tzinfo is None:
            last_time = last_time.replace(tzinfo=timezone.utc)
        if now_utc() - last_time < timedelta(hours=4):
            return {"rift": None}

    if _secrets.randbelow(100) >= 35:
        return {"rift": None}

    rift_types = [
        {"type": "double_xp", "name": "Faille de Puissance", "description": "Double XP pendant cette session", "reward": "+200 XP"},
        {"type": "chest", "name": "Faille de Trésor", "description": "Un coffre cosmique apparaît", "reward": "Coffre offert"},
        {"type": "aether", "name": "Faille Dorée", "description": "Une pluie d'Aether vous bénit", "reward": "+150 Aether"},
        {"type": "badge", "name": "Faille Mystique", "description": "Vous traversez la dimension", "reward": "Badge Marcheur des Failles"},
    ]
    rift = _secure_choice(rift_types)
    rift_doc = {
        "rift_id": f"rift_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        **rift,
        "claimed": False,
        "created_at": now_utc().isoformat(),
    }
    await db.rifts.insert_one(rift_doc)
    rift_doc.pop("_id", None)
    return {"rift": rift_doc}


@api.post("/rifts/{rift_id}/claim")
async def claim_rift(rift_id: str, user: dict = Depends(get_user_dep)):
    rift = await db.rifts.find_one({"rift_id": rift_id, "user_id": user["user_id"]})
    if not rift or rift.get("claimed"):
        raise HTTPException(400, "Faille déjà réclamée")
    rewards = []
    if rift["type"] == "double_xp":
        await grant_xp(user["user_id"], 200, "rift")
        rewards.append("200 XP")
    elif rift["type"] == "chest":
        items = await open_chest(user["user_id"])
        rewards.extend([f"{i['name']}" for i in items])
    elif rift["type"] == "aether":
        await grant_aether(user["user_id"], 150)
        rewards.append("150 Aether")
    elif rift["type"] == "badge":
        await grant_badge(user["user_id"], "rift_walker")
        rewards.append("Badge Marcheur des Failles")
    await db.rifts.update_one({"rift_id": rift_id}, {"$set": {"claimed": True}})
    await add_chronicle(user["user_id"], f"A traversé une {rift['name']}", "rift")
    return {"rewards": rewards}


# ---------- World Boss ----------
@api.get("/boss")
async def get_world_boss():
    boss = await db.world_boss.find_one({"active": True}, {"_id": 0})
    if not boss:
        boss = {
            "boss_id": f"boss_{uuid.uuid4().hex[:8]}",
            "name": "Archonte du Néant",
            "description": "Une entité cosmique menace NEXORIA. Toute la communauté doit accumuler 10 000 commentaires pour le vaincre.",
            "target": 10000,
            "progress": 0,
            "action": "comment",
            "active": True,
            "created_at": now_utc().isoformat(),
        }
        await db.world_boss.insert_one(boss)
        boss.pop("_id", None)
    # compute current progress
    if boss["action"] == "comment":
        progress = await db.comments.count_documents({})
    else:
        progress = 0
    boss["progress"] = progress
    return boss


# ---------- Admin ----------
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(get_staff_dep)):
    return {
        "users": await db.users.count_documents({}),
        "posts": await db.posts.count_documents({}),
        "comments": await db.comments.count_documents({}),
        "badges_granted": await db.user_badges.count_documents({}),
        "items": await db.inventory.count_documents({}),
        "quests_completed": await db.user_quests.count_documents({"completed": True}),
        "oracle_consultations": await db.oracle_logs.count_documents({}),
        "sessions": await db.user_sessions.count_documents({}),
    }


@api.get("/admin/users")
async def admin_users(user: dict = Depends(get_staff_dep)):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(200).to_list(200)


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user: dict = Depends(get_admin_dep)):
    if user_id == user["user_id"]:
        raise HTTPException(400, "Impossible de se supprimer")
    await db.users.delete_one({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    return {"ok": True}


@api.get("/admin/logs")
async def admin_logs(user: dict = Depends(get_staff_dep)):
    chronicles = await db.chronicles.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return chronicles


# ---------- Maintenance Mode (admin toggle) ----------
async def get_maintenance() -> dict:
    doc = await db.system_settings.find_one({"key": "maintenance"}, {"_id": 0})
    return doc or {"enabled": False, "message": "", "updated_at": None}


@api.get("/system/maintenance")
async def maintenance_status():
    """Public endpoint — frontend polls this to render the maintenance overlay."""
    return await get_maintenance()


@api.post("/admin/maintenance")
async def set_maintenance(payload: dict, user: dict = Depends(get_admin_dep)):
    enabled = bool(payload.get("enabled", False))
    message = str(payload.get("message", "Royaume en maintenance — revenez bientôt."))[:300]
    await db.system_settings.update_one(
        {"key": "maintenance"},
        {"$set": {"enabled": enabled, "message": message, "updated_at": now_utc().isoformat(), "updated_by": user["username"]}},
        upsert=True,
    )
    return {"enabled": enabled, "message": message}


# ---------- Profile self-management (ultra-complete) ----------
class PasswordChangeReq(BaseModel):
    current_password: str
    new_password: str


class EmailChangeReq(BaseModel):
    current_password: str
    new_email: EmailStr


class UsernameChangeReq(BaseModel):
    new_username: str


@api.post("/profile/change-password")
async def change_password(req: PasswordChangeReq, user: dict = Depends(get_user_dep)):
    full = await db.users.find_one({"user_id": user["user_id"]})
    if not full.get("password_hash") or not verify_password(req.current_password, full["password_hash"]):
        raise HTTPException(400, "Mot de passe actuel incorrect")
    if len(req.new_password) < 6:
        raise HTTPException(400, "Nouveau mot de passe trop court (6 caractères min)")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"password_hash": hash_password(req.new_password)}})
    # invalidate all other sessions
    await db.user_sessions.delete_many({"user_id": user["user_id"]})
    return {"ok": True, "note": "Toutes les sessions ont été révoquées — reconnectez-vous."}


@api.post("/profile/change-email")
async def change_email(req: EmailChangeReq, user: dict = Depends(get_user_dep)):
    full = await db.users.find_one({"user_id": user["user_id"]})
    if full.get("password_hash") and not verify_password(req.current_password, full["password_hash"]):
        raise HTTPException(400, "Mot de passe incorrect")
    if await db.users.find_one({"email": req.new_email.lower(), "user_id": {"$ne": user["user_id"]}}):
        raise HTTPException(400, "Email déjà utilisé")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"email": req.new_email.lower()}})
    return {"ok": True, "email": req.new_email.lower()}


@api.post("/profile/change-username")
async def change_username(req: UsernameChangeReq, user: dict = Depends(get_user_dep)):
    new_name = req.new_username.strip().replace(" ", "")
    if len(new_name) < 3 or len(new_name) > 20:
        raise HTTPException(400, "Pseudo doit faire entre 3 et 20 caractères")
    if await db.users.find_one({"username": new_name, "user_id": {"$ne": user["user_id"]}}):
        raise HTTPException(400, "Pseudo déjà pris")
    # Consume a rename scroll if present
    scroll = await db.user_consumables.find_one({"user_id": user["user_id"], "sku": "scroll_rename", "used": False})
    if not scroll:
        raise HTTPException(400, "Un « Parchemin de Renommée » est nécessaire (achetez-en un à la Boutique)")
    await db.user_consumables.update_one({"_id": scroll["_id"]}, {"$set": {"used": True, "used_at": now_utc().isoformat()}})
    old = user["username"]
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"username": new_name}})
    await add_chronicle(user["user_id"], f"A changé de nom : {old} → {new_name}", "rename")
    await grant_badge(user["user_id"], "renamed")
    await grant_xp(user["user_id"], 100, "renamed")
    return {"ok": True, "username": new_name}


@api.delete("/profile")
async def delete_account(user: dict = Depends(get_user_dep)):
    """Hard delete the user's account and all related data."""
    uid = user["user_id"]
    if user.get("role") == "admin":
        raise HTTPException(400, "Un admin ne peut pas auto-supprimer son compte")
    for col in ("users", "user_sessions", "posts", "comments", "reactions", "follows",
                "user_badges", "inventory", "user_quests", "chronicles", "rifts",
                "oracle_logs", "notifications", "user_boosts", "user_consumables", "shop_purchases"):
        await db[col].delete_many({"user_id": uid})
    return {"ok": True}


# ---------- Shop ----------
@api.get("/shop/items")
async def list_shop_items():
    """Static catalog + admin-created items."""
    custom = await db.shop_items.find({}, {"_id": 0}).to_list(500)
    return SHOP_ITEMS + custom


@api.post("/shop/purchase/{sku}")
async def purchase_item(sku: str, user: dict = Depends(get_user_dep)):
    item = get_shop_item(sku)
    if not item:
        # Try DB items
        custom = await db.shop_items.find_one({"sku": sku}, {"_id": 0})
        if custom:
            item = custom
    if not item:
        raise HTTPException(404, "Article introuvable")
    full = await db.users.find_one({"user_id": user["user_id"]})
    # Level gate
    required_level = item.get("unlock_level", 1)
    if full.get("level", 1) < required_level:
        raise HTTPException(403, f"Niveau {required_level} requis pour acquérir cet article")
    if full["aether"] < item["price"]:
        raise HTTPException(400, f"Aether insuffisant ({item['price']} requis)")

    # Prevent duplicate purchase for non-stackable categories
    if item["category"] in ("cosmetic", "kingdom"):
        already_owned = await db.user_cosmetics.find_one({"user_id": user["user_id"], "sku": sku}) \
            or await db.user_perks.find_one({"user_id": user["user_id"], "sku": sku})
        if already_owned:
            raise HTTPException(400, "Vous possédez déjà cet item")

    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"aether": -item["price"]}})

    purchase_doc = {
        "purchase_id": f"buy_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "sku": sku,
        "name": item["name"],
        "category": item["category"],
        "price": item["price"],
        "created_at": now_utc().isoformat(),
    }
    await db.shop_purchases.insert_one(purchase_doc)
    purchase_doc.pop("_id", None)

    # Badges for shop activity
    total_purchases = await db.shop_purchases.count_documents({"user_id": user["user_id"]})
    if total_purchases == 1:
        await grant_badge(user["user_id"], "merchant")
    total_spent = await db.shop_purchases.aggregate([
        {"$match": {"user_id": user["user_id"]}},
        {"$group": {"_id": None, "sum": {"$sum": "$price"}}},
    ]).to_list(1)
    if total_spent and total_spent[0]["sum"] >= 5000:
        await grant_badge(user["user_id"], "big_spender")

    # Apply effect based on category
    applied = {}
    if item["category"] == "cosmetic":
        await db.user_cosmetics.insert_one({"user_id": user["user_id"], "sku": sku, "obtained_at": now_utc().isoformat()})
        applied["unlocked"] = sku
    elif item["category"] == "boost":
        # One active boost per (user, boost_type) at a time — refuse re-buy if still active
        now_iso = now_utc().isoformat()
        active = await db.user_boosts.find_one({
            "user_id": user["user_id"],
            "boost_type": item["boost_type"],
            "expires_at": {"$gt": now_iso},
        })
        if active:
            # Refund the just-debited Aether and abort
            await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"aether": item["price"]}})
            await db.shop_purchases.delete_one({"purchase_id": purchase_doc["purchase_id"]})
            raise HTTPException(400, f"Un effet « {item['boost_type']} » est déjà actif jusqu'à {active['expires_at'][:16]}")
        expires = (now_utc() + timedelta(minutes=item["duration_minutes"])).isoformat()
        await db.user_boosts.insert_one({
            "user_id": user["user_id"], "sku": sku,
            "boost_type": item["boost_type"], "boost_value": item["boost_value"],
            "expires_at": expires, "created_at": now_utc().isoformat(),
        })
        applied["expires_at"] = expires
    elif item["category"] == "consumable":
        if sku == "summon_rift":
            # Force a rift to appear next time the user checks
            rift_types = [
                {"type": "double_xp", "name": "Faille Invoquée", "description": "Catalysée par votre volonté", "reward": "+200 XP"},
                {"type": "chest", "name": "Faille de Trésor", "description": "Un coffre apparaît", "reward": "Coffre offert"},
            ]
            r = _secure_choice(rift_types)
            await db.rifts.insert_one({
                "rift_id": f"rift_{uuid.uuid4().hex[:12]}",
                "user_id": user["user_id"],
                **r, "claimed": False,
                "created_at": now_utc().isoformat(),
            })
            applied["rift_summoned"] = True
        else:
            # Stack consumables into a single row with quantity++
            await db.user_consumables.update_one(
                {"user_id": user["user_id"], "sku": sku, "used": False},
                {"$inc": {"quantity": 1},
                 "$setOnInsert": {
                     "user_id": user["user_id"], "sku": sku, "name": item["name"],
                     "used": False, "obtained_at": now_utc().isoformat(),
                 }},
                upsert=True,
            )
            applied["consumable_added"] = sku
    elif item["category"] == "kingdom":
        await db.user_perks.insert_one({"user_id": user["user_id"], "sku": sku, "obtained_at": now_utc().isoformat()})
        applied["perk_unlocked"] = sku

    await add_chronicle(user["user_id"], f"A acquis « {item['name']} » à la Boutique d'Aether", "shop")
    await push_notification(db, user["user_id"], "shop", "Achat confirmé", f"« {item['name']} » est à vous", "ding", "ShoppingBag")

    # WebSocket sync: push inventory refresh event so the Shop UI updates instantly
    # without polling. Listened by NexusSocketContext + Shop page.
    try:
        await nexus_world.push_to_user(user["user_id"], "shop:purchased", {
            "sku": sku,
            "name": item["name"],
            "category": item["category"],
            "applied": applied,
            "ts": now_utc().isoformat(),
        })
    except Exception:
        pass

    return {"purchase": purchase_doc, "applied": applied}


@api.get("/shop/inventory")
async def my_shop_inventory(user: dict = Depends(get_user_dep)):
    """Items the user has bought from the shop (cosmetics, active boosts, consumables, perks)."""
    cosmetics = await db.user_cosmetics.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(200)
    consumables = await db.user_consumables.find({"user_id": user["user_id"], "used": False}, {"_id": 0}).to_list(200)
    perks = await db.user_perks.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    now = now_utc()
    boosts_raw = await db.user_boosts.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    active_boosts = []
    for b in boosts_raw:
        exp = b.get("expires_at")
        if isinstance(exp, str):
            exp_dt = datetime.fromisoformat(exp)
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            if exp_dt > now:
                active_boosts.append(b)
    return {"cosmetics": cosmetics, "consumables": consumables, "perks": perks, "boosts": active_boosts}


# ---------- Notifications ----------
@api.get("/notifications")
async def my_notifications(user: dict = Depends(get_user_dep)):
    items = await db.notifications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    unread = await db.notifications.count_documents({"user_id": user["user_id"], "read": False})
    return {"items": items, "unread": unread}


@api.post("/notifications/{notif_id}/read")
async def mark_notif_read(notif_id: str, user: dict = Depends(get_user_dep)):
    await db.notifications.update_one({"notif_id": notif_id, "user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_user_dep)):
    await db.notifications.update_many({"user_id": user["user_id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}


@api.delete("/notifications/clear")
async def clear_all_notifications(user: dict = Depends(get_user_dep)):
    """Permanently delete every notification for the current user."""
    result = await db.notifications.delete_many({"user_id": user["user_id"]})
    return {"removed": result.deleted_count}


# ---------- Widgets (live community stats) ----------
@api.get("/widgets/kingdom-weather")
async def kingdom_weather():
    """Live stats of the realm."""
    now = now_utc()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    # active users = sessions from last 15 min
    cutoff = (now - timedelta(minutes=15)).isoformat()
    active_session_count = await db.user_sessions.count_documents({"created_at": {"$gte": cutoff}})
    posts_today = await db.posts.count_documents({"created_at": {"$gte": today_start.isoformat()}})
    new_heroes = await db.users.count_documents({"created_at": {"$gte": today_start.isoformat()}})
    top = await db.users.find({}, {"_id": 0, "username": 1, "level": 1, "class_name": 1, "avatar_url": 1}).sort("xp", -1).limit(1).to_list(1)
    return {
        "active_now": active_session_count,
        "posts_today": posts_today,
        "new_heroes_today": new_heroes,
        "top_hero": top[0] if top else None,
        "weather": _secure_choice(["clear", "mystical", "stormy", "aurora", "eclipse"]),
        "as_of": now.isoformat(),
    }


@api.get("/widgets/events")
async def upcoming_events():
    """Scheduled events visible to all."""
    events = await db.scheduled_events.find({}, {"_id": 0}).sort("starts_at", 1).limit(20).to_list(20)
    return events


@api.get("/widgets/rifts-map")
async def rifts_map():
    """Last 20 dimensional rifts globally with type/timestamp (no user_id leaked)."""
    rifts = await db.rifts.find({}, {"_id": 0, "user_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    return rifts


# ---------- Admin: edit / ban / unban users ----------
class UserEditReq(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    level: Optional[int] = None
    xp: Optional[int] = None
    aether: Optional[int] = None
    reputation: Optional[int] = None
    active_title: Optional[str] = None


class BanReq(BaseModel):
    duration_hours: int  # 0 = permanent (use large number)
    reason: str


@api.put("/admin/users/{user_id}")
async def admin_edit_user(user_id: str, req: UserEditReq, user: dict = Depends(get_admin_dep)):
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if "role" in update and update["role"] not in ("user", "admin", "moderator"):
        raise HTTPException(400, "Rôle invalide")
    if "level" in update:
        update["rank"] = rank_from_level(update["level"])
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(404, "Utilisateur introuvable")
    await db.users.update_one({"user_id": user_id}, {"$set": update})
    await add_chronicle(user_id, f"Le Conseil a modifié son profil ({', '.join(update.keys())})", "admin")
    return {"ok": True, "updated_fields": list(update.keys())}


@api.post("/admin/users/{user_id}/ban")
async def admin_ban_user(user_id: str, req: BanReq, user: dict = Depends(get_staff_dep)):
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(404, "Utilisateur introuvable")
    if target.get("role") == "admin":
        raise HTTPException(400, "Impossible de bannir un admin")
    # Moderators can only ban regular users (not other mods)
    if user.get("role") == "moderator" and target.get("role") in ("admin", "moderator"):
        raise HTTPException(403, "Un modérateur ne peut bannir qu'un héros standard")
    if user_id == user["user_id"]:
        raise HTTPException(400, "Impossible de s'auto-bannir")
    if req.duration_hours <= 0 or req.duration_hours > 24 * 365 * 10:
        raise HTTPException(400, "Durée invalide")

    banned_until = (now_utc() + timedelta(hours=req.duration_hours)).isoformat()
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"banned_until": banned_until, "ban_reason": req.reason[:300]}},
    )
    # immediately invalidate all sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    # log
    await db.ban_history.insert_one({
        "ban_id": f"ban_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "username": target["username"],
        "banned_by": user["username"],
        "duration_hours": req.duration_hours,
        "banned_until": banned_until,
        "reason": req.reason[:300],
        "created_at": now_utc().isoformat(),
        "lifted": False,
    })
    await add_chronicle(user_id, f"Banni par le Conseil pour {req.duration_hours}h — raison : {req.reason}", "ban")
    return {"ok": True, "banned_until": banned_until}


@api.post("/admin/users/{user_id}/unban")
async def admin_unban_user(user_id: str, user: dict = Depends(get_staff_dep)):
    await db.users.update_one(
        {"user_id": user_id},
        {"$unset": {"banned_until": "", "ban_reason": ""}},
    )
    await db.ban_history.update_many({"user_id": user_id, "lifted": False}, {"$set": {"lifted": True, "lifted_at": now_utc().isoformat()}})
    await add_chronicle(user_id, "Banni levé par le Conseil", "unban")
    return {"ok": True}


@api.get("/admin/ban-history")
async def admin_ban_history(user: dict = Depends(get_staff_dep)):
    return await db.ban_history.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)


# ---------- Discord OAuth ----------
@api.get("/auth/discord/url")
async def discord_url():
    if not discord_auth.is_configured():
        raise HTTPException(503, "Discord OAuth non configuré côté serveur")
    return {"url": discord_auth.build_authorize_url()}


@api.post("/auth/discord/exchange")
async def discord_exchange(payload: dict, response: Response):
    code = payload.get("code")
    if not code:
        raise HTTPException(400, "Code manquant")
    try:
        profile = await discord_auth.exchange_code(code)
    except Exception as e:
        raise HTTPException(401, f"Échec Discord OAuth: {str(e)[:120]}")

    email = profile["email"].lower()
    existing = await db.users.find_one({"$or": [{"email": email}, {"discord_id": profile["discord_id"]}]})
    if existing:
        # Reject banned user before creating session
        enforce_ban_or_raise(existing)
        user = existing
        if not existing.get("discord_id"):
            await db.users.update_one({"user_id": existing["user_id"]}, {"$set": {"discord_id": profile["discord_id"]}})
    else:
        user_id = generate_user_id()
        username = profile["username"].replace(" ", "") or f"Heros{uuid.uuid4().hex[:6]}"
        base = username
        i = 0
        while await db.users.find_one({"username": username}):
            i += 1
            username = f"{base}{i}"
        cls = CLASSES["explorer"]
        user = {
            "user_id": user_id, "email": email, "username": username,
            "password_hash": None,
            "discord_id": profile["discord_id"],
            "class_id": "explorer", "class_name": cls["name"],
            "secondary_class_id": None,
            "avatar_url": profile.get("avatar_url"), "banner_url": None,
            "bio": "", "story": "", "quote": "",
            "level": 1, "xp": 0, "rank": "Novice",
            "reputation": 0, "aether": 100, "skill_points": 1,
            "active_title": "novice",
            "role": "admin" if email == os.environ.get("ADMIN_EMAIL", "").lower() else "user",
            "auth_provider": "discord",
            "created_at": now_utc().isoformat(),
            "dna": {"creativity": 15, "ambition": 10, "sociability": 10, "curiosity": 13, "persistence": 10, "influence": 10},
            "kingdom": {b["id"]: {"level": 1 if b["id"] == "castle" else 0} for b in KINGDOM_BUILDINGS},
            "skills_allocated": {}, "followers": 0, "following": 0,
            "needs_class_selection": True,
        }
        await db.users.insert_one(user)
        await add_chronicle(user_id, f"Le héros {username} a rejoint NEXORIA via Discord", "creation")

    token = create_session_token()
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user["user_id"],
        "expires_at": session_expiry().isoformat(),
        "created_at": now_utc().isoformat(),
        "provider": "discord",
    })
    set_session_cookie(response, token)
    # Fire-and-forget Discord role sync after successful Discord login.
    discord_sync.schedule_sync(db, user["user_id"])
    asyncio.create_task(discord_sync.post_notification(
        f"🪄 **{user['username']}** vient de lier son Discord à NEXORIA"
    ))
    result = public_user(user)
    result["session_token"] = token
    return result


# ---------- Staff Chat & Broadcasts ----------
class StaffMsgReq(BaseModel):
    content: str


class BroadcastReq(BaseModel):
    title: str
    message: str
    sound: str = "fanfare"  # fanfare | horn | bell


@api.get("/staff/chat")
async def staff_chat_list(user: dict = Depends(get_staff_dep)):
    msgs = await db.staff_chat.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    msgs.reverse()
    return msgs


@api.post("/staff/chat")
async def staff_chat_post(req: StaffMsgReq, user: dict = Depends(get_staff_dep)):
    if not req.content.strip():
        raise HTTPException(400, "Message vide")
    doc = {
        "msg_id": f"smsg_{uuid.uuid4().hex[:12]}",
        "author_id": user["user_id"],
        "author_username": user["username"],
        "author_role": user["role"],
        "author_avatar": user.get("avatar_url"),
        "content": req.content.strip()[:1000],
        "created_at": now_utc().isoformat(),
    }
    await db.staff_chat.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/admin/broadcast")
async def broadcast_alert(req: BroadcastReq, user: dict = Depends(get_admin_dep)):
    """Push an alert visible to ALL connected users with sound."""
    doc = {
        "alert_id": f"alert_{uuid.uuid4().hex[:12]}",
        "title": req.title[:120],
        "message": req.message[:500],
        "sound": req.sound,
        "issued_by": user["username"],
        "created_at": now_utc().isoformat(),
        "expires_at": (now_utc() + timedelta(minutes=10)).isoformat(),
    }
    await db.broadcasts.insert_one(doc)
    doc.pop("_id", None)
    # Also push to each user's notification feed
    cursor = db.users.find({}, {"user_id": 1, "_id": 0})
    async for u in cursor:
        await push_notification(db, u["user_id"], "broadcast", req.title, req.message, req.sound, "Megaphone")
    return doc


@api.get("/broadcasts/active")
async def active_broadcasts():
    """Return broadcasts issued in the last 10 minutes (for the live alert overlay)."""
    cutoff = (now_utc() - timedelta(minutes=10)).isoformat()
    items = await db.broadcasts.find({"created_at": {"$gte": cutoff}}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    return items


# ---------- Shop admin CRUD ----------
class ShopItemReq(BaseModel):
    sku: str
    name: str
    category: str
    price: int
    icon: str = "Sparkles"
    rarity: str = "common"
    description: str = ""
    boost_type: Optional[str] = None
    boost_value: Optional[float] = None
    duration_minutes: Optional[int] = None
    unlock_level: int = 1


@api.get("/admin/shop")
async def admin_list_shop(user: dict = Depends(get_admin_dep)):
    """Return STATIC items + DB-stored items, merged."""
    db_items = await db.shop_items.find({}, {"_id": 0}).to_list(500)
    static = [{**i, "source": "static"} for i in SHOP_ITEMS]
    custom = [{**i, "source": "custom"} for i in db_items]
    return static + custom


@api.post("/admin/shop")
async def admin_create_shop_item(req: ShopItemReq, user: dict = Depends(get_admin_dep)):
    existing = await db.shop_items.find_one({"sku": req.sku})
    if existing or any(s["sku"] == req.sku for s in SHOP_ITEMS):
        raise HTTPException(400, "SKU déjà utilisé")
    if req.category not in ("cosmetic", "boost", "consumable", "kingdom"):
        raise HTTPException(400, "Catégorie invalide")
    doc = req.model_dump()
    doc["created_at"] = now_utc().isoformat()
    doc["created_by"] = user["username"]
    await db.shop_items.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/admin/shop/{sku}")
async def admin_update_shop_item(sku: str, req: ShopItemReq, user: dict = Depends(get_admin_dep)):
    if any(s["sku"] == sku for s in SHOP_ITEMS):
        raise HTTPException(400, "Item statique non éditable (seulement les custom)")
    update = req.model_dump()
    update.pop("sku", None)
    result = await db.shop_items.update_one({"sku": sku}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Item introuvable")
    return {"ok": True}


@api.delete("/admin/shop/{sku}")
async def admin_delete_shop_item(sku: str, user: dict = Depends(get_admin_dep)):
    if any(s["sku"] == sku for s in SHOP_ITEMS):
        raise HTTPException(400, "Item statique non supprimable")
    await db.shop_items.delete_one({"sku": sku})
    return {"ok": True}


# ---------- World Map (live heroes) ----------
@api.get("/world/heroes")
async def world_heroes():
    """All heroes for live map — deterministic position from user_id."""
    users = await db.users.find({}, {
        "_id": 0, "user_id": 1, "username": 1, "class_id": 1, "class_name": 1,
        "level": 1, "rank": 1, "avatar_url": 1, "active_title": 1, "role": 1,
    }).to_list(500)
    # active = had a session in last 15 minutes
    cutoff = (now_utc() - timedelta(minutes=15)).isoformat()
    active_sessions = await db.user_sessions.distinct("user_id", {"created_at": {"$gte": cutoff}})
    active_set = set(active_sessions)
    for u in users:
        u["online"] = u["user_id"] in active_set
        # Deterministic pseudo-coordinates from hash of user_id
        h = sum(ord(c) for c in u["user_id"])
        u["x"] = (h * 17) % 100  # 0-100 (percentage)
        u["y"] = (h * 31 + 13) % 100
    return users



# ============================================================================
# GUILDS — Ordres mystiques
# ============================================================================
GUILD_MAX_MEMBERS = 50
GUILD_CREATE_LEVEL = 10
GUILD_CREATE_COST = 1000  # Aether

class GuildCreateReq(BaseModel):
    name: str
    tag: str  # 2-5 chars
    description: str = ""
    banner_color: str = "#7C3AED"


@api.post("/guilds")
async def create_guild(req: GuildCreateReq, user: dict = Depends(get_user_dep)):
    full = await db.users.find_one({"user_id": user["user_id"]})
    if full.get("level", 1) < GUILD_CREATE_LEVEL:
        raise HTTPException(403, f"Niveau {GUILD_CREATE_LEVEL} requis pour fonder un ordre")
    if full.get("aether", 0) < GUILD_CREATE_COST:
        raise HTTPException(400, f"{GUILD_CREATE_COST} Aether requis pour fonder un ordre")
    if await db.guild_members.find_one({"user_id": user["user_id"]}):
        raise HTTPException(400, "Vous appartenez déjà à un ordre")
    name = req.name.strip()
    tag = req.tag.strip().upper()
    if len(name) < 3 or len(name) > 30:
        raise HTTPException(400, "Nom : 3 à 30 caractères")
    if len(tag) < 2 or len(tag) > 5:
        raise HTTPException(400, "Tag : 2 à 5 caractères")
    if await db.guilds.find_one({"$or": [{"name": name}, {"tag": tag}]}):
        raise HTTPException(400, "Ce nom ou ce tag est déjà pris")
    guild_id = f"guild_{uuid.uuid4().hex[:12]}"
    guild = {
        "guild_id": guild_id,
        "name": name, "tag": tag,
        "description": req.description[:500],
        "banner_color": req.banner_color,
        "founder_id": user["user_id"],
        "level": 1, "xp": 0,
        "vault_aether": 0,
        "member_count": 1,
        "max_members": GUILD_MAX_MEMBERS,
        "created_at": now_utc().isoformat(),
    }
    await db.guilds.insert_one(guild)
    await db.guild_members.insert_one({
        "guild_id": guild_id, "user_id": user["user_id"],
        "role": "chef",
        "joined_at": now_utc().isoformat(),
        "contribution_xp": 0,
    })
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"aether": -GUILD_CREATE_COST}})
    await add_chronicle(user["user_id"], f"A fondé l'ordre « {name} » [{tag}]", "guild")
    await grant_badge(user["user_id"], "founder_guild")
    guild.pop("_id", None)
    return guild


@api.get("/guilds")
async def list_guilds(user: dict = Depends(get_user_dep)):
    return await db.guilds.find({}, {"_id": 0}).sort("level", -1).limit(100).to_list(100)


@api.get("/guilds/mine")
async def get_my_guild(user: dict = Depends(get_user_dep)):
    membership = await db.guild_members.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not membership:
        return {"guild": None, "membership": None}
    guild = await db.guilds.find_one({"guild_id": membership["guild_id"]}, {"_id": 0})
    return {"guild": guild, "membership": membership}


@api.get("/guilds/{guild_id}")
async def get_guild_detail(guild_id: str, user: dict = Depends(get_user_dep)):
    guild = await db.guilds.find_one({"guild_id": guild_id}, {"_id": 0})
    if not guild:
        raise HTTPException(404, "Ordre introuvable")
    members = await db.guild_members.find({"guild_id": guild_id}, {"_id": 0}).to_list(100)
    user_ids = [m["user_id"] for m in members]
    udocs = await db.users.find({"user_id": {"$in": user_ids}},
        {"_id": 0, "user_id": 1, "username": 1, "level": 1, "class_name": 1, "avatar_url": 1, "role": 1}).to_list(100)
    umap = {u["user_id"]: u for u in udocs}
    for m in members:
        m["user"] = umap.get(m["user_id"], {})
    return {"guild": guild, "members": members}


class GuildInviteReq(BaseModel):
    target_username: str


def _guild_role_required(membership: dict, allowed: tuple):
    if not membership or membership["role"] not in allowed:
        raise HTTPException(403, "Action réservée aux officiers/chef")


@api.post("/guilds/{guild_id}/invite")
async def invite_to_guild(guild_id: str, req: GuildInviteReq, user: dict = Depends(get_user_dep)):
    membership = await db.guild_members.find_one({"user_id": user["user_id"], "guild_id": guild_id})
    _guild_role_required(membership, ("chef", "officier"))
    target = await db.users.find_one({"username": req.target_username}, {"_id": 0, "user_id": 1, "username": 1})
    if not target:
        raise HTTPException(404, "Héros introuvable")
    if await db.guild_members.find_one({"user_id": target["user_id"]}):
        raise HTTPException(400, "Ce héros appartient déjà à un ordre")
    guild = await db.guilds.find_one({"guild_id": guild_id})
    if guild["member_count"] >= guild["max_members"]:
        raise HTTPException(400, "Ordre plein")
    if await db.guild_invites.find_one({"guild_id": guild_id, "user_id": target["user_id"], "status": "pending"}):
        raise HTTPException(400, "Invitation déjà envoyée")
    invite_id = f"ginv_{uuid.uuid4().hex[:10]}"
    await db.guild_invites.insert_one({
        "invite_id": invite_id, "guild_id": guild_id,
        "user_id": target["user_id"], "invited_by": user["user_id"],
        "status": "pending", "created_at": now_utc().isoformat(),
    })
    await push_notification(db, target["user_id"], "guild_invite",
        f"L'ordre « {guild['name']} » vous invite", f"Tag [{guild['tag']}]", "ding", "Castle")
    return {"ok": True, "invite_id": invite_id}


@api.get("/guilds/invites/mine")
async def my_guild_invites(user: dict = Depends(get_user_dep)):
    invites = await db.guild_invites.find({"user_id": user["user_id"], "status": "pending"}, {"_id": 0}).to_list(20)
    gids = [i["guild_id"] for i in invites]
    guilds = await db.guilds.find({"guild_id": {"$in": gids}}, {"_id": 0}).to_list(20)
    gmap = {g["guild_id"]: g for g in guilds}
    for inv in invites:
        inv["guild"] = gmap.get(inv["guild_id"], {})
    return invites


@api.post("/guilds/invites/{invite_id}/accept")
async def accept_guild_invite(invite_id: str, user: dict = Depends(get_user_dep)):
    inv = await db.guild_invites.find_one({"invite_id": invite_id, "user_id": user["user_id"]})
    if not inv or inv["status"] != "pending":
        raise HTTPException(404, "Invitation introuvable")
    if await db.guild_members.find_one({"user_id": user["user_id"]}):
        raise HTTPException(400, "Vous appartenez déjà à un ordre")
    guild = await db.guilds.find_one({"guild_id": inv["guild_id"]})
    if guild["member_count"] >= guild["max_members"]:
        raise HTTPException(400, "Ordre plein")
    await db.guild_members.insert_one({
        "guild_id": inv["guild_id"], "user_id": user["user_id"],
        "role": "membre", "joined_at": now_utc().isoformat(), "contribution_xp": 0,
    })
    await db.guilds.update_one({"guild_id": inv["guild_id"]}, {"$inc": {"member_count": 1}})
    await db.guild_invites.update_one({"invite_id": invite_id}, {"$set": {"status": "accepted", "responded_at": now_utc().isoformat()}})
    await add_chronicle(user["user_id"], f"A rejoint l'ordre « {guild['name']} »", "guild")
    return {"ok": True, "guild_id": inv["guild_id"]}


@api.post("/guilds/invites/{invite_id}/decline")
async def decline_guild_invite(invite_id: str, user: dict = Depends(get_user_dep)):
    inv = await db.guild_invites.find_one({"invite_id": invite_id, "user_id": user["user_id"]})
    if not inv or inv["status"] != "pending":
        raise HTTPException(404, "Invitation introuvable")
    await db.guild_invites.update_one({"invite_id": invite_id}, {"$set": {"status": "declined", "responded_at": now_utc().isoformat()}})
    return {"ok": True}


@api.post("/guilds/{guild_id}/leave")
async def leave_guild(guild_id: str, user: dict = Depends(get_user_dep)):
    membership = await db.guild_members.find_one({"user_id": user["user_id"], "guild_id": guild_id})
    if not membership:
        raise HTTPException(404, "Vous n'appartenez pas à cet ordre")
    if membership["role"] == "chef":
        candidate = await db.guild_members.find_one({"guild_id": guild_id, "user_id": {"$ne": user["user_id"]}, "role": "officier"})
        if not candidate:
            candidate = await db.guild_members.find_one({"guild_id": guild_id, "user_id": {"$ne": user["user_id"]}})
        if candidate:
            await db.guild_members.update_one({"_id": candidate["_id"]}, {"$set": {"role": "chef"}})
        else:
            await db.guilds.delete_one({"guild_id": guild_id})
            await db.guild_members.delete_many({"guild_id": guild_id})
            await db.guild_chat.delete_many({"guild_id": guild_id})
            return {"ok": True, "disbanded": True}
    await db.guild_members.delete_one({"guild_id": guild_id, "user_id": user["user_id"]})
    await db.guilds.update_one({"guild_id": guild_id}, {"$inc": {"member_count": -1}})
    return {"ok": True}


@api.post("/guilds/{guild_id}/kick/{target_user_id}")
async def kick_member(guild_id: str, target_user_id: str, user: dict = Depends(get_user_dep)):
    membership = await db.guild_members.find_one({"user_id": user["user_id"], "guild_id": guild_id})
    _guild_role_required(membership, ("chef", "officier"))
    target_m = await db.guild_members.find_one({"user_id": target_user_id, "guild_id": guild_id})
    if not target_m:
        raise HTTPException(404, "Membre introuvable")
    if target_m["role"] == "chef":
        raise HTTPException(400, "Impossible d'exclure le chef")
    if target_m["role"] == "officier" and membership["role"] != "chef":
        raise HTTPException(403, "Seul le chef peut exclure un officier")
    await db.guild_members.delete_one({"guild_id": guild_id, "user_id": target_user_id})
    await db.guilds.update_one({"guild_id": guild_id}, {"$inc": {"member_count": -1}})
    return {"ok": True}


class GuildRoleReq(BaseModel):
    role: str


@api.put("/guilds/{guild_id}/members/{target_user_id}/role")
async def set_member_role(guild_id: str, target_user_id: str, req: GuildRoleReq, user: dict = Depends(get_user_dep)):
    membership = await db.guild_members.find_one({"user_id": user["user_id"], "guild_id": guild_id})
    _guild_role_required(membership, ("chef",))
    if req.role not in ("officier", "membre"):
        raise HTTPException(400, "Rôle invalide")
    await db.guild_members.update_one({"guild_id": guild_id, "user_id": target_user_id}, {"$set": {"role": req.role}})
    return {"ok": True}


class GuildChatReq(BaseModel):
    content: str


@api.get("/guilds/{guild_id}/chat")
async def get_guild_chat(guild_id: str, user: dict = Depends(get_user_dep)):
    if not await db.guild_members.find_one({"user_id": user["user_id"], "guild_id": guild_id}):
        raise HTTPException(403, "Accès réservé aux membres")
    msgs = await db.guild_chat.find({"guild_id": guild_id}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    msgs.reverse()
    user_ids = list({m["user_id"] for m in msgs})
    udocs = await db.users.find({"user_id": {"$in": user_ids}},
        {"_id": 0, "user_id": 1, "username": 1, "role": 1, "level": 1}).to_list(100)
    umap = {u["user_id"]: u for u in udocs}
    for m in msgs:
        m["author"] = umap.get(m["user_id"], {})
    return msgs


@api.post("/guilds/{guild_id}/chat")
async def post_guild_chat(guild_id: str, req: GuildChatReq, user: dict = Depends(get_user_dep)):
    if not await db.guild_members.find_one({"user_id": user["user_id"], "guild_id": guild_id}):
        raise HTTPException(403, "Accès réservé aux membres")
    content = req.content.strip()
    if not content or len(content) > 500:
        raise HTTPException(400, "Message invalide (1-500 caractères)")
    msg = {
        "message_id": f"gmsg_{uuid.uuid4().hex[:10]}",
        "guild_id": guild_id, "user_id": user["user_id"],
        "content": content, "created_at": now_utc().isoformat(),
    }
    await db.guild_chat.insert_one(msg)
    msg.pop("_id", None)
    return msg


class GuildVaultReq(BaseModel):
    amount: int


@api.post("/guilds/{guild_id}/deposit")
async def deposit_vault(guild_id: str, req: GuildVaultReq, user: dict = Depends(get_user_dep)):
    if not await db.guild_members.find_one({"user_id": user["user_id"], "guild_id": guild_id}):
        raise HTTPException(403, "Accès réservé aux membres")
    if req.amount < 1:
        raise HTTPException(400, "Montant invalide")
    fresh = await db.users.find_one({"user_id": user["user_id"]})
    if fresh.get("aether", 0) < req.amount:
        raise HTTPException(400, "Aether insuffisant")
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"aether": -req.amount}})
    await db.guilds.update_one({"guild_id": guild_id}, {"$inc": {"vault_aether": req.amount, "xp": req.amount // 10}})
    await db.guild_members.update_one({"guild_id": guild_id, "user_id": user["user_id"]}, {"$inc": {"contribution_xp": req.amount}})
    g = await db.guilds.find_one({"guild_id": guild_id})
    new_level = 1 + (g.get("xp", 0) // 1000)
    if new_level != g.get("level", 1):
        await db.guilds.update_one({"guild_id": guild_id}, {"$set": {"level": new_level}})
    return {"ok": True, "vault_aether": g["vault_aether"]}


@api.post("/guilds/{guild_id}/withdraw/{target_user_id}")
async def withdraw_vault(guild_id: str, target_user_id: str, req: GuildVaultReq, user: dict = Depends(get_user_dep)):
    membership = await db.guild_members.find_one({"user_id": user["user_id"], "guild_id": guild_id})
    _guild_role_required(membership, ("chef", "officier"))
    if not await db.guild_members.find_one({"user_id": target_user_id, "guild_id": guild_id}):
        raise HTTPException(404, "Membre introuvable")
    g = await db.guilds.find_one({"guild_id": guild_id})
    if g.get("vault_aether", 0) < req.amount or req.amount < 1:
        raise HTTPException(400, "Coffre insuffisant")
    await db.guilds.update_one({"guild_id": guild_id}, {"$inc": {"vault_aether": -req.amount}})
    await db.users.update_one({"user_id": target_user_id}, {"$inc": {"aether": req.amount}})
    await push_notification(db, target_user_id, "guild_reward",
        f"Récompense de l'ordre « {g['name']} »", f"+{req.amount} Aether", "coin", "Coins")
    return {"ok": True}


# ============================================================================
# FORUM — Tribune des Héros
# ============================================================================
FORUM_CATEGORIES = [
    {"id": "general", "name": "Salle Commune", "icon": "Users", "description": "Discussions générales du royaume"},
    {"id": "strategy", "name": "Stratégies de Combat", "icon": "Sword", "description": "Tactiques, builds, conseils"},
    {"id": "lore", "name": "Mythes & Légendes", "icon": "BookOpen", "description": "Lore, histoires, théories"},
    {"id": "trade", "name": "Comptoir d'Échanges", "icon": "Coins", "description": "Discussions sur les reliques"},
    {"id": "guilds", "name": "Recrutement d'Ordres", "icon": "Castle", "description": "Recherches de membres et d'ordres"},
    {"id": "support", "name": "Conseil & Entraide", "icon": "Heart", "description": "Questions, problèmes, retours"},
]


class ForumThreadReq(BaseModel):
    category: str
    title: str
    content: str


@api.get("/forum/categories")
async def list_forum_categories():
    cats = []
    for c in FORUM_CATEGORIES:
        thread_count = await db.forum_threads.count_documents({"category": c["id"]})
        last = await db.forum_threads.find_one({"category": c["id"]}, sort=[("last_activity_at", -1)])
        cats.append({**c, "thread_count": thread_count, "last_activity_at": last["last_activity_at"] if last else None})
    return cats


@api.get("/forum/threads")
async def list_forum_threads(category: str, user: dict = Depends(get_user_dep)):
    if not any(c["id"] == category for c in FORUM_CATEGORIES):
        raise HTTPException(404, "Catégorie introuvable")
    threads = await db.forum_threads.find({"category": category}, {"_id": 0}) \
        .sort([("pinned", -1), ("last_activity_at", -1)]).limit(50).to_list(50)
    user_ids = list({t["user_id"] for t in threads})
    udocs = await db.users.find({"user_id": {"$in": user_ids}},
        {"_id": 0, "user_id": 1, "username": 1, "role": 1, "level": 1, "class_name": 1}).to_list(100)
    umap = {u["user_id"]: u for u in udocs}
    for t in threads:
        t["author"] = umap.get(t["user_id"], {})
    return threads


@api.post("/forum/threads")
async def create_forum_thread(req: ForumThreadReq, user: dict = Depends(get_user_dep)):
    if not any(c["id"] == req.category for c in FORUM_CATEGORIES):
        raise HTTPException(404, "Catégorie introuvable")
    title = req.title.strip()
    content = req.content.strip()
    if len(title) < 5 or len(title) > 120:
        raise HTTPException(400, "Titre 5-120 caractères")
    if len(content) < 10 or len(content) > 5000:
        raise HTTPException(400, "Message 10-5000 caractères")
    thread_id = f"thr_{uuid.uuid4().hex[:12]}"
    now_iso = now_utc().isoformat()
    thread = {
        "thread_id": thread_id, "category": req.category,
        "user_id": user["user_id"], "title": title, "content": content,
        "replies_count": 0, "views": 0,
        "pinned": False, "locked": False,
        "created_at": now_iso, "last_activity_at": now_iso,
    }
    await db.forum_threads.insert_one(thread)
    await grant_xp(user["user_id"], 30, "forum_thread")
    await add_chronicle(user["user_id"], f"A ouvert le débat « {title} »", "forum")
    await grant_badge(user["user_id"], "scholar")
    thread.pop("_id", None)
    return thread


@api.get("/forum/threads/{thread_id}")
async def get_forum_thread(thread_id: str, user: dict = Depends(get_user_dep)):
    thread = await db.forum_threads.find_one({"thread_id": thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(404, "Sujet introuvable")
    await db.forum_threads.update_one({"thread_id": thread_id}, {"$inc": {"views": 1}})
    thread["views"] = thread.get("views", 0) + 1
    replies = await db.forum_replies.find({"thread_id": thread_id}, {"_id": 0}) \
        .sort("created_at", 1).to_list(500)
    user_ids = list({thread["user_id"]} | {r["user_id"] for r in replies})
    udocs = await db.users.find({"user_id": {"$in": list(user_ids)}},
        {"_id": 0, "user_id": 1, "username": 1, "role": 1, "level": 1, "class_name": 1}).to_list(500)
    umap = {u["user_id"]: u for u in udocs}
    thread["author"] = umap.get(thread["user_id"], {})
    for r in replies:
        r["author"] = umap.get(r["user_id"], {})
    return {"thread": thread, "replies": replies}


class ForumReplyReq(BaseModel):
    content: str


@api.post("/forum/threads/{thread_id}/replies")
async def reply_thread(thread_id: str, req: ForumReplyReq, user: dict = Depends(get_user_dep)):
    thread = await db.forum_threads.find_one({"thread_id": thread_id})
    if not thread:
        raise HTTPException(404, "Sujet introuvable")
    if thread.get("locked"):
        raise HTTPException(403, "Sujet verrouillé")
    content = req.content.strip()
    if len(content) < 2 or len(content) > 2000:
        raise HTTPException(400, "Message 2-2000 caractères")
    reply = {
        "reply_id": f"rpl_{uuid.uuid4().hex[:12]}",
        "thread_id": thread_id, "user_id": user["user_id"],
        "content": content, "created_at": now_utc().isoformat(),
    }
    await db.forum_replies.insert_one(reply)
    await db.forum_threads.update_one({"thread_id": thread_id},
        {"$inc": {"replies_count": 1}, "$set": {"last_activity_at": now_utc().isoformat()}})
    await grant_xp(user["user_id"], 10, "forum_reply")
    if thread["user_id"] != user["user_id"]:
        await push_notification(db, thread["user_id"], "forum_reply",
            f"{user['username']} a répondu à votre sujet",
            thread["title"][:100], "ding", "MessageCircle")
    reply.pop("_id", None)
    return reply


@api.delete("/forum/threads/{thread_id}")
async def delete_thread(thread_id: str, user: dict = Depends(get_user_dep)):
    thread = await db.forum_threads.find_one({"thread_id": thread_id})
    if not thread:
        raise HTTPException(404, "Sujet introuvable")
    is_staff = user.get("role") in ("admin", "moderator")
    if not is_staff and thread["user_id"] != user["user_id"]:
        raise HTTPException(403, "Action interdite")
    await db.forum_threads.delete_one({"thread_id": thread_id})
    await db.forum_replies.delete_many({"thread_id": thread_id})
    return {"ok": True}


@api.post("/forum/threads/{thread_id}/pin")
async def pin_thread(thread_id: str, user: dict = Depends(get_staff_dep)):
    thread = await db.forum_threads.find_one({"thread_id": thread_id})
    if not thread:
        raise HTTPException(404, "Sujet introuvable")
    await db.forum_threads.update_one({"thread_id": thread_id}, {"$set": {"pinned": not thread.get("pinned", False)}})
    return {"ok": True}


@api.post("/forum/threads/{thread_id}/lock")
async def lock_thread(thread_id: str, user: dict = Depends(get_staff_dep)):
    thread = await db.forum_threads.find_one({"thread_id": thread_id})
    if not thread:
        raise HTTPException(404, "Sujet introuvable")
    await db.forum_threads.update_one({"thread_id": thread_id}, {"$set": {"locked": not thread.get("locked", False)}})
    return {"ok": True}


# ============================================================================
# SAISONS — Cycles du Cosmos
# ============================================================================
class SeasonCreateReq(BaseModel):
    name: str
    description: str = ""
    duration_days: int = 30


@api.get("/seasons/current")
async def current_season():
    return await db.seasons.find_one({"active": True}, {"_id": 0})


@api.get("/seasons")
async def list_seasons(user: dict = Depends(get_user_dep)):
    return await db.seasons.find({}, {"_id": 0}).sort("started_at", -1).limit(20).to_list(20)


@api.get("/seasons/{season_id}/leaderboard")
async def season_leaderboard(season_id: str, user: dict = Depends(get_user_dep)):
    rows = await db.season_scores.find({"season_id": season_id}, {"_id": 0}) \
        .sort("season_xp", -1).limit(50).to_list(50)
    user_ids = [r["user_id"] for r in rows]
    udocs = await db.users.find({"user_id": {"$in": user_ids}},
        {"_id": 0, "user_id": 1, "username": 1, "class_name": 1, "level": 1, "role": 1, "avatar_url": 1}).to_list(100)
    umap = {u["user_id"]: u for u in udocs}
    for r in rows:
        r["user"] = umap.get(r["user_id"], {})
    return rows


@api.post("/admin/seasons")
async def create_season(req: SeasonCreateReq, user: dict = Depends(get_admin_dep)):
    await db.seasons.update_many({"active": True}, {"$set": {"active": False, "ended_at": now_utc().isoformat()}})
    season_id = f"season_{uuid.uuid4().hex[:10]}"
    start = now_utc()
    end = start + timedelta(days=req.duration_days)
    season = {
        "season_id": season_id, "name": req.name, "description": req.description,
        "active": True, "duration_days": req.duration_days,
        "started_at": start.isoformat(), "ends_at": end.isoformat(),
        "rewards": {
            "top_1": {"aether": 5000, "badge": "season_champion", "title": "Champion de la Saison"},
            "top_10": {"aether": 1500, "badge": "season_elite"},
            "top_50": {"aether": 500},
        },
        "created_by": user["user_id"],
    }
    await db.seasons.insert_one(season)
    season.pop("_id", None)
    all_users = await db.users.find({}, {"_id": 0, "user_id": 1}).to_list(5000)
    for u in all_users:
        await push_notification(db, u["user_id"], "season_start",
            f"Saison « {req.name} » ouverte", req.description[:200], "ding", "Sparkles")
    return season


@api.post("/admin/seasons/{season_id}/end")
async def end_season(season_id: str, user: dict = Depends(get_admin_dep)):
    season = await db.seasons.find_one({"season_id": season_id})
    if not season:
        raise HTTPException(404, "Saison introuvable")
    if not season.get("active"):
        raise HTTPException(400, "Saison déjà clôturée")
    rows = await db.season_scores.find({"season_id": season_id}).sort("season_xp", -1).limit(50).to_list(50)
    for rank_idx, row in enumerate(rows):
        rank = rank_idx + 1
        reward_aether = 0
        if rank == 1:
            reward_aether = season["rewards"]["top_1"]["aether"]
            await grant_badge(row["user_id"], "season_champion")
        elif rank <= 10:
            reward_aether = season["rewards"]["top_10"]["aether"]
            await grant_badge(row["user_id"], "season_elite")
        elif rank <= 50:
            reward_aether = season["rewards"]["top_50"]["aether"]
        if reward_aether:
            await db.users.update_one({"user_id": row["user_id"]}, {"$inc": {"aether": reward_aether}})
            await push_notification(db, row["user_id"], "season_reward",
                f"Récompense saison #{rank}", f"+{reward_aether} Aether", "coin", "Coins")
    await db.seasons.update_one({"season_id": season_id}, {"$set": {"active": False, "ended_at": now_utc().isoformat()}})
    return {"ok": True, "ranked": len(rows)}


# ---------- Mount ----------
# (api router is included AFTER all endpoint declarations at the bottom of the file)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Startup ----------

# ============================================================================
# FRIENDS — Liens de fraternité
# ============================================================================
class FriendReq(BaseModel):
    target_username: str


@api.post("/friends/request")
async def send_friend_request(req: FriendReq, user: dict = Depends(get_user_dep)):
    target = await db.users.find_one({"username": req.target_username}, {"_id": 0, "user_id": 1, "username": 1})
    if not target:
        raise HTTPException(404, "Héros introuvable")
    if target["user_id"] == user["user_id"]:
        raise HTTPException(400, "On ne peut pas se lier à soi-même")
    # Already friends?
    existing_link = await db.friendships.find_one({
        "$or": [
            {"user_a": user["user_id"], "user_b": target["user_id"]},
            {"user_a": target["user_id"], "user_b": user["user_id"]},
        ],
    })
    if existing_link:
        raise HTTPException(400, "Vous êtes déjà liés")
    # Existing pending request in either direction?
    existing_req = await db.friend_requests.find_one({
        "$or": [
            {"from_user": user["user_id"], "to_user": target["user_id"], "status": "pending"},
            {"from_user": target["user_id"], "to_user": user["user_id"], "status": "pending"},
        ],
    })
    if existing_req:
        raise HTTPException(400, "Une demande est déjà en cours")
    request_id = f"freq_{uuid.uuid4().hex[:10]}"
    await db.friend_requests.insert_one({
        "request_id": request_id,
        "from_user": user["user_id"], "to_user": target["user_id"],
        "status": "pending", "created_at": now_utc().isoformat(),
    })
    await push_notification(db, target["user_id"], "friend_request",
        f"{user['username']} souhaite vous lier", "Acceptez ou refusez le pacte d'amitié", "ding", "UserPlus")
    return {"ok": True, "request_id": request_id}


@api.get("/friends/requests")
async def list_friend_requests(user: dict = Depends(get_user_dep)):
    """Returns pending requests directed AT me."""
    reqs = await db.friend_requests.find(
        {"to_user": user["user_id"], "status": "pending"}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    from_ids = [r["from_user"] for r in reqs]
    udocs = await db.users.find({"user_id": {"$in": from_ids}},
        {"_id": 0, "user_id": 1, "username": 1, "level": 1, "class_name": 1, "role": 1, "avatar_url": 1}).to_list(100)
    umap = {u["user_id"]: u for u in udocs}
    for r in reqs:
        r["from"] = umap.get(r["from_user"], {})
    return reqs


@api.post("/friends/requests/{request_id}/accept")
async def accept_friend_request(request_id: str, user: dict = Depends(get_user_dep)):
    req_doc = await db.friend_requests.find_one({"request_id": request_id, "to_user": user["user_id"]})
    if not req_doc or req_doc["status"] != "pending":
        raise HTTPException(404, "Demande introuvable")
    await db.friend_requests.update_one({"request_id": request_id}, {"$set": {"status": "accepted", "responded_at": now_utc().isoformat()}})
    a, b = sorted([req_doc["from_user"], req_doc["to_user"]])
    await db.friendships.insert_one({
        "friendship_id": f"frd_{uuid.uuid4().hex[:10]}",
        "user_a": a, "user_b": b, "since": now_utc().isoformat(),
    })
    await push_notification(db, req_doc["from_user"], "friend_accepted",
        f"{user['username']} a accepté votre demande", "Un nouveau lien d'amitié est forgé", "ding", "Users")
    return {"ok": True}


@api.post("/friends/requests/{request_id}/decline")
async def decline_friend_request(request_id: str, user: dict = Depends(get_user_dep)):
    req_doc = await db.friend_requests.find_one({"request_id": request_id, "to_user": user["user_id"]})
    if not req_doc or req_doc["status"] != "pending":
        raise HTTPException(404, "Demande introuvable")
    await db.friend_requests.update_one({"request_id": request_id}, {"$set": {"status": "declined", "responded_at": now_utc().isoformat()}})
    return {"ok": True}


@api.get("/friends")
async def list_friends(user: dict = Depends(get_user_dep)):
    links = await db.friendships.find(
        {"$or": [{"user_a": user["user_id"]}, {"user_b": user["user_id"]}]}, {"_id": 0}
    ).to_list(500)
    friend_ids = [link["user_b"] if link["user_a"] == user["user_id"] else link["user_a"] for link in links]
    friends = await db.users.find({"user_id": {"$in": friend_ids}},
        {"_id": 0, "user_id": 1, "username": 1, "level": 1, "class_name": 1, "role": 1, "avatar_url": 1, "rank": 1}).to_list(500)
    return friends


@api.delete("/friends/{target_user_id}")
async def unfriend(target_user_id: str, user: dict = Depends(get_user_dep)):
    a, b = sorted([user["user_id"], target_user_id])
    result = await db.friendships.delete_one({"user_a": a, "user_b": b})
    if not result.deleted_count:
        raise HTTPException(404, "Lien d'amitié introuvable")
    return {"ok": True}


# ============================================================================
# HELP TICKETS — Doléances au Conseil
# ============================================================================
class TicketCreateReq(BaseModel):
    subject: str
    body: str
    category: str = "general"  # general | bug | account | other


@api.post("/tickets")
async def create_ticket(req: TicketCreateReq, user: dict = Depends(get_user_dep)):
    subject = req.subject.strip()
    body = req.body.strip()
    if len(subject) < 5 or len(subject) > 150:
        raise HTTPException(400, "Sujet 5-150 caractères")
    if len(body) < 10 or len(body) > 3000:
        raise HTTPException(400, "Message 10-3000 caractères")
    ticket_id = f"tkt_{uuid.uuid4().hex[:12]}"
    ticket = {
        "ticket_id": ticket_id,
        "user_id": user["user_id"],
        "username": user["username"],
        "subject": subject, "body": body, "category": req.category,
        "status": "open",  # open | in_progress | resolved | closed
        "created_at": now_utc().isoformat(),
        "updated_at": now_utc().isoformat(),
        "replies_count": 0,
    }
    await db.tickets.insert_one(ticket)
    ticket.pop("_id", None)
    return ticket


@api.get("/tickets/mine")
async def list_my_tickets(user: dict = Depends(get_user_dep)):
    return await db.tickets.find({"user_id": user["user_id"]}, {"_id": 0}).sort("updated_at", -1).to_list(100)


@api.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, user: dict = Depends(get_user_dep)):
    t = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Doléance introuvable")
    is_staff = user.get("role") in ("admin", "moderator")
    if t["user_id"] != user["user_id"] and not is_staff:
        raise HTTPException(403, "Action interdite")
    replies = await db.ticket_replies.find({"ticket_id": ticket_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    user_ids = list({t["user_id"]} | {r["user_id"] for r in replies})
    udocs = await db.users.find({"user_id": {"$in": list(user_ids)}},
        {"_id": 0, "user_id": 1, "username": 1, "role": 1, "level": 1}).to_list(500)
    umap = {u["user_id"]: u for u in udocs}
    for r in replies:
        r["author"] = umap.get(r["user_id"], {})
    t["author"] = umap.get(t["user_id"], {})
    return {"ticket": t, "replies": replies}


class TicketReplyReq(BaseModel):
    content: str


@api.post("/tickets/{ticket_id}/replies")
async def reply_ticket(ticket_id: str, req: TicketReplyReq, user: dict = Depends(get_user_dep)):
    t = await db.tickets.find_one({"ticket_id": ticket_id})
    if not t:
        raise HTTPException(404, "Doléance introuvable")
    is_staff = user.get("role") in ("admin", "moderator")
    if t["user_id"] != user["user_id"] and not is_staff:
        raise HTTPException(403, "Action interdite")
    content = req.content.strip()
    if len(content) < 2 or len(content) > 3000:
        raise HTTPException(400, "Message 2-3000 caractères")
    reply = {
        "reply_id": f"trpl_{uuid.uuid4().hex[:10]}",
        "ticket_id": ticket_id, "user_id": user["user_id"],
        "content": content, "is_staff": is_staff,
        "created_at": now_utc().isoformat(),
    }
    await db.ticket_replies.insert_one(reply)
    update = {"updated_at": now_utc().isoformat()}
    if is_staff and t["status"] == "open":
        update["status"] = "in_progress"
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$inc": {"replies_count": 1}, "$set": update})
    # Notify the other party
    other_uid = t["user_id"] if is_staff else None
    if is_staff and other_uid != user["user_id"]:
        await push_notification(db, other_uid, "ticket_reply",
            "Réponse du Conseil à votre doléance", t["subject"][:100], "ding", "MessageCircle")
    reply.pop("_id", None)
    return reply


class TicketStatusReq(BaseModel):
    status: str  # open | in_progress | resolved | closed


@api.put("/tickets/{ticket_id}/status")
async def set_ticket_status(ticket_id: str, req: TicketStatusReq, user: dict = Depends(get_staff_dep)):
    if req.status not in ("open", "in_progress", "resolved", "closed"):
        raise HTTPException(400, "Statut invalide")
    t = await db.tickets.find_one({"ticket_id": ticket_id})
    if not t:
        raise HTTPException(404, "Doléance introuvable")
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": {"status": req.status, "updated_at": now_utc().isoformat()}})
    await push_notification(db, t["user_id"], "ticket_status",
        f"Doléance « {t['subject'][:60]} » → {req.status}",
        "Le Conseil a mis à jour votre dossier", "ding", "Mail")
    return {"ok": True}


@api.get("/admin/tickets")
async def admin_list_tickets(status: str = "all", user: dict = Depends(get_staff_dep)):
    q = {} if status == "all" else {"status": status}
    return await db.tickets.find(q, {"_id": 0}).sort([("status", 1), ("updated_at", -1)]).limit(200).to_list(200)


# ============================================================================
# AETHER GRANT — Distribution administrative
# ============================================================================
class AetherGrantReq(BaseModel):
    target_user_id: str
    amount: int
    reason: str = ""


@api.post("/admin/grant-aether")
async def admin_grant_aether(req: AetherGrantReq, user: dict = Depends(get_admin_dep)):
    if req.amount == 0:
        raise HTTPException(400, "Montant invalide")
    target = await db.users.find_one({"user_id": req.target_user_id})
    if not target:
        raise HTTPException(404, "Héros introuvable")
    # Allow negative amounts to clawback. Don't underflow.
    new_aether = max(0, target.get("aether", 0) + req.amount)
    await db.users.update_one({"user_id": req.target_user_id}, {"$set": {"aether": new_aether}})
    sign = "+" if req.amount > 0 else ""
    await add_chronicle(req.target_user_id,
        f"Le Conseil ({user['username']}) accorde {sign}{req.amount} Aether · {req.reason or 'sans motif'}",
        "admin")
    await push_notification(db, req.target_user_id, "aether_grant",
        f"{sign}{req.amount} Aether du Conseil",
        req.reason or "Don administratif", "coin", "Coins")
    return {"ok": True, "new_aether": new_aether}


# ============================================================================
# DISCORD ROLE SYNC — endpoints
# ============================================================================
@api.post("/discord/sync-me")
async def discord_sync_me(user: dict = Depends(get_user_dep)):
    """User-triggered sync of their own roles."""
    result = await discord_sync.sync_discord_roles(db, user["user_id"])
    return result


@api.post("/admin/discord/sync-user/{target_user_id}")
async def discord_sync_user(target_user_id: str, user: dict = Depends(get_staff_dep)):
    result = await discord_sync.sync_discord_roles(db, target_user_id)
    return result


@api.post("/admin/discord/sync-all")
async def discord_sync_all(user: dict = Depends(get_admin_dep)):
    """Re-sync EVERY linked Discord account. Runs sequentially with rate-limit pacing."""
    if not discord_sync.is_configured():
        raise HTTPException(503, "Discord bot non configuré")
    linked = await db.users.find({"discord_id": {"$exists": True, "$ne": None}}, {"_id": 0, "user_id": 1}).to_list(5000)
    stats = {"total": len(linked), "ok": 0, "skipped": 0, "errors": 0}
    for u in linked:
        r = await discord_sync.sync_discord_roles(db, u["user_id"])
        if r.get("ok"):
            stats["ok"] += 1
        elif r.get("skipped"):
            stats["skipped"] += 1
        else:
            stats["errors"] += 1
        # Light rate-limit pacing — Discord allows ~50/sec global, we go gentle.
        await asyncio.sleep(0.25)
    return stats


@api.get("/admin/discord/log")
async def discord_sync_log(user: dict = Depends(get_staff_dep)):
    return await db.discord_sync_log.find({}, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)


@api.get("/discord/status")
async def discord_status():
    """Public-ish: tells the frontend whether Discord sync is wired up."""
    return {"configured": discord_sync.is_configured()}


# ---------- Nexus Online lobby endpoint ----------
@api.get("/nexus/rooms")
async def list_nexus_rooms(user: dict = Depends(get_user_dep)):
    """Lobby endpoint: returns rooms + current online count + access flags + art."""
    from nexus_rooms import can_access, get_room_scene
    rooms = nexus_world.online_summary()
    out = []
    for r in rooms:
        ok, reason = can_access(user, r["id"])
        out.append({
            **r,
            **get_room_scene(r["id"]),
            "restricted_for_user": not ok,
            "restricted_reason": reason if not ok else None,
        })
    return out


@api.get("/nexus/rooms-public")
async def list_nexus_rooms_public():
    """Public lobby endpoint — exposes minimal room info (no access flags).
    Used by the Landing page so visitors can see the world is alive.
    """
    from nexus_rooms import get_room_scene
    rooms = nexus_world.online_summary()
    return [{**r, **get_room_scene(r["id"])} for r in rooms]


@api.get("/stats/public")
async def public_stats():
    """Lightweight public counters for the Landing/Dashboard pages."""
    try:
        heroes = await db.users.count_documents({})
        guilds = await db.guilds.count_documents({})
        events_active = 0
        try:
            now = datetime.now(timezone.utc).isoformat()
            events_active = await db.events.count_documents({"ends_at": {"$gt": now}})
        except Exception:
            pass
        # Heroes connected right now (from nexus_world presence)
        try:
            from nexus_world import _players as _nexus_players  # type: ignore
            heroes_online = len({p.get("user_id") for p in _nexus_players.values() if p.get("user_id")})
        except Exception:
            heroes_online = 0
        # New signups in the last 24h
        try:
            yesterday_iso = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
            new_signups = await db.users.count_documents({"created_at": {"$gt": yesterday_iso}})
        except Exception:
            new_signups = 0
        # Visits today — proxy via users who logged in (last_seen) in the last 24h
        try:
            visits_today = await db.users.count_documents({"last_seen": {"$gt": yesterday_iso}})
        except Exception:
            visits_today = 0
        # Server stability — bounded by recent error log count (defaults to 99.9%)
        server_stability = 99.9
        try:
            recent_errs = await db.gm_audit_log.count_documents({
                "action": {"$in": ["error", "exception"]},
                "timestamp": {"$gt": yesterday_iso},
            })
            if recent_errs >= 50:
                server_stability = 95.0
            elif recent_errs >= 10:
                server_stability = 98.5
            elif recent_errs >= 1:
                server_stability = 99.5
        except Exception:
            pass
        return {
            "heroes": heroes,
            "heroes_online": heroes_online,
            "guilds": guilds,
            "events": events_active,
            "new_signups": new_signups,
            "visits_today": visits_today,
            "server_stability": server_stability,
        }
    except Exception:
        return {"heroes": 0, "heroes_online": 0, "guilds": 0, "events": 0,
                "new_signups": 0, "visits_today": 0, "server_stability": 99.9}


@api.get("/users/{user_id}/card")
async def hero_card(user_id: str, viewer: dict = Depends(get_user_dep)):
    """Premium hero card: profile + badges + inventory + chronicles + equipment + stats + guild."""
    u = await db.users.find_one({"user_id": user_id}, {
        "_id": 0, "password_hash": 0, "google_id": 0,
    })
    if not u:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    inv = await db.inventory.find({"user_id": user_id}, {"_id": 0}).sort("obtained_at", -1).to_list(200)
    badges = await db.user_badges.find({"user_id": user_id}, {"_id": 0}).sort("unlocked_at", -1).to_list(120)
    badges = enrich_badges(badges)
    chronicles = await db.chronicles.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(40).to_list(40)
    friends_count = await db.friendships.count_documents({"$or": [{"user_id": user_id}, {"friend_id": user_id}], "status": "accepted"})
    guild = None
    g = await db.guilds.find_one({"members.user_id": user_id}, {"_id": 0, "guild_id": 1, "name": 1, "tag": 1, "color": 1, "rank": 1})
    if g:
        guild = g
    # Live presence (room name + total in that room) from in-memory state
    location = None
    try:
        for sid, p in nexus_world._players.items():
            if p["user_id"] == user_id:
                location = {"room": p["room"], "tx": p["tx"], "ty": p["ty"]}
                break
    except Exception:
        pass
    is_friend = False
    if viewer["user_id"] != user_id:
        f = await db.friendships.find_one({"$or": [
            {"user_id": viewer["user_id"], "friend_id": user_id},
            {"user_id": user_id, "friend_id": viewer["user_id"]},
        ], "status": "accepted"})
        is_friend = bool(f)
    return {
        "user": u,
        "inventory": inv,
        "badges": badges,
        "chronicles": chronicles,
        "friends_count": friends_count,
        "guild": guild,
        "location": location,
        "is_friend": is_friend,
        "is_self": viewer["user_id"] == user_id,
    }


@api.get("/admin/gm-audit")
async def gm_audit_log(
    limit: int = 100,
    action: str | None = None,
    actor_user_id: str | None = None,
    target_user_id: str | None = None,
    user: dict = Depends(get_staff_dep),
):
    """Game Master audit log. Staff only."""
    q: dict = {}
    if action:
        q["action"] = action
    if actor_user_id:
        q["actor_user_id"] = actor_user_id
    if target_user_id:
        q["target_user_id"] = target_user_id
    limit = max(1, min(500, limit))
    cursor = db.gm_audit_log.find(q, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cursor.to_list(limit)


# ---------- Mount router at the very end (after ALL endpoint declarations) ----------
app.include_router(api)

# Mount the Nexus Online (Socket.IO) ASGI app.
# Tried /api/nexus first but the Starlette Mount does not bind cleanly under the
# already-included APIRouter prefix. Mounting at /api/realtime/nexus works.
# Mount the Nexus Online (Socket.IO) ASGI app under root.
# The socketio_path is configured as 'api/nexus/socket.io' so requests to
# /api/nexus/socket.io/... go through ingress (which only forwards /api).
# We attach the socketio ASGIApp as a fallback after all FastAPI routes.
_nexus_asgi = nexus_world.build_socketio_app(db)
app.mount("/api/nexus", _nexus_asgi)



@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("username", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.posts.create_index("post_id", unique=True)
    await db.posts.create_index("created_at")
    await db.user_badges.create_index([("user_id", 1), ("badge_id", 1)], unique=True)
    await db.chronicles.create_index([("user_id", 1), ("created_at", -1)])
    await db.user_quests.create_index("user_id_quest_id", unique=True, sparse=True)
    await db.gm_audit_log.create_index([("created_at", -1)])
    await db.gm_audit_log.create_index("action")
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@nexoria.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        admin_id = generate_user_id()
        await db.users.insert_one({
            "user_id": admin_id,
            "email": admin_email,
            "username": "ArchonteSupreme",
            "password_hash": hash_password(admin_password),
            "class_id": "chronomancer",
            "class_name": "Chronomancien",
            "secondary_class_id": "necromancer",
            "avatar_url": None,
            "banner_url": None,
            "bio": "Gardien suprême de NEXORIA",
            "story": "Présent depuis l'aube des temps",
            "quote": "Le temps obéit à ma volonté",
            "level": 999, "xp": xp_for_level(999), "rank": "Cosmique",
            "reputation": 99999, "aether": 99999, "skill_points": 100,
            "active_title": "elu_cosmique",
            "role": "admin",
            "auth_provider": "local",
            "created_at": now_utc().isoformat(),
            "dna": {"creativity": 100, "ambition": 100, "sociability": 100, "curiosity": 100, "persistence": 100, "influence": 100},
            "kingdom": {b["id"]: {"level": 10} for b in KINGDOM_BUILDINGS},
            "skills_allocated": {s["id"]: 50 for s in SKILLS},
            "followers": 0, "following": 0,
        })
        # admin gets all badges
        for b in BADGES:
            await db.user_badges.insert_one({"user_id": admin_id, "badge_id": b["id"], "obtained_at": now_utc().isoformat()})
    else:
        # ensure password is current
        if not verify_password(admin_password, existing.get("password_hash", "")):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # One-time cleanup: remove the legacy "founder" badge from all beta accounts (per user request)
    try:
        founder_cleanup = await db.user_badges.delete_many({"badge_id": "founder"})
        if founder_cleanup.deleted_count:
            logger.info(f"NEXORIA: removed {founder_cleanup.deleted_count} legacy 'founder' badges")
    except Exception as e:
        logger.warning(f"NEXORIA: founder badge cleanup skipped — {e}")

    # One-time global cleanup of existing inventory duplicates (idempotent)
    try:
        user_ids = await db.inventory.distinct("user_id")
        total_removed = 0
        for uid in user_ids:
            total_removed += await dedupe_inventory(uid)
        if total_removed:
            logger.info(f"NEXORIA: collapsed {total_removed} duplicate inventory rows across {len(user_ids)} users")
    except Exception as e:
        logger.warning(f"NEXORIA: inventory dedupe migration skipped — {e}")

    # One-time cleanup of existing consumable duplicates (idempotent)
    try:
        pipeline = [
            {"$match": {"used": False}},
            {"$group": {
                "_id": {"user_id": "$user_id", "sku": "$sku"},
                "ids": {"$push": "$_id"},
                "qty_sum": {"$sum": {"$ifNull": ["$quantity", 1]}},
                "first_obtained": {"$min": "$obtained_at"},
                "name": {"$first": "$name"},
                "count": {"$sum": 1},
            }},
            {"$match": {"count": {"$gt": 1}}},
        ]
        consumable_removed = 0
        async for grp in db.user_consumables.aggregate(pipeline):
            keep_id = grp["ids"][0]
            rest_ids = grp["ids"][1:]
            await db.user_consumables.update_one(
                {"_id": keep_id},
                {"$set": {"quantity": grp["qty_sum"], "obtained_at": grp["first_obtained"]}},
            )
            r = await db.user_consumables.delete_many({"_id": {"$in": rest_ids}})
            consumable_removed += r.deleted_count
        if consumable_removed:
            logger.info(f"NEXORIA: collapsed {consumable_removed} duplicate consumable rows")
    except Exception as e:
        logger.warning(f"NEXORIA: consumable dedupe migration skipped — {e}")

    logger.info("NEXORIA backend started")


@app.on_event("shutdown")
async def shutdown():
    client.close()
