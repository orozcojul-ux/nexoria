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
    await db.users.update_one({"user_id": user_id}, {"$set": update})


async def grant_aether(user_id: str, amount: int):
    await db.users.update_one({"user_id": user_id}, {"$inc": {"aether": amount}})


async def grant_reputation(user_id: str, amount: int):
    await db.users.update_one({"user_id": user_id}, {"$inc": {"reputation": amount}})


async def progress_quests(user_id: str, action: str, amount: int = 1):
    """Advance all active quests matching the action."""
    today = now_utc().date().isoformat()
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
        else:
            await db.user_quests.update_one({"_id": q["_id"]}, {"$set": update})


def _secure_choice(seq):
    return seq[_secrets.randbelow(len(seq))]


def _secure_weighted_choice(items, weights):
    """Cryptographically secure weighted choice."""
    total = sum(weights)
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
    """Generate 1-3 random items based on rarity weights."""
    items = []
    count = _secure_weighted_choice([1, 2, 3], [60, 30, 10])
    for _ in range(count):
        rarity_ids = list(RARITIES.keys())
        weights = [RARITIES[r]["weight"] for r in rarity_ids]
        rarity = _secure_weighted_choice(rarity_ids, weights)
        candidates = [t for t in ITEM_TEMPLATES if t["rarity"] == rarity]
        if not candidates:
            candidates = ITEM_TEMPLATES
        tmpl = _secure_choice(candidates)
        item = {
            "item_id": f"item_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "name": tmpl["name"],
            "type": tmpl["type"],
            "rarity": tmpl["rarity"],
            "icon": tmpl["icon"],
            "obtained_at": now_utc().isoformat(),
        }
        await db.inventory.insert_one(item)
        item.pop("_id", None)
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
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})

    # Badges + XP for customization
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
    return {"profile": public_user(user), "badges": user_badges, "xp_next": xp_for_level(user["level"] + 1) if user["level"] < 999 else None}


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
@api.get("/inventory")
async def get_inventory(user: dict = Depends(get_user_dep)):
    items = await db.inventory.find({"user_id": user["user_id"]}, {"_id": 0}).sort("obtained_at", -1).to_list(500)
    return items


@api.post("/inventory/open-chest")
async def open_chest_endpoint(user: dict = Depends(get_user_dep)):
    cost = 50
    fresh = await db.users.find_one({"user_id": user["user_id"]})
    if fresh.get("aether", 0) < cost:
        raise HTTPException(400, f"Aether insuffisant ({cost} requis)")
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"aether": -cost}})
    items = await open_chest(user["user_id"])
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
    users = await db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0, "user_id": 1, "username": 1, "avatar_url": 1, "level": 1, "class_name": 1, "active_title": 1, "rank": 1}).to_list(500)
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
    users = await db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0, "user_id": 1, "username": 1, "avatar_url": 1, "level": 1}).to_list(500)
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
    return obtained


@api.get("/badges/user/{username}")
async def user_badges(username: str):
    u = await db.users.find_one({"username": username}, {"user_id": 1})
    if not u:
        raise HTTPException(404, "Héros introuvable")
    return await db.user_badges.find({"user_id": u["user_id"]}, {"_id": 0}).to_list(500)


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
async def admin_stats(user: dict = Depends(get_admin_dep)):
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
async def admin_users(user: dict = Depends(get_admin_dep)):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).limit(200).to_list(200)


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user: dict = Depends(get_admin_dep)):
    if user_id == user["user_id"]:
        raise HTTPException(400, "Impossible de se supprimer")
    await db.users.delete_one({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    return {"ok": True}


@api.get("/admin/logs")
async def admin_logs(user: dict = Depends(get_admin_dep)):
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
    return SHOP_ITEMS


@api.post("/shop/purchase/{sku}")
async def purchase_item(sku: str, user: dict = Depends(get_user_dep)):
    item = get_shop_item(sku)
    if not item:
        raise HTTPException(404, "Article introuvable")
    full = await db.users.find_one({"user_id": user["user_id"]})
    if full["aether"] < item["price"]:
        raise HTTPException(400, f"Aether insuffisant ({item['price']} requis)")
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
            await db.user_consumables.insert_one({
                "user_id": user["user_id"], "sku": sku, "name": item["name"],
                "used": False, "obtained_at": now_utc().isoformat(),
            })
            applied["consumable_added"] = sku
    elif item["category"] == "kingdom":
        await db.user_perks.insert_one({"user_id": user["user_id"], "sku": sku, "obtained_at": now_utc().isoformat()})
        applied["perk_unlocked"] = sku

    await add_chronicle(user["user_id"], f"A acquis « {item['name']} » à la Boutique d'Aether", "shop")
    await push_notification(db, user["user_id"], "shop", "Achat confirmé", f"« {item['name']} » est à vous", "ding", "ShoppingBag")

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
async def admin_ban_user(user_id: str, req: BanReq, user: dict = Depends(get_admin_dep)):
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(404, "Utilisateur introuvable")
    if target.get("role") == "admin":
        raise HTTPException(400, "Impossible de bannir un admin")
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
async def admin_unban_user(user_id: str, user: dict = Depends(get_admin_dep)):
    await db.users.update_one(
        {"user_id": user_id},
        {"$unset": {"banned_until": "", "ban_reason": ""}},
    )
    await db.ban_history.update_many({"user_id": user_id, "lifted": False}, {"$set": {"lifted": True, "lifted_at": now_utc().isoformat()}})
    await add_chronicle(user_id, "Banni levé par le Conseil", "unban")
    return {"ok": True}


@api.get("/admin/ban-history")
async def admin_ban_history(user: dict = Depends(get_admin_dep)):
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


# ---------- Mount ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Startup ----------
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

    logger.info("NEXORIA backend started")


@app.on_event("shutdown")
async def shutdown():
    client.close()
