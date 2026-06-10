"""NEXORIA - Plateforme web communautaire RPG.
Backend FastAPI + MongoDB.
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import random
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
    """Strip sensitive fields and ensure clean serialization."""
    if not user:
        return {}
    user = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    for k, v in list(user.items()):
        if isinstance(v, datetime):
            user[k] = v.isoformat()
    return user


async def get_user_dep(request: Request):
    return await get_current_user(request, db)


async def get_admin_dep(request: Request):
    user = await get_current_user(request, db)
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
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


def pick_random_item():
    """Weighted random item from templates."""
    template = random.choice(ITEM_TEMPLATES)
    return template


async def open_chest(user_id: str):
    """Generate 1-3 random items based on rarity weights."""
    items = []
    count = random.choices([1, 2, 3], weights=[60, 30, 10])[0]
    for _ in range(count):
        # pick rarity by weight
        rarity_ids = list(RARITIES.keys())
        weights = [RARITIES[r]["weight"] for r in rarity_ids]
        rarity = random.choices(rarity_ids, weights=weights)[0]
        # pick item of that rarity
        candidates = [t for t in ITEM_TEMPLATES if t["rarity"] == rarity]
        if not candidates:
            candidates = ITEM_TEMPLATES
        tmpl = random.choice(candidates)
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
    await grant_badge(user_id, "founder")

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
        await grant_badge(user_id, "founder")
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
    await grant_xp(user["user_id"], 20, "post")
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
    return post


@api.post("/posts/{post_id}/react")
async def react_to_post(post_id: str, user: dict = Depends(get_user_dep)):
    existing = await db.reactions.find_one({"post_id": post_id, "user_id": user["user_id"]})
    if existing:
        await db.reactions.delete_one({"_id": existing["_id"]})
        await db.posts.update_one({"post_id": post_id}, {"$inc": {"reactions": -1}})
        return {"reacted": False}
    await db.reactions.insert_one({"post_id": post_id, "user_id": user["user_id"], "created_at": now_utc().isoformat()})
    await db.posts.update_one({"post_id": post_id}, {"$inc": {"reactions": 1}})
    post = await db.posts.find_one({"post_id": post_id})
    if post:
        await grant_xp(post["user_id"], 5, "reaction_received")
        await grant_reputation(post["user_id"], 2)
    await grant_xp(user["user_id"], 2, "react")
    await progress_quests(user["user_id"], "react", 1)
    count = await db.reactions.count_documents({"user_id": user["user_id"]})
    if count >= 50:
        await grant_badge(user["user_id"], "social_butterfly")
    if post and post.get("reactions", 0) + 1 >= 100:
        await grant_badge(post["user_id"], "viral_post")
    return {"reacted": True}


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
    await grant_xp(user["user_id"], 10, "comment")
    await progress_quests(user["user_id"], "comment", 1)
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

    if random.random() > 0.35:
        return {"rift": None}

    rift_types = [
        {"type": "double_xp", "name": "Faille de Puissance", "description": "Double XP pendant cette session", "reward": "+200 XP"},
        {"type": "chest", "name": "Faille de Trésor", "description": "Un coffre cosmique apparaît", "reward": "Coffre offert"},
        {"type": "aether", "name": "Faille Dorée", "description": "Une pluie d'Aether vous bénit", "reward": "+150 Aether"},
        {"type": "badge", "name": "Faille Mystique", "description": "Vous traversez la dimension", "reward": "Badge Marcheur des Failles"},
    ]
    rift = random.choice(rift_types)
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
    await db.inventory.create_index([("user_id", 1), ("obtained_at", -1)])

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
