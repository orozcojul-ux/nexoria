"""NEXORIA - Plateforme web communautaire RPG.
Backend FastAPI + MongoDB.
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
MAINTENANCE_UPLOAD_DIR = ROOT_DIR / "uploads" / "maintenance"
MAINTENANCE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CONTENT_UPLOAD_DIR = ROOT_DIR / "uploads" / "content"
CONTENT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
AVATAR_UPLOAD_DIR = ROOT_DIR / "uploads" / "avatars"
AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

import os
import re
import uuid
import secrets as _secrets
import logging
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from pydantic import BaseModel, Field, EmailStr

from auth import (
    hash_password, verify_password, create_session_token, session_expiry,
    set_session_cookie, clear_session_cookie, get_current_user, generate_user_id,
)
from game_data import (
    CLASSES, SKILLS, KINGDOM_BUILDINGS, RARITIES, TITLES, BADGES, SHOP_ONLY_TITLES,
    REFERRAL_TITLES, VIP_TITLES,
    QUEST_TEMPLATES, ITEM_TEMPLATES, xp_for_level, level_from_xp, rank_from_level,
    COMMUNITY_CHALLENGES,
)
try:
    from oracle import consult_oracle, generate_personalized_quest, oracle_llm_configured
except Exception as _oracle_err:
    logging.warning("Oracle IA — import échoué: %s", _oracle_err)

    async def consult_oracle(*args, **kwargs):
        return "L'Oracle médite en silence... (module indisponible — vérifiez EMERGENT_LLM_KEY)"

    async def generate_personalized_quest(*args, **kwargs):
        return {"name": "Quête locale", "description": "Oracle IA indisponible.", "xp": 100, "aether": 50}

    def oracle_llm_configured():
        return False
from shop_data import SHOP_ITEMS, get_shop_item, ECU_PACKS, get_ecu_pack
from notifications import push_notification, push_staff_alert
import discord_auth
import discord_sync
import discord_rewards
import discord_auth_forum
import online_gate
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

OWNER_USERNAME = os.environ.get("OWNER_USERNAME", "SmouzYi")
MAINTENANCE_MODE_ENV = os.environ.get("MAINTENANCE_MODE", "").strip().lower() in ("true", "1", "yes", "on")

# Routes always reachable while site is locked (maintenance or online gate)
MAINTENANCE_PUBLIC_PATHS = frozenset({
    "/api/maintenance/status",
    "/api/system/maintenance",
    "/api/system/online-gate",
    "/api/online/status",
    "/api/staff/maintenance-login",
    "/api/auth/logout",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/webhooks/stripe",  # Stripe calls this server-to-server (no session)
})

# ---------- Stripe (real-money écus top-up) ----------
# Configured entirely via environment variables — no secret ever hardcoded.
# Leave unset to keep the feature in "not configured" state (UI stays visible
# but checkout returns a clear message).
try:
    import stripe as _stripe
except Exception:  # pragma: no cover - dependency always present in requirements
    _stripe = None
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "").strip()
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "").strip()
if _stripe and STRIPE_SECRET_KEY:
    _stripe.api_key = STRIPE_SECRET_KEY


def stripe_enabled() -> bool:
    return bool(_stripe and STRIPE_SECRET_KEY)

# ---------- Helpers ----------
def now_utc():
    return datetime.now(timezone.utc)


def iso(dt):
    return dt.isoformat() if isinstance(dt, datetime) else dt


# ===================== VIP « Pass Ascendant » =====================
# Plans définis CÔTÉ SERVEUR uniquement — le prix envoyé par le client est ignoré.
VIP_PLANS = {
    "VIP_NEXUS_7":  {"id": "VIP_NEXUS_7",  "name": "VIP Nexus 7 jours",  "days": 7,  "price": 500,  "label": "7 jours"},
    "VIP_NEXUS_30": {"id": "VIP_NEXUS_30", "name": "VIP Nexus 30 jours", "days": 30, "price": 1500, "label": "30 jours"},
    "VIP_NEXUS_90": {"id": "VIP_NEXUS_90", "name": "VIP Nexus 90 jours", "days": 90, "price": 4000, "label": "90 jours"},
}
VIP_BADGE_ID = "vip_nexus"
VIP_TITLE_ID = "ascendant_nexus"
VIP_BONUS_MULTIPLIER = 1.10  # +10% XP & écus
VIP_DAILY_BONUS_AETHER = 100  # « coffre quotidien » VIP
# ID du rôle Discord VIP (optionnel — défini via l'environnement, jamais en dur).
DISCORD_VIP_ROLE_ID = os.environ.get("DISCORD_VIP_ROLE_ID", "").strip()

# Passe Saison : récompense de bienvenue (l'XP alimente aussi le classement
# saisonnier) + bonus multiplié sur les récompenses de fin de saison.
SEASON_PASS_BONUS_XP = 3000
SEASON_PASS_BONUS_AETHER = 1000
SEASON_PASS_REWARD_MULTIPLIER = 2  # récompenses de fin de saison doublées


def _parse_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        try:
            dt = datetime.fromisoformat(value)
        except (ValueError, TypeError):
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def vip_until_dt(user: dict):
    """Return the user's VIP expiry as an aware datetime, or None."""
    if not user:
        return None
    return _parse_dt(user.get("vip_until"))


def is_vip_active(user: dict) -> bool:
    """SOURCE OF TRUTH for VIP: based on vip_until, never on is_vip alone."""
    dt = vip_until_dt(user)
    return bool(dt and dt > now_utc())


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

    title_id = user.get("active_title") or "novice"
    title_doc = next((t for t in TITLES if t["id"] == title_id), None)
    user["active_title_name"] = title_doc["name"] if title_doc else title_id.replace("_", " ").title()

    # VIP « Pass Ascendant » — recomputed from vip_until (never trust is_vip alone).
    vip_active = is_vip_active(user)
    user["is_vip"] = vip_active
    user["vip_until"] = iso(user.get("vip_until")) if user.get("vip_until") else None
    user["vip_plan"] = user.get("vip_plan")
    user["vip_total_days_purchased"] = int(user.get("vip_total_days_purchased", 0) or 0)

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
        raise HTTPException(403, "Réservé aux Archontes (admin uniquement)")
    return user


async def get_staff_dep(request: Request):
    user = await get_current_user(request, db)
    if user.get("role") not in ("admin", "moderator"):
        raise HTTPException(403, "Staff only")
    return user


async def get_optional_user_dep(request: Request) -> Optional[dict]:
    """Return the current user when authenticated, else None (no 401)."""
    try:
        return await get_current_user(request, db)
    except HTTPException as exc:
        if exc.status_code in (401, 403):
            return None
        raise


def is_staff_user(user: dict | None) -> bool:
    return bool(user and user.get("role") in ("admin", "moderator"))


async def add_chronicle(user_id: str, text: str, kind: str = "event"):
    await db.chronicles.insert_one({
        "chronicle_id": f"chr_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "text": text,
        "kind": kind,
        "created_at": now_utc().isoformat(),
    })


async def enforce_owner_roles():
    """Garantit que le propriétaire reste admin — idempotent au démarrage.
    Les promotions staff (modérateur / sage) faites via l'admin sont conservées."""
    owner = await db.users.find_one({"username": OWNER_USERNAME}, {"_id": 0, "user_id": 1, "role": 1})
    if not owner:
        logger.warning("NEXORIA: propriétaire '%s' introuvable en base", OWNER_USERNAME)
        return
    if owner.get("role") != "admin":
        await db.users.update_one({"user_id": owner["user_id"]}, {"$set": {"role": "admin"}})
        logger.info("NEXORIA: %s promu admin (propriétaire)", OWNER_USERNAME)

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
    discord_rewards.schedule_reward_notify(db, user_id, "Badge débloqué", badge_name=badge_def["name"])
    return True


async def track_login_streak(user_id: str) -> int:
    """Increment daily login streak and grant streak badges."""
    user = await db.users.find_one({"user_id": user_id}, {"last_login_date": 1, "login_streak": 1})
    if not user:
        return 0
    today = now_utc().date().isoformat()
    if user.get("last_login_date") == today:
        return user.get("login_streak", 1)
    yesterday = (now_utc() - timedelta(days=1)).date().isoformat()
    streak = (user.get("login_streak", 0) + 1) if user.get("last_login_date") == yesterday else 1
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"last_login_date": today, "login_streak": streak}},
    )
    if streak >= 7:
        await grant_badge(user_id, "daily_streak_7")
    if streak >= 30:
        await grant_badge(user_id, "daily_streak_30")
    return streak


async def check_chatter_badges(user_id: str):
    """Grant participation badges based on Nexus chat messages written."""
    count = await db.nexus_messages.count_documents({"user_id": user_id})
    if count >= 100:
        await grant_badge(user_id, "chatter_100")
    if count >= 1000:
        await grant_badge(user_id, "chatter_1000")
    if count >= 10000:
        await grant_badge(user_id, "chatter_10000")


async def check_hall_of_legends(user_id: str):
    """Top 10 mondial XP — badge réservé à un classement réel (pas en base vide / dev)."""
    total_users = await db.users.count_documents({})
    if total_users < 10:
        return

    hero = await db.users.find_one({"user_id": user_id}, {"xp": 1})
    if not hero or hero.get("xp", 0) <= 0:
        return

    ranked = await db.users.find(
        {"xp": {"$gt": 0}},
        {"user_id": 1, "xp": 1},
    ).sort("xp", -1).limit(10).to_list(10)

    # Hall complet uniquement : au moins 10 héros classés avec de l'XP
    if len(ranked) < 10:
        return

    if any(u["user_id"] == user_id for u in ranked):
        await grant_badge(user_id, "hall_of_legends")


async def on_nexus_chat_message(user_id: str, channel: str):
    """Persist Nexus chat and evaluate chatter badges (whispers excluded)."""
    if channel == "whisper":
        return
    await db.nexus_messages.insert_one({
        "user_id": user_id,
        "channel": channel,
        "created_at": now_utc().isoformat(),
    })
    await check_chatter_badges(user_id)


async def on_boss_defeated(user_ids: list):
    for uid in user_ids:
        await grant_badge(uid, "boss_slayer")


async def on_nexus_join(user_id: str):
    await progress_quests(user_id, "nexus_enter", 1)


async def touch_user_last_seen(user_id: str, min_interval_seconds: int = 300):
    """Throttled visit heartbeat (default max once per 5 minutes per user)."""
    now = now_utc()
    user = await db.users.find_one({"user_id": user_id}, {"last_seen": 1})
    if not user:
        return
    last = user.get("last_seen")
    if last:
        try:
            last_dt = datetime.fromisoformat(last) if isinstance(last, str) else last
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            if (now - last_dt).total_seconds() < min_interval_seconds:
                return
        except Exception:
            pass
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"last_seen": now.isoformat()}},
    )


def _current_quest_periods() -> set:
    """Valid period keys for active daily/weekly/monthly quests."""
    now = now_utc()
    return {
        now.date().isoformat(),
        now.strftime("%Y-W%U"),
        now.strftime("%Y-%m"),
    }


async def count_site_online() -> int:
    """Users with a valid session active in the last 5 minutes."""
    now = now_utc()
    cutoff = (now - timedelta(minutes=5)).isoformat()
    now_iso = now.isoformat()
    try:
        return len(await db.user_sessions.distinct("user_id", {
            "expires_at": {"$gt": now_iso},
            "$or": [
                {"last_activity_at": {"$gt": cutoff}},
                {"last_activity_at": {"$exists": False}, "created_at": {"$gt": cutoff}},
            ],
        }))
    except Exception:
        return 0


async def get_active_boost_multiplier(user_id: str, boost_type: str) -> float:
    """Return active boost multiplier (1.0 = none). Uses max if several overlap.
    VIP « Pass Ascendant » stacks a +10% bonus on top for XP & écus gains."""
    now_iso = now_utc().isoformat()
    boosts = await db.user_boosts.find({
        "user_id": user_id,
        "boost_type": boost_type,
        "expires_at": {"$gt": now_iso},
    }, {"boost_value": 1}).to_list(10)
    base = max((float(b.get("boost_value", 1)) for b in boosts), default=1.0)

    # VIP bonus on XP and écus (aether) gains only.
    if boost_type in ("xp_multiplier", "aether_multiplier"):
        vip_user = await db.users.find_one({"user_id": user_id}, {"vip_until": 1, "_id": 0})
        if is_vip_active(vip_user or {}):
            base *= VIP_BONUS_MULTIPLIER
    return base


async def maybe_process_daily_login(user_id: str):
    """Once per calendar day: login quest + streak (any page, not only /hero)."""
    today = now_utc().date().isoformat()
    user = await db.users.find_one({"user_id": user_id}, {"last_daily_quest_date": 1})
    if not user or user.get("last_daily_quest_date") == today:
        return
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"last_daily_quest_date": today}},
    )
    await progress_quests(user_id, "login", 1)
    await track_login_streak(user_id)
    # Passive aether from kingdom perks (same logic as daily-login endpoint)
    fresh = await db.users.find_one({"user_id": user_id}, {"last_passive_aether_date": 1})
    if fresh and fresh.get("last_passive_aether_date") != today:
        perks = await db.user_perks.find({"user_id": user_id}, {"sku": 1}).to_list(50)
        skus = {p.get("sku") for p in perks}
        passive = 0
        if "kingdom_aether_mine" in skus:
            passive += 50
        if "kingdom_treasury" in skus:
            passive += 200
        if passive > 0:
            await grant_aether(user_id, passive, "Écus passifs quotidiens")
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"last_passive_aether_date": today}},
            )

    # Coffre quotidien VIP — bonus d'écus une fois par jour pour les membres VIP.
    vu = await db.users.find_one({"user_id": user_id}, {"vip_until": 1, "last_vip_chest_date": 1})
    if vu and is_vip_active(vu) and vu.get("last_vip_chest_date") != today:
        await db.users.update_one({"user_id": user_id}, {"$set": {"last_vip_chest_date": today}})
        await grant_aether(user_id, VIP_DAILY_BONUS_AETHER, "Coffre quotidien VIP")
        await push_notification(
            db, user_id, "vip",
            "Coffre quotidien VIP", f"+{VIP_DAILY_BONUS_AETHER} écus du Nexus offerts par ton Pass Ascendant.",
            "coin", "Gem", link="/shop",
        )


async def reconcile_user_progress(user_id: str):
    """Fix XP/level desync when level was set manually above XP-derived level."""
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        return
    lvl = user.get("level", 1)
    xp = user.get("xp", 0)
    floor = xp_for_level(lvl) if lvl >= 2 else 0
    if level_from_xp(xp) < lvl:
        await db.users.update_one({"user_id": user_id}, {"$set": {"xp": max(xp, floor)}})


async def grant_xp(user_id: str, amount: int, reason: str = ""):
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        return
    if amount > 0:
        mult = await get_active_boost_multiplier(user_id, "xp_multiplier")
        if mult > 1:
            amount = int(amount * mult)
    old_level = user.get("level", 1)
    old_xp = user.get("xp", 0)
    # Keep admin-granted levels: anchor XP to the floor for the stored level
    xp_floor = xp_for_level(old_level) if old_level >= 2 else 0
    if level_from_xp(old_xp) < old_level:
        old_xp = max(old_xp, xp_floor)
    new_xp = old_xp + amount
    new_level = level_from_xp(new_xp)
    new_rank = rank_from_level(new_level)
    update = {"xp": new_xp, "level": new_level, "rank": new_rank}
    level_up_info = None
    skill_gained = 0
    tier_changed = None
    if new_level > old_level:
        skill_gained = new_level - old_level
        update["skill_points"] = user.get("skill_points", 0) + skill_gained
        old_tier = discord_sync.progression_tier_from_level(old_level)
        new_tier = discord_sync.progression_tier_from_level(new_level)
        tier_changed = new_tier if new_tier != old_tier else None
        level_up_info = {"old": old_level, "new": new_level, "rank": new_rank, "tier": tier_changed}
        await add_chronicle(user_id, f"A atteint le niveau {new_level} — Rang {new_rank}", "level_up")
        discord_rewards.schedule_levelup(db, user_id, new_level, new_rank)
        if tier_changed:
            discord_sync.schedule_sync(db, user_id)
    await db.users.update_one({"user_id": user_id}, {"$set": update})
    if amount > 0:
        discord_rewards.schedule_reward_notify(
            db, user_id, reason or "gain_xp",
            xp=amount,
            skill_points=skill_gained,
            level_up=level_up_info,
        )
    if new_level >= 50:
        await grant_badge(user_id, "class_master")
    if amount > 0:
        await check_hall_of_legends(user_id)
    # Mirror to active season score (idempotent upsert)
    active_season = await db.seasons.find_one({"active": True}, {"_id": 0, "season_id": 1})
    if active_season:
        await db.season_scores.update_one(
            {"season_id": active_season["season_id"], "user_id": user_id},
            {"$inc": {"season_xp": amount},
             "$setOnInsert": {"first_seen_at": now_utc().isoformat()}},
            upsert=True,
        )
    await push_wallet_updated(user_id)
    if amount > 0:
        await progress_quests(user_id, "xp", amount)


async def push_wallet_updated(user_id: str):
    """Push aether/level/xp to client in real time (no page reload)."""
    try:
        doc = await db.users.find_one({"user_id": user_id})
        if not doc:
            return
        pu = public_user(doc)
        await nexus_world.push_profile_updated(user_id, {
            "user_id": user_id,
            "aether": pu.get("aether", 0),
            "level": pu.get("level", 1),
            "xp": pu.get("xp", 0),
            "rank": pu.get("rank", "Novice"),
            "skill_points": pu.get("skill_points", 0),
            "xp_pct": pu.get("xp_pct", 0),
        })
    except Exception:
        pass


async def grant_aether(user_id: str, amount: int, reason: str = "Récompense"):
    if amount <= 0:
        return
    mult = await get_active_boost_multiplier(user_id, "aether_multiplier")
    if mult > 1:
        amount = int(amount * mult)
    await db.users.update_one({"user_id": user_id}, {"$inc": {"aether": amount}})
    await push_wallet_updated(user_id)
    discord_rewards.schedule_reward_notify(db, user_id, reason, aether=amount)


async def spend_aether(user_id: str, amount: int, reason: str = "Dépense"):
    if amount <= 0:
        return
    await db.users.update_one({"user_id": user_id}, {"$inc": {"aether": -amount}})
    await push_wallet_updated(user_id)
    discord_rewards.schedule_reward_notify(db, user_id, reason, aether=-amount)


async def grant_reputation(user_id: str, amount: int, reason: str = "gain_reputation"):
    if amount <= 0:
        return
    await db.users.update_one({"user_id": user_id}, {"$inc": {"reputation": amount}})
    discord_rewards.schedule_reward_notify(db, user_id, reason, reputation=amount)


async def progress_quests(user_id: str, action: str, amount: int = 1):
    """Advance active quests matching the action (current period only)."""
    valid_periods = _current_quest_periods()
    quests = await db.user_quests.find({"user_id": user_id, "action": action, "completed": False}).to_list(100)
    for q in quests:
        if q.get("period") not in valid_periods:
            continue
        new_progress = q.get("progress", 0) + amount
        completed = new_progress >= q["target"]
        update = {"progress": new_progress, "completed": completed}
        if completed:
            update["completed_at"] = now_utc().isoformat()
            await db.user_quests.update_one({"_id": q["_id"]}, {"$set": update})
            await grant_xp(user_id, q["xp"], f"quest:{q['quest_id']}")
            await grant_aether(user_id, q["aether"], f"Quête : {q.get('name', q['quest_id'])}")
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


async def open_chest(user_id: str, min_rarity: str = None, luck_boost: float = 1.0):
    """Generate 1-3 random items. Respects inventory slot limit and luck boosts.

    `min_rarity` forces every generated item to be at least that rarity (premium
    chests/keys honor their guaranteed-rarity descriptions). `luck_boost` further
    skews the roll toward high rarities for upgraded chests.
    """
    slot_limit = await inventory_slot_limit(user_id)
    owned_count = await db.inventory.count_documents({"user_id": user_id})
    if owned_count >= slot_limit:
        raise HTTPException(400, f"Inventaire plein ({slot_limit} emplacements max). Achetez des extensions au royaume.")
    items = []
    count = _secure_weighted_choice([1, 2, 3], [60, 30, 10])
    count = min(count, slot_limit - owned_count)
    if count <= 0:
        raise HTTPException(400, "Inventaire plein")
    # Preload owned (name, rarity) pairs for this user once.
    owned_docs = await db.inventory.find(
        {"user_id": user_id}, {"_id": 0, "name": 1, "rarity": 1}
    ).to_list(1000)
    owned_set = {(d["name"], d["rarity"]) for d in owned_docs}

    rarity_ids = list(RARITIES.keys())
    # Apply a rarity floor when requested (e.g. Clé Cosmique → Épique+).
    if min_rarity and min_rarity in rarity_ids:
        floor_idx = rarity_ids.index(min_rarity)
        rarity_ids = rarity_ids[floor_idx:]
    base_weights = [RARITIES[r]["weight"] for r in rarity_ids]
    luck_mult = await get_active_boost_multiplier(user_id, "luck")
    if luck_boost and luck_boost > 1:
        luck_mult *= luck_boost
    high_rarities = {"epic", "legendary", "mythic", "divine", "cosmic"}
    weights = [
        w * luck_mult if r in high_rarities else w
        for r, w in zip(rarity_ids, base_weights)
    ]

    attempts = 0
    while len(items) < count and attempts < count * 6:
        attempts += 1
        rarity = _secure_weighted_choice(rarity_ids, weights)
        # Filter templates NOT already owned, of this rarity
        candidates = [t for t in ITEM_TEMPLATES if t["rarity"] == rarity and (t["name"], t["rarity"]) not in owned_set]
        if not candidates:
            # try any allowed rarity not owned (respect the rarity floor when set)
            candidates = [t for t in ITEM_TEMPLATES if t["rarity"] in rarity_ids and (t["name"], t["rarity"]) not in owned_set]
            if not candidates:
                break  # User owns everything in range — stop, return what we have
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
    username: str = Field(..., min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=6)
    class_id: str
    referral_code: Optional[str] = None


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordReq(BaseModel):
    email: EmailStr


class ResetPasswordReq(BaseModel):
    token: str = Field(..., min_length=16)
    password: str = Field(..., min_length=6)


class DiscordExchangeReq(BaseModel):
    code: str = Field(..., min_length=1)
    referral_code: Optional[str] = None


DISCORD_SIGNUP_XP_BONUS = int(os.environ.get("DISCORD_SIGNUP_XP_BONUS", "75"))
DISCORD_SIGNUP_BADGE_ID = "discord_herald"
# Discord role granted to heroes who reach the 25-referral milestone (optional).
DISCORD_AMBASSADOR_ROLE_ID = os.environ.get("DISCORD_AMBASSADOR_ROLE_ID", "").strip()

# ----- Parrainage (referral) configuration -----
# Milestones are cumulative and each is granted exactly once.
REFERRAL_AETHER_REWARD = 50  # « Écus du Nexus » accordés au 1er filleul
REFERRAL_MILESTONES = [
    {"threshold": 1,  "type": "aether", "amount": REFERRAL_AETHER_REWARD,
     "label": f"+{REFERRAL_AETHER_REWARD} Écus du Nexus"},
    {"threshold": 3,  "type": "badge",  "badge_id": "recruteur",       "label": "Badge Recruteur"},
    {"threshold": 5,  "type": "aether", "amount": 150,                  "label": "+150 Écus (palier 5)"},
    {"threshold": 10, "type": "title",  "title_id": "ambassadeur_nexus","label": "Titre Ambassadeur du Nexus"},
    {"threshold": 15, "type": "badge",  "badge_id": "mentor_heroe",     "label": "Badge Mentor des Héros"},
    {"threshold": 25, "type": "discord_role",                            "label": "Rôle Discord Ambassadeur"},
    {"threshold": 50, "type": "multi",  "badge_id": "parrain_legendaire","amount": 500,
     "label": "Badge Parrain Légendaire + 500 Écus"},
]


def _gen_referral_code() -> str:
    return "NX" + uuid.uuid4().hex[:6].upper()


async def get_or_create_referral_code(user_id: str) -> str:
    user = await db.users.find_one({"user_id": user_id}, {"referral_code": 1, "_id": 0})
    if user and user.get("referral_code"):
        return user["referral_code"]
    # Generate a unique code
    for _ in range(8):
        code = _gen_referral_code()
        if not await db.users.find_one({"referral_code": code}):
            await db.users.update_one({"user_id": user_id}, {"$set": {"referral_code": code}})
            return code
    # Fallback (extremely unlikely): derive from user_id
    code = ("NX" + user_id.replace("-", "")[:6]).upper()
    await db.users.update_one({"user_id": user_id}, {"$set": {"referral_code": code}})
    return code


async def process_referral_rewards(referrer_id: str):
    """Grant any milestone rewards the referrer has newly earned. Idempotent."""
    referrer = await db.users.find_one({"user_id": referrer_id})
    if not referrer:
        return
    count = int(referrer.get("referral_count", 0) or 0)
    claimed = set(referrer.get("referral_rewards_claimed", []) or [])
    for ms in REFERRAL_MILESTONES:
        th = ms["threshold"]
        if count < th or th in claimed:
            continue
        if ms["type"] == "aether":
            await grant_aether(referrer_id, ms["amount"], "Parrainage — premier filleul")
            await push_notification(
                db, referrer_id, "referral",
                "Récompense de parrainage", ms["label"], "coin", "Coins", link="/parrainage",
            )
        elif ms["type"] == "badge":
            await grant_badge(referrer_id, ms["badge_id"])
        elif ms["type"] == "title":
            await db.user_titles.update_one(
                {"user_id": referrer_id, "title_id": ms["title_id"]},
                {"$set": {"user_id": referrer_id, "title_id": ms["title_id"],
                          "obtained_at": now_utc().isoformat(), "source": "referral"}},
                upsert=True,
            )
            await push_notification(
                db, referrer_id, "referral",
                "Titre débloqué", ms["label"], "fanfare", "Crown", link="/parrainage",
            )
        elif ms["type"] == "discord_role":
            if DISCORD_AMBASSADOR_ROLE_ID:
                discord_sync.schedule_extra_role(
                    db, referrer_id, DISCORD_AMBASSADOR_ROLE_ID, "NEXORIA — Ambassadeur (25 parrainages)")
            await push_notification(
                db, referrer_id, "referral",
                "Rôle Discord Ambassadeur", "Ton statut d'Ambassadeur t'a octroyé un rôle Discord exclusif.",
                "fanfare", "MessageSquare", link="/settings?section=parrainage",
            )
        elif ms["type"] == "multi":
            # Grant both écus and badge in one milestone.
            if ms.get("amount"):
                await grant_aether(referrer_id, ms["amount"], "Parrainage — palier 50")
            if ms.get("badge_id"):
                await grant_badge(referrer_id, ms["badge_id"])
            await push_notification(
                db, referrer_id, "referral",
                "Parrain Légendaire !", ms["label"],
                "fanfare", "Crown", link="/settings?section=parrainage",
            )
        claimed.add(th)
    await db.users.update_one(
        {"user_id": referrer_id},
        {"$set": {"referral_rewards_claimed": sorted(claimed)}},
    )


async def apply_referral(referral_code: str, referred_user_id: str):
    """Link a freshly-created account to its referrer and process rewards.
    Safe to call with an invalid/empty code (no-op)."""
    code = (referral_code or "").strip().upper()
    if not code:
        return
    referrer = await db.users.find_one({"referral_code": code}, {"user_id": 1, "_id": 0})
    if not referrer:
        return
    referrer_id = referrer["user_id"]
    if referrer_id == referred_user_id:
        return
    # Prevent double-counting if the referred user was already attributed.
    existing = await db.referrals.find_one({"referred_id": referred_user_id})
    if existing:
        return
    await db.referrals.insert_one({
        "referrer_id": referrer_id,
        "referred_id": referred_user_id,
        "code": code,
        "created_at": now_utc().isoformat(),
    })
    await db.users.update_one({"user_id": referrer_id}, {"$inc": {"referral_count": 1}})
    await db.users.update_one({"user_id": referred_user_id}, {"$set": {"referred_by": referrer_id}})
    await process_referral_rewards(referrer_id)


# Pionniers : récompense réservée aux 100 premiers inscrits à partir de maintenant.
FOUNDER_MAX = 100
FOUNDER_BADGE_ID = "pionnier_nexus"
FOUNDER_XP_REWARD = 1000


async def claim_founder_reward(user_id: str):
    """Grant the exclusive Pioneer badge + XP to the first FOUNDER_MAX new accounts.
    Uses an atomic counter so concurrent signups can't exceed the cap."""
    try:
        counter = await db.counters.find_one_and_update(
            {"_id": "founder_members"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        seq = int((counter or {}).get("seq", 0))
        if seq <= 0 or seq > FOUNDER_MAX:
            return
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"founder_number": seq, "is_founder": True}},
        )
        await grant_badge(user_id, FOUNDER_BADGE_ID)
        await grant_xp(user_id, FOUNDER_XP_REWARD, "Pionnier du Nexus")
        await add_chronicle(
            user_id,
            f"Pionnier du Nexus n°{seq} — parmi les {FOUNDER_MAX} premiers héros !",
            "creation",
        )
        try:
            await push_notification(
                db, user_id, "founder",
                "Pionnier du Nexus",
                f"Tu fais partie des {FOUNDER_MAX} premiers héros (n°{seq}) : badge exclusif + {FOUNDER_XP_REWARD} XP offerts !",
                "fanfare", "Flag", link="/hero",
            )
        except Exception:
            pass
        logger.info("Founder reward granted: user=%s number=%s", user_id, seq)
    except Exception as e:  # noqa: BLE001
        logger.warning("claim_founder_reward failed for %s: %s", user_id, e)


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


async def has_user_perk(user_id: str, perk: str) -> bool:
    rows = await db.user_perks.find({"user_id": user_id}, {"sku": 1, "perk": 1}).to_list(100)
    for row in rows:
        if row.get("perk") == perk:
            return True
        item = get_shop_item(row.get("sku", ""))
        if item and item.get("perk") == perk:
            return True
    return False


async def inventory_slot_limit(user_id: str) -> int:
    base = 100
    rows = await db.user_perks.find({"user_id": user_id}, {"sku": 1}).to_list(50)
    extra = sum(10 for r in rows if r.get("sku") == "kingdom_inventory_slot")
    return base + extra


@api.get("/game/titles")
async def get_titles(user: dict = Depends(get_user_dep)):
    owned = await db.user_titles.find({"user_id": user["user_id"]}, {"title_id": 1}).to_list(50)
    owned_ids = {r.get("title_id") for r in owned if r.get("title_id")}
    out = []
    for t in TITLES:
        shop_only = t["id"] in SHOP_ONLY_TITLES
        requires_ownership = shop_only or t["id"] in REFERRAL_TITLES or t["id"] in VIP_TITLES
        if requires_ownership:
            unlocked = t["id"] in owned_ids
        else:
            unlocked = user.get("level", 1) >= t["unlock_level"]
        out.append({**t, "shop_only": shop_only, "unlocked": unlocked})
    return out


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
async def _email_taken(email: str) -> bool:
    return bool(await db.users.find_one({"email": email.lower().strip()}))


async def _username_taken(username: str) -> bool:
    un = (username or "").strip()
    if not un:
        return False
    return bool(await db.users.find_one({
        "username": {"$regex": f"^{re.escape(un)}$", "$options": "i"},
    }))


async def find_user_by_username(username: str, fields: dict | None = None):
    """Recherche un héros par pseudo (insensible à la casse, espaces ignorés)."""
    un = (username or "").strip()
    if not un:
        return None
    projection = {"_id": 0}
    if fields:
        projection.update(fields)
    return await db.users.find_one({
        "username": {"$regex": f"^{re.escape(un)}$", "$options": "i"},
    }, projection)


@api.get("/auth/check-availability")
async def check_availability(email: str = "", username: str = ""):
    """Vérifie si email / pseudo sont déjà pris (insensible à la casse pour le pseudo)."""
    email_ok = True
    username_ok = True
    if email.strip():
        email_ok = not await _email_taken(email)
    if username.strip():
        username_ok = not await _username_taken(username)
    return {"email_available": email_ok, "username_available": username_ok}


@api.post("/auth/register")
async def register(req: RegisterReq, response: Response):
    email = req.email.lower().strip()
    username = req.username.strip()
    if req.class_id not in CLASSES:
        raise HTTPException(400, "Classe invalide")
    if await _email_taken(email):
        raise HTTPException(400, "Email déjà utilisé")
    if await _username_taken(username):
        raise HTTPException(400, "Pseudo déjà pris")

    user_id = generate_user_id()
    cls = CLASSES[req.class_id]
    user_doc = {
        "user_id": user_id,
        "email": email,
        "username": username,
        "password_hash": hash_password(req.password),
        "class_id": req.class_id,
        "class_name": cls["name"],
        "secondary_class_id": None,
        "avatar_url": None,
        "banner_url": None,
        "bio": "",
        "story": "",
        "quote": "",
        "display_name": "",
        "status_message": "",
        "pronouns": "",
        "location": "",
        "website_url": "",
        "social_links": {},
        "profile_accent": "#7B2FF7",
        "featured_badge_id": None,
        "profile_show_stats": True,
        "profile_show_dna": True,
        "profile_show_chronicle": True,
        "profile_visibility": "public",
        "profile_hide_hero_card": False,
        "level": 1,
        "xp": 0,
        "rank": "Novice",
        "reputation": 0,
        "aether": 100,
        "skill_points": 1,
        "active_title": "novice",
        "role": "admin" if username.lower() == OWNER_USERNAME.lower() else "user",
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
        "last_activity_at": now_utc().isoformat(),
    })
    set_session_cookie(response, token)

    await touch_user_last_seen(user_id)
    await add_chronicle(user_id, f"Le héros {username} ({cls['name']}) a rejoint NEXORIA", "creation")
    discord_auth_forum.schedule_auth_event("register", user_doc)

    if req.referral_code:
        try:
            await apply_referral(req.referral_code, user_id)
        except Exception as e:
            logger.warning(f"referral attribution failed: {e}")

    await claim_founder_reward(user_id)

    result = public_user(user_doc)
    result["session_token"] = token
    return result


@api.get("/referral/me")
async def referral_me(request: Request, user: dict = Depends(get_user_dep)):
    """Return the current hero's referral code, link, count and milestone ladder."""
    code = await get_or_create_referral_code(user["user_id"])
    fresh = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"referral_count": 1, "referral_rewards_claimed": 1, "_id": 0},
    ) or {}
    count = int(fresh.get("referral_count", 0) or 0)
    claimed = set(fresh.get("referral_rewards_claimed", []) or [])
    # Build a public-facing register link with the ref code.
    origin = request.headers.get("origin") or os.environ.get("PUBLIC_SITE_URL", "")
    link = f"{origin.rstrip('/')}/register?ref={code}" if origin else f"/register?ref={code}"
    milestones = [
        {
            "threshold": ms["threshold"],
            "label": ms["label"],
            "claimed": ms["threshold"] in claimed,
            "reached": count >= ms["threshold"],
        }
        for ms in REFERRAL_MILESTONES
    ]
    return {
        "code": code,
        "link": link,
        "count": count,
        "milestones": milestones,
    }


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
        "last_activity_at": now_utc().isoformat(),
    })
    set_session_cookie(response, token)
    await touch_user_last_seen(user["user_id"])
    discord_auth_forum.schedule_auth_event("login", user)
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
    user_doc = None
    user_id = None
    if token:
        session = await db.user_sessions.find_one({"session_token": token})
        if session:
            user_id = session.get("user_id")
            user_doc = await db.users.find_one(
                {"user_id": user_id},
                {"username": 1},
            )
        await db.user_sessions.delete_one({"session_token": token})
    clear_session_cookie(response)
    if user_id:
        try:
            await nexus_world.disconnect_user(user_id)
        except Exception as e:
            logger.warning("nexus disconnect on logout failed: %s", e)
    if user_doc:
        discord_auth_forum.schedule_auth_event("logout", user_doc)
    return {"ok": True}


@api.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordReq):
    """Demande de réinitialisation — réponse identique que l'email existe ou non."""
    email = req.email.lower().strip()
    generic = {
        "ok": True,
        "message": "Si un compte avec mot de passe existe pour cet email, un lien de réinitialisation a été généré.",
    }
    user = await db.users.find_one({"email": email}, {"user_id": 1, "password_hash": 1})
    if not user or not user.get("password_hash"):
        return generic

    token = _secrets.token_urlsafe(32)
    now = now_utc()
    await db.password_reset_tokens.insert_one({
        "token": token,
        "user_id": user["user_id"],
        "email": email,
        "expires_at": (now + timedelta(hours=1)).isoformat(),
        "used_at": None,
        "created_at": now.isoformat(),
    })
    frontend = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    reset_link = f"{frontend}/reset-password?token={token}"
    logger.info("Password reset requested for %s — link: %s", email, reset_link)
    out = {**generic}
    if os.environ.get("PASSWORD_RESET_EXPOSE_LINK", "").lower() in ("1", "true", "yes"):
        out["reset_link"] = reset_link
    return out


@api.post("/auth/reset-password")
async def reset_password(req: ResetPasswordReq):
    doc = await db.password_reset_tokens.find_one({"token": req.token})
    if not doc or doc.get("used_at"):
        raise HTTPException(400, "Lien de réinitialisation invalide ou expiré")
    try:
        exp = datetime.fromisoformat(doc["expires_at"])
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(400, "Lien de réinitialisation invalide")
    if exp < now_utc():
        raise HTTPException(400, "Lien de réinitialisation expiré")
    pwd_hash = hash_password(req.password)
    await db.users.update_one(
        {"user_id": doc["user_id"]},
        {"$set": {"password_hash": pwd_hash}},
    )
    used_at = now_utc().isoformat()
    await db.password_reset_tokens.update_one(
        {"token": req.token},
        {"$set": {"used_at": used_at}},
    )
    await db.password_reset_tokens.update_many(
        {"user_id": doc["user_id"], "used_at": None},
        {"$set": {"used_at": used_at}},
    )
    await db.user_sessions.delete_many({"user_id": doc["user_id"]})
    return {"ok": True, "message": "Mot de passe mis à jour — vous pouvez vous connecter."}


@api.get("/auth/me")
async def me(user: dict = Depends(get_user_dep)):
    await touch_user_last_seen(user["user_id"])
    await maybe_process_daily_login(user["user_id"])
    await reconcile_user_progress(user["user_id"])
    fresh = await db.users.find_one({"user_id": user["user_id"]})
    return public_user(fresh or user)


@api.post("/auth/heartbeat")
async def auth_heartbeat(user: dict = Depends(get_user_dep)):
    """Lightweight activity ping while the user is on the site."""
    await touch_user_last_seen(user["user_id"], min_interval_seconds=60)
    return {"ok": True}


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
    is_new_google_account = False
    if user:
        # Reject banned user before creating session
        enforce_ban_or_raise(user)
    if not user:
        is_new_google_account = True
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
            "role": "admin" if username == OWNER_USERNAME else "user",
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
        "last_activity_at": now_utc().isoformat(),
        "provider": "google",
    })
    set_session_cookie(response, emergent_token)
    await touch_user_last_seen(user["user_id"])
    await maybe_process_daily_login(user["user_id"])
    if is_new_google_account:
        discord_auth_forum.schedule_auth_event("register", user)
        await claim_founder_reward(user["user_id"])
    else:
        discord_auth_forum.schedule_auth_event("login", user)
    result = public_user(user)
    result["session_token"] = emergent_token
    return result


# ---------- Profile ----------
async def _resolve_viewer(request: Request):
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        return None
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    return await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0, "password_hash": 0, "email": 0},
    )


async def _profile_visible_to(viewer: dict | None, target_user: dict) -> bool:
    visibility = target_user.get("profile_visibility", "public")
    if viewer and viewer["user_id"] == target_user["user_id"]:
        return True
    if viewer and viewer.get("role") in ("admin", "moderator"):
        return True
    if visibility == "private":
        return False
    if visibility == "friends":
        return bool(viewer and await _are_friends(viewer["user_id"], target_user["user_id"]))
    return True


async def _hero_card_visible_to(viewer: dict | None, target_user: dict) -> bool:
    if not target_user.get("profile_hide_hero_card"):
        return True
    return await _profile_visible_to(viewer, target_user)


class ProfileUpdateReq(BaseModel):
    bio: Optional[str] = Field(None, max_length=500)
    story: Optional[str] = Field(None, max_length=3000)
    quote: Optional[str] = Field(None, max_length=200)
    avatar_url: Optional[str] = Field(None, max_length=512)
    banner_url: Optional[str] = Field(None, max_length=512)
    display_name: Optional[str] = Field(None, max_length=32)
    status_message: Optional[str] = Field(None, max_length=140)
    pronouns: Optional[str] = Field(None, max_length=24)
    location: Optional[str] = Field(None, max_length=64)
    website_url: Optional[str] = Field(None, max_length=256)
    social_links: Optional[dict] = None
    profile_accent: Optional[str] = Field(None, max_length=7)
    featured_badge_id: Optional[str] = None
    profile_show_stats: Optional[bool] = None
    profile_show_dna: Optional[bool] = None
    profile_show_chronicle: Optional[bool] = None
    profile_visibility: Optional[str] = None
    profile_hide_hero_card: Optional[bool] = None
    secondary_class_id: Optional[str] = None
    class_id: Optional[str] = None
    active_banner: Optional[str] = None   # SKU of equipped banner cosmetic
    active_frame: Optional[str] = None    # SKU of equipped frame cosmetic
    active_aura_sku: Optional[str] = None # SKU of equipped shop aura
    active_mount: Optional[str] = None    # SKU of equipped mount
    language: Optional[str] = None        # User-selected language code
    theme: Optional[str] = None           # UI theme: dark/midnight/amethyst
    staff_nexus_auto_connect: Optional[bool] = None  # Staff: auto-join Nexus socket on login (legacy)
    nexus_auto_connect: Optional[bool] = None  # All users: auto-join Nexus ONLINE on login
    appear_offline: Optional[bool] = None  # Hide online presence (site + Nexus) for all users


@api.get("/users/search")
async def search_users(q: str, user: dict = Depends(get_user_dep)):
    q = (q or "").strip()
    if len(q) < 2:
        return []
    regex = {"$regex": re.escape(q), "$options": "i"}
    docs = await db.users.find(
        {"$or": [{"username": regex}, {"display_name": regex}]},
        {"_id": 0, "user_id": 1, "username": 1, "display_name": 1, "level": 1, "avatar_url": 1, "class_name": 1, "role": 1},
    ).sort("level", -1).limit(8).to_list(8)
    return [public_user(d) for d in docs]


@api.put("/profile")
async def update_profile(req: ProfileUpdateReq, user: dict = Depends(get_user_dep)):
    raw = req.model_dump()
    update = {k: v for k, v in raw.items() if v is not None}
    unset_fields = []
    for cosmetic_key in ("active_banner", "active_frame", "active_aura_sku", "active_mount"):
        if cosmetic_key in raw and raw[cosmetic_key] in (None, ""):
            unset_fields.append(cosmetic_key)
            update.pop(cosmetic_key, None)
    if "profile_accent" in update:
        accent = update["profile_accent"]
        if accent and not re.match(r"^#[0-9A-Fa-f]{6}$", accent):
            raise HTTPException(400, "Couleur d'accent invalide (format #RRGGBB)")
    if "profile_visibility" in update:
        if update["profile_visibility"] not in ("public", "friends", "private"):
            raise HTTPException(400, "Visibilité invalide")
    if "featured_badge_id" in update:
        badge_id = update["featured_badge_id"]
        if badge_id:
            owned = await db.user_badges.find_one({"user_id": user["user_id"], "badge_id": badge_id})
            if not owned:
                raise HTTPException(400, "Badge non débloqué")
        else:
            update["featured_badge_id"] = None
    if "social_links" in update and update["social_links"] is not None:
        allowed = {"twitter", "twitch", "youtube"}
        update["social_links"] = {k: str(v)[:128] for k, v in update["social_links"].items() if k in allowed and v}
    class_change_inc = {}
    if "class_id" in update:
        if update["class_id"] not in CLASSES:
            raise HTTPException(400, "Classe invalide")
        update["class_name"] = CLASSES[update["class_id"]]["name"]
        # Gate real class changes: 1 free change for everyone, then requires
        # « Parchemin de Mutation » credits (3 per purchase). The initial class
        # selection (needs_class_selection) and no-op re-selection are free.
        current_class = user.get("class_id")
        is_initial = bool(user.get("needs_class_selection"))
        is_real_change = (not is_initial) and update["class_id"] != current_class
        if is_real_change:
            free_used = int(user.get("class_changes_used", 0) or 0)
            credits = int(user.get("class_change_credits", 0) or 0)
            if free_used >= 1 and credits <= 0:
                raise HTTPException(403, "Vous avez déjà utilisé votre changement de classe gratuit. Achetez un « Parchemin de Mutation » à la boutique (3 changements).")
            class_change_inc["class_changes_used"] = 1
            if free_used >= 1:
                class_change_inc["class_change_credits"] = -1
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
    if "active_aura_sku" in update and update["active_aura_sku"]:
        owned = await db.user_auras.find_one({"user_id": user["user_id"], "sku": update["active_aura_sku"]})
        if not owned:
            raise HTTPException(400, "Cette aura n'a pas été acquise")
    if "active_mount" in update and update["active_mount"]:
        owned = await db.user_mounts.find_one({"user_id": user["user_id"], "sku": update["active_mount"]})
        if not owned:
            raise HTTPException(400, "Cette monture n'a pas été acquise")
    VALID_THEMES = {"dark", "midnight", "amethyst"}
    if "theme" in update and update["theme"] not in VALID_THEMES:
        raise HTTPException(400, "Thème invalide")
    VALID_LANGUAGES = {"fr", "en", "es", "de", "it", "pt", "nl", "ja"}
    if "language" in update and update["language"] not in VALID_LANGUAGES:
        raise HTTPException(400, "Langue invalide")
    if "staff_nexus_auto_connect" in update:
        if user.get("role") not in ("admin", "moderator"):
            update.pop("staff_nexus_auto_connect", None)
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

    ops = {}
    if update:
        ops["$set"] = update
    if unset_fields:
        ops["$unset"] = {f: "" for f in unset_fields}
    if class_change_inc:
        ops["$inc"] = class_change_inc
    if ops:
        await db.users.update_one({"user_id": user["user_id"]}, ops)

    # Real-time profile sync (Nexus cosmetics / title / aura)
    cosmetic_fields = {k: update[k] for k in (
        "active_banner", "active_frame", "active_aura_sku", "active_mount", "active_title", "avatar_url",
    ) if k in update}
    if "active_banner" in unset_fields:
        cosmetic_fields["active_banner"] = None
    if cosmetic_fields:
        try:
            await nexus_world.push_profile_updated(user["user_id"], cosmetic_fields)
        except Exception:
            pass

    # Online presence toggle — apply live to any connected Nexus session.
    if "appear_offline" in update:
        try:
            await nexus_world.set_presence_hidden(user["user_id"], update["appear_offline"])
        except Exception:
            pass

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
async def get_profile_by_username(username: str, request: Request):
    user = await db.users.find_one({"username": username}, {"_id": 0, "password_hash": 0, "email": 0})
    if not user:
        raise HTTPException(404, "Héros introuvable")

    viewer = await _resolve_viewer(request)

    visibility = user.get("profile_visibility", "public")
    is_self = viewer and viewer["user_id"] == user["user_id"]
    is_staff = viewer and viewer.get("role") in ("admin", "moderator")

    if not is_self and not is_staff:
        if visibility == "private":
            return {
                "hidden": True,
                "reason": "private",
                "username": user["username"],
                "display_name": user.get("display_name") or user["username"],
            }
        if visibility == "friends":
            if not viewer or not await _are_friends(viewer["user_id"], user["user_id"]):
                return {
                    "hidden": True,
                    "reason": "friends_only",
                    "username": user["username"],
                    "display_name": user.get("display_name") or user["username"],
                }

    pub = public_user(user)
    hero_card_available = await _hero_card_visible_to(viewer, user)
    user_badges = await db.user_badges.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    return {
        "hidden": False,
        "profile": pub,
        "hero_card_available": hero_card_available,
        "badges": enrich_badges(user_badges),
        "xp_next": xp_for_level(user["level"] + 1) if user["level"] < 999 else None,
    }


@api.put("/profile/title")
async def set_title(req: TitleReq, user: dict = Depends(get_user_dep)):
    title = next((t for t in TITLES if t["id"] == req.title_id), None)
    if not title:
        raise HTTPException(400, "Titre invalide")
    shop_owned = await db.user_titles.find_one({
        "user_id": user["user_id"],
        "$or": [{"title_id": req.title_id}, {"sku": f"title_{req.title_id}"}],
    })
    # Special titles (shop, referral or VIP rewards) require an explicit ownership grant.
    requires_ownership = (
        req.title_id in SHOP_ONLY_TITLES
        or req.title_id in REFERRAL_TITLES
        or req.title_id in VIP_TITLES
    )
    if requires_ownership and not shop_owned:
        raise HTTPException(400, "Titre non acquis")
    if not requires_ownership and user["level"] < title["unlock_level"]:
        raise HTTPException(400, "Titre non débloqué")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"active_title": req.title_id}})
    try:
        await nexus_world.push_profile_updated(user["user_id"], {"active_title": req.title_id})
    except Exception:
        pass
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
    discord_rewards.schedule_reward_notify(db, user["user_id"], "skill_allocate", skill_points=-1)
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
        raise HTTPException(400, f"Écus insuffisants ({cost} requis)")
    # Defensive: collapse any existing duplicates before computing "already owned"
    await dedupe_inventory(user["user_id"])
    await spend_aether(user["user_id"], cost, "open_chest")
    items = await open_chest(user["user_id"])
    if not items:
        await grant_aether(user["user_id"], cost, "chest_refund")
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
    try:
        await nexus_world.push_inventory_updated(user["user_id"], "chest", {
            "items_count": len(items),
            "item_names": [it.get("name") for it in items],
        })
        await push_wallet_updated(user["user_id"])
    except Exception:
        pass
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
        raise HTTPException(400, f"Coût: {cost} Écus")
    await spend_aether(user["user_id"], cost, f"Amélioration royaume : {building['name']} (niv. {next_level})")
    kingdom[building_id] = {"level": next_level}
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {f"kingdom.{building_id}": {"level": next_level}}},
    )
    await add_chronicle(user["user_id"], f"A amélioré son {building['name']} au niveau {next_level}", "kingdom")
    if any(v.get("level", 0) >= 5 for v in kingdom.values()):
        await grant_badge(user["user_id"], "architect_master")
    await push_wallet_updated(user["user_id"])
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
    # badges
    count = await db.posts.count_documents({"user_id": user["user_id"]})
    if count >= 1:
        await grant_badge(user["user_id"], "first_step")
    if count >= 10:
        await grant_badge(user["user_id"], "creator")
    if count >= 100:
        await grant_badge(user["user_id"], "innovator")
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
        await grant_reputation(post["user_id"], REP_REACTION_RECEIVED, "reaction_received")
    await grant_xp(user["user_id"], XP_REACT, "react")
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
    users = await db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0, "user_id": 1, "username": 1, "avatar_url": 1, "level": 1, "rank": 1, "role": 1}).to_list(500)
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

    # Synchronise le libellé/objectif des quêtes en cours avec les modèles
    # actuels (les descriptions plus précises s'appliquent immédiatement,
    # sans réinitialiser la progression déjà acquise).
    tmpl_by_id = {t["id"]: t for t in QUEST_TEMPLATES}
    for q in existing:
        tmpl = tmpl_by_id.get(q["quest_id"])
        if not tmpl or q.get("period") not in (today, week, month):
            continue
        progress = q.get("progress", 0)
        synced = {
            "name": tmpl["name"],
            "description": tmpl["description"],
            "action": tmpl["action"],
            "target": tmpl["target"],
            "xp": tmpl["xp"],
            "aether": tmpl["aether"],
            "type": tmpl["type"],
            "completed": q.get("completed", False) or progress >= tmpl["target"],
        }
        if any(q.get(k) != v for k, v in synced.items()):
            await db.user_quests.update_one({"_id": q["_id"]}, {"$set": synced})

    quests = await db.user_quests.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    # On ne renvoie que les quêtes de la période courante ET encore définies
    # dans les modèles (les anciennes quêtes obsolètes sont masquées).
    valid = [
        q for q in quests
        if q.get("period") in (today, week, month) and q.get("quest_id") in tmpl_by_id
    ]
    return valid


@api.post("/quests/daily-login")
async def daily_login(user: dict = Depends(get_user_dep)):
    """Mark daily login - progresses login quest."""
    await maybe_process_daily_login(user["user_id"])
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"login_streak": 1, "last_passive_aether_date": 1})
    today = now_utc().date().isoformat()
    passive = 0
    if fresh and fresh.get("last_passive_aether_date") == today:
        perks = await db.user_perks.find({"user_id": user["user_id"]}, {"sku": 1}).to_list(50)
        skus = {p.get("sku") for p in perks}
        if "kingdom_aether_mine" in skus:
            passive += 50
        if "kingdom_treasury" in skus:
            passive += 200
    return {"ok": True, "login_streak": fresh.get("login_streak", 1) if fresh else 1, "passive_aether": passive}


@api.get("/oracle/status")
async def oracle_status(user: dict = Depends(get_user_dep)):
    unlimited = await has_user_perk(user["user_id"], "oracle_unlimited")
    kingdom = user.get("kingdom") or {}
    sanctuary_lvl = kingdom.get("sanctuary", {}).get("level", 0)
    today = now_utc().date().isoformat()
    used = await db.oracle_logs.count_documents({
        "user_id": user["user_id"],
        "created_at": {"$gte": f"{today}T00:00:00"},
    })
    daily_limit = 999 if unlimited else (3 if sanctuary_lvl >= 1 else 1)
    level_ok = user.get("level", 1) >= 10
    access_ok = unlimited or sanctuary_lvl >= 1 or user.get("level", 1) >= 20
    return {
        "unlimited": unlimited,
        "sanctuary_level": sanctuary_lvl,
        "daily_limit": daily_limit,
        "used_today": used,
        "level_ok": level_ok,
        "access_ok": access_ok,
        "llm_configured": oracle_llm_configured(),
    }


# ---------- Oracle IA ----------
@api.post("/oracle/consult")
async def oracle_consult(req: OracleReq, user: dict = Depends(get_user_dep)):
    if user.get("level", 1) < 10:
        raise HTTPException(403, "Niveau 10 requis pour accéder au Sanctuaire")
    unlimited = await has_user_perk(user["user_id"], "oracle_unlimited")
    kingdom = user.get("kingdom") or {}
    sanctuary_lvl = kingdom.get("sanctuary", {}).get("level", 0)
    if not unlimited and sanctuary_lvl < 1 and user.get("level", 1) < 20:
        raise HTTPException(403, "Améliorez le Sanctuaire de votre royaume (niv. 30) ou atteignez le niveau 20")
    if not unlimited:
        today = now_utc().date().isoformat()
        count = await db.oracle_logs.count_documents({
            "user_id": user["user_id"],
            "created_at": {"$gte": f"{today}T00:00:00"},
        })
        daily_limit = 3 if sanctuary_lvl >= 1 else 1
        if count >= daily_limit:
            raise HTTPException(429, f"Limite quotidienne ({daily_limit}/jour). Achetez le Lien à l'Oracle pour des consultations illimitées.")
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
    limit = 500 if await has_user_perk(user["user_id"], "chronicle_full") else 100
    entries = await db.chronicles.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
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
        {"type": "aether", "name": "Faille Dorée", "description": "Une pluie d'Écus vous bénit", "reward": "+150 Écus"},
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
        await grant_aether(user["user_id"], 150, "rift")
        rewards.append("150 Écus")
    elif rift["type"] == "badge":
        await grant_badge(user["user_id"], "rift_walker")
        rewards.append("Badge Marcheur des Failles")
    await db.rifts.update_one({"rift_id": rift_id}, {"$set": {"claimed": True}})
    await add_chronicle(user["user_id"], f"A traversé une {rift['name']}", "rift")
    return {"rewards": rewards}


# ---------- Community challenges (objectifs collectifs) ----------
async def _community_challenge_progress(action: str) -> int:
    if action == "forum_reply":
        return await db.forum_replies.count_documents({})
    if action == "forum_thread":
        return await db.forum_threads.count_documents({})
    if action == "oracle_log":
        return await db.oracle_logs.count_documents({})
    if action == "guild_chat":
        return await db.guild_chat.count_documents({})
    if action == "friend_message":
        return await db.friend_messages.count_documents({})
    return 0


async def _ensure_community_challenges():
    await db.world_boss.update_many({"action": "comment"}, {"$set": {"active": False}})
    for tmpl in COMMUNITY_CHALLENGES:
        existing = await db.community_challenges.find_one({"challenge_id": tmpl["challenge_id"]})
        if not existing:
            doc = {**tmpl, "active": True, "created_at": now_utc().isoformat()}
            await db.community_challenges.insert_one(doc)


async def _hydrate_community_challenges():
    await _ensure_community_challenges()
    challenges = await db.community_challenges.find(
        {"active": True}, {"_id": 0},
    ).sort("sort_order", 1).to_list(20)
    for c in challenges:
        c["progress"] = await _community_challenge_progress(c["action"])
        c["percent"] = round(min(100.0, (c["progress"] / max(1, c["target"])) * 100), 1)
    return challenges


@api.get("/community-challenges")
async def get_community_challenges():
    return await _hydrate_community_challenges()


@api.get("/boss")
async def get_world_boss():
    """Défi communautaire vedette — compatibilité avec l'ancien boss mondial."""
    challenges = await _hydrate_community_challenges()
    if not challenges:
        return None
    featured = next((c for c in challenges if c["progress"] < c["target"]), challenges[0])
    return {
        "boss_id": featured["challenge_id"],
        "name": featured["name"],
        "description": featured["description"],
        "target": featured["target"],
        "progress": featured["progress"],
        "action": featured.get("action_label", featured["action"]),
        "link": featured.get("link", "/events"),
        "active": True,
        "percent": featured["percent"],
    }


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
    try:
        await nexus_world.disconnect_user(user_id)
    except Exception:
        pass
    return {"ok": True}


@api.get("/admin/logs")
async def admin_logs(user: dict = Depends(get_staff_dep)):
    chronicles = await db.chronicles.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return chronicles


# ---------- Maintenance Mode (admin toggle) ----------
DEFAULT_MAINTENANCE_SYSTEMS = {
    "database": {"label": "Base de données", "status": "maintenance", "progress": 50, "icon": "database"},
    "site": {"label": "Site", "status": "maintenance", "progress": 30, "icon": "site"},
    "server": {"label": "Serveur Online", "status": "maintenance", "progress": 10, "icon": "server"},
}

DEFAULT_MAINTENANCE_HTML = {
    "brand_name": "NEXORIA",
    "brand_tagline": "L'ASCENSION COMMENCE",
    "badge": "Maintenance en cours",
    "title": "Maintenance\ndu Nexus",
    "body": "Les Sentinelles restaurent l'équilibre du monde.",
    "body_sub": "Merci pour votre patience et votre soutien.",
    "footer": "NEXORIA — Unis dans l'éternité",
    "discord_label": "Rejoindre Discord",
}


def normalize_maintenance_text(raw: str, max_len: int = 12000, preserve_breaks: bool = False) -> str:
    if not raw:
        return ""
    text = str(raw)[:max_len]
    text = re.sub(r"<script\b[^>]*>.*?</script>", "", text, flags=re.I | re.S)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    if preserve_breaks:
        lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in text.replace("\r\n", "\n").split("\n")]
        return "\n".join([ln for ln in lines if ln])[:max_len]
    return re.sub(r"\s+", " ", text).strip()[:max_len]


def sanitize_maintenance_html(raw: str, max_len: int = 12000) -> str:
    if not raw:
        return ""
    text = str(raw)[:max_len]
    text = re.sub(r"<script\b[^>]*>.*?</script>", "", text, flags=re.I | re.S)
    text = re.sub(r"<iframe\b[^>]*>.*?</iframe>", "", text, flags=re.I | re.S)
    text = re.sub(r"<object\b[^>]*>.*?</object>", "", text, flags=re.I | re.S)
    text = re.sub(r"<embed\b[^>]*>.*?</embed>", "", text, flags=re.I | re.S)
    text = re.sub(r"\son\w+\s*=", " data-blocked=", text, flags=re.I)
    text = re.sub(r"javascript:", "", text, flags=re.I)
    # Bloquer src dangereux sur images
    text = re.sub(
        r'(<img\b[^>]*\bsrc\s*=\s*["\'])(?!https?://|/uploads/|data:image/(?:png|jpe?g|gif|webp);)[^"\']*(["\'])',
        r"\1\2",
        text,
        flags=re.I,
    )
    # Autoriser uploads/content pour images forum/articles
    return text


MAINTENANCE_HTML_LIMITS = {
    "brand_name": 30000,
    "brand_tagline": 20000,
    "badge": 15000,
    "title": 100000,
    "body": 100000,
    "body_sub": 50000,
    "discord_label": 5000,
    "footer": 30000,
}

MAINTENANCE_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


def _maintenance_html(doc: dict) -> dict:
    stored = doc.get("html") if isinstance(doc.get("html"), dict) else {}
    merged = {**DEFAULT_MAINTENANCE_HTML, **(stored or {})}
    out = {}
    for key in DEFAULT_MAINTENANCE_HTML:
        raw = merged.get(key, DEFAULT_MAINTENANCE_HTML.get(key, ""))
        preserve = key == "title"
        out[key] = normalize_maintenance_text(raw, max_len=MAINTENANCE_HTML_LIMITS.get(key, 30000), preserve_breaks=preserve)
        if not out[key]:
            out[key] = DEFAULT_MAINTENANCE_HTML.get(key, "")
    return out


async def get_maintenance() -> dict:
    doc = await db.system_settings.find_one({"key": "maintenance"}, {"_id": 0})
    base = {"enabled": False, "title": "Maintenance du Nexus", "message": "", "subtitle": "", "html": {}, "systems": {}, "open_at": None, "updated_at": None}
    if not doc:
        return base
    return {**base, **{k: v for k, v in doc.items() if k != "key"}}


# ---------- Clés beta (accès testeurs pendant la maintenance) ----------
BETA_COOKIE = "nexoria_beta"
_BETA_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _gen_beta_key() -> str:
    def part(n: int) -> str:
        return "".join(_secrets.choice(_BETA_ALPHABET) for _ in range(n))
    return f"BETA-{part(4)}-{part(4)}"


async def has_beta_access(request: Request) -> bool:
    """True if the request carries a header/cookie matching an active beta key."""
    key = request.headers.get("x-beta-key") or request.cookies.get(BETA_COOKIE)
    if not key:
        return False
    doc = await db.beta_keys.find_one({"key": key.strip().upper(), "active": True})
    return bool(doc)


async def is_maintenance_active() -> tuple[bool, str]:
    """True when env MAINTENANCE_MODE or DB toggle is on."""
    if MAINTENANCE_MODE_ENV:
        doc = await get_maintenance()
        return True, doc.get("message") or "Maintenance du Nexus en cours"
    doc = await get_maintenance()
    return bool(doc.get("enabled")), doc.get("message") or ""


async def _maintenance_system_status() -> dict:
    mongo_ok = True
    try:
        await db.command("ping")
    except Exception:
        mongo_ok = False
    enabled, _ = await is_maintenance_active()
    doc = await get_maintenance()
    stored = doc.get("systems") or {}
    merged = {}
    for key, default in DEFAULT_MAINTENANCE_SYSTEMS.items():
        row = {**default, **(stored.get(key) or {})}
        row["progress"] = max(0, min(100, int(row.get("progress", default["progress"]))))
        if key == "database":
            row["status"] = "operational" if mongo_ok else "offline"
        merged[key] = row
    return merged


@api.get("/system/maintenance")
async def maintenance_status(request: Request):
    """Public endpoint — frontend polls this to render the maintenance overlay."""
    doc = await get_maintenance()
    enabled, _ = await is_maintenance_active()
    systems = await _maintenance_system_status()
    return {
        "enabled": enabled,
        "title": doc.get("title") or "Maintenance du Nexus",
        "message": doc.get("message") or "",
        "subtitle": doc.get("subtitle") or "",
        "html": _maintenance_html(doc),
        "env_locked": MAINTENANCE_MODE_ENV,
        "systems": systems,
        "open_at": doc.get("open_at"),
        "beta_access": await has_beta_access(request),
    }


@api.get("/maintenance/status")
async def maintenance_full_status(request: Request):
    """Rich status for the immersive maintenance page."""
    doc = await get_maintenance()
    enabled, message = await is_maintenance_active()
    systems = await _maintenance_system_status()
    return {
        "enabled": enabled,
        "title": doc.get("title") or "Maintenance du Nexus",
        "message": message or doc.get("message") or "",
        "subtitle": doc.get("subtitle") or "",
        "html": _maintenance_html(doc),
        "env_locked": MAINTENANCE_MODE_ENV,
        "systems": systems,
        "open_at": doc.get("open_at"),
        "beta_access": await has_beta_access(request),
        "updated_at": doc.get("updated_at"),
    }


@api.post("/maintenance/beta")
async def redeem_beta_key(payload: dict, request: Request, response: Response):
    """Public — un testeur saisit une clé beta pour débloquer l'accès au site."""
    key = str(payload.get("key", "")).strip().upper()
    if not key:
        raise HTTPException(400, "Clé requise")
    doc = await db.beta_keys.find_one({"key": key})
    if not doc or not doc.get("active", True):
        raise HTTPException(404, "Clé beta invalide ou révoquée")
    already = (
        request.cookies.get(BETA_COOKIE) == key
        or request.headers.get("x-beta-key", "").strip().upper() == key
    )
    max_uses = int(doc.get("max_uses", 0) or 0)
    uses = int(doc.get("uses", 0) or 0)
    if not already and max_uses and uses >= max_uses:
        raise HTTPException(403, "Cette clé a atteint son nombre maximal d'utilisations")
    if not already:
        await db.beta_keys.update_one(
            {"key": key},
            {"$inc": {"uses": 1}, "$set": {"last_used_at": now_utc().isoformat()}},
        )
        # Annonce Discord — on n'expose jamais la clé elle-même.
        name = None
        try:
            current = await get_current_user(request, db)
            name = current.get("username")
        except HTTPException:
            name = None
        if not name:
            name = doc.get("label") or "Un nouveau testeur"
        discord_auth_forum.schedule_beta_redeemed(name)
    response.set_cookie(
        BETA_COOKIE, key, httponly=True, secure=True, samesite="none",
        max_age=30 * 24 * 3600, path="/",
    )
    return {"ok": True, "label": doc.get("label") or ""}


@api.get("/admin/beta-keys")
async def list_beta_keys(user: dict = Depends(get_admin_dep)):
    return await db.beta_keys.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/admin/beta-keys")
async def create_beta_keys(payload: dict, user: dict = Depends(get_admin_dep)):
    label = str(payload.get("label", ""))[:80]
    max_uses = max(0, min(100000, int(payload.get("max_uses", 0) or 0)))
    count = max(1, min(50, int(payload.get("count", 1) or 1)))
    created = []
    for _ in range(count):
        key = _gen_beta_key()
        while await db.beta_keys.find_one({"key": key}):
            key = _gen_beta_key()
        doc = {
            "key": key,
            "label": label,
            "active": True,
            "max_uses": max_uses,
            "uses": 0,
            "created_at": now_utc().isoformat(),
            "created_by": user["username"],
            "last_used_at": None,
        }
        await db.beta_keys.insert_one(doc)
        doc.pop("_id", None)
        created.append(doc)
    return {"created": created}


@api.post("/admin/beta-keys/{key}/toggle")
async def toggle_beta_key(key: str, user: dict = Depends(get_admin_dep)):
    doc = await db.beta_keys.find_one({"key": key})
    if not doc:
        raise HTTPException(404, "Clé introuvable")
    new_active = not doc.get("active", True)
    await db.beta_keys.update_one({"key": key}, {"$set": {"active": new_active}})
    return {"ok": True, "active": new_active}


@api.delete("/admin/beta-keys/{key}")
async def delete_beta_key(key: str, user: dict = Depends(get_admin_dep)):
    await db.beta_keys.delete_one({"key": key})
    return {"ok": True}


@api.post("/staff/maintenance-login")
async def staff_maintenance_login(req: LoginReq, response: Response):
    """Staff-only login while global maintenance is active."""
    enabled, _ = await is_maintenance_active()
    if not enabled:
        raise HTTPException(400, "La maintenance n'est pas active")
    email = req.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Identifiants invalides")
    if user.get("role") not in ("admin", "moderator"):
        raise HTTPException(403, "Accès refusé — réservé aux Sentinelles")
    enforce_ban_or_raise(user)
    token = create_session_token()
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user["user_id"],
        "expires_at": session_expiry().isoformat(),
        "created_at": now_utc().isoformat(),
        "last_activity_at": now_utc().isoformat(),
    })
    set_session_cookie(response, token)
    await touch_user_last_seen(user["user_id"])
    discord_auth_forum.schedule_auth_event("login", user)
    result = public_user(user)
    result["session_token"] = token
    return result


@api.post("/upload/image")
async def content_upload_image(request: Request, file: UploadFile = File(...), user: dict = Depends(get_user_dep)):
    """Upload image pour éditeurs forum / articles (utilisateurs connectés)."""
    content_type = (file.content_type or "").lower()
    if content_type not in MAINTENANCE_IMAGE_TYPES:
        raise HTTPException(400, "Format non supporté (JPG, PNG, GIF, WebP)")
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(400, "Image trop lourde (max 15 Mo)")
    filename = f"{uuid.uuid4().hex}{MAINTENANCE_IMAGE_TYPES[content_type]}"
    dest = CONTENT_UPLOAD_DIR / filename
    dest.write_bytes(data)
    base = str(request.base_url).rstrip("/")
    return {"url": f"{base}/uploads/content/{filename}"}


@api.post("/profile/avatar/upload")
async def upload_avatar(request: Request, file: UploadFile = File(...), user: dict = Depends(get_user_dep)):
    """Upload a profile picture from the user's device and set it as their avatar."""
    content_type = (file.content_type or "").lower()
    if content_type not in MAINTENANCE_IMAGE_TYPES:
        raise HTTPException(400, "Format non supporté (JPG, PNG, GIF, WebP)")
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(400, "Image trop lourde (max 15 Mo)")
    filename = f"{user['user_id']}_{uuid.uuid4().hex[:8]}{MAINTENANCE_IMAGE_TYPES[content_type]}"
    dest = AVATAR_UPLOAD_DIR / filename
    dest.write_bytes(data)
    base = str(request.base_url).rstrip("/")
    url = f"{base}/uploads/avatars/{filename}"
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"avatar_url": url}})
    await grant_badge(user["user_id"], "shapeshifter")
    try:
        await nexus_world.push_profile_updated(user["user_id"], {"avatar_url": url})
    except Exception:
        pass
    return {"url": url, "avatar_url": url}


@api.post("/admin/maintenance/upload")
async def maintenance_upload_image(request: Request, file: UploadFile = File(...), user: dict = Depends(get_admin_dep)):
    """Upload image pour les éditeurs HTML de la page maintenance."""
    content_type = (file.content_type or "").lower()
    if content_type not in MAINTENANCE_IMAGE_TYPES:
        raise HTTPException(400, "Format non supporté (JPG, PNG, GIF, WebP)")
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(400, "Image trop lourde (max 15 Mo)")
    filename = f"{uuid.uuid4().hex}{MAINTENANCE_IMAGE_TYPES[content_type]}"
    dest = MAINTENANCE_UPLOAD_DIR / filename
    dest.write_bytes(data)
    base = str(request.base_url).rstrip("/")
    return {"url": f"{base}/uploads/maintenance/{filename}"}


@api.post("/admin/maintenance")
async def set_maintenance(payload: dict, user: dict = Depends(get_admin_dep)):
    current = await get_maintenance()
    enabled = bool(payload["enabled"]) if "enabled" in payload else bool(current.get("enabled"))
    title = str(payload.get("title", current.get("title") or "Maintenance du Nexus"))[:120]
    message = str(payload.get("message", current.get("message") or ""))[:500]
    subtitle = str(payload.get("subtitle", current.get("subtitle") or ""))[:300]
    html_in = payload.get("html") if isinstance(payload.get("html"), dict) else (current.get("html") or {})
    html = {}
    for key in DEFAULT_MAINTENANCE_HTML:
        raw = html_in.get(key, _maintenance_html(current).get(key, ""))
        limit = MAINTENANCE_HTML_LIMITS.get(key, 30000)
        html[key] = normalize_maintenance_text(raw, max_len=limit, preserve_breaks=(key == "title"))
        if not html[key]:
            html[key] = DEFAULT_MAINTENANCE_HTML.get(key, "")
    systems_in = payload.get("systems") if isinstance(payload.get("systems"), dict) else (current.get("systems") or {})
    systems = {}
    for key, default in DEFAULT_MAINTENANCE_SYSTEMS.items():
        row = systems_in.get(key) if isinstance(systems_in.get(key), dict) else {}
        status = str(row.get("status", default["status"]))
        if status not in ("operational", "sync", "maintenance", "offline"):
            status = default["status"]
        label_raw = row.get("label", default["label"])
        systems[key] = {
            "label": normalize_maintenance_text(label_raw, max_len=5000) or default["label"],
            "status": status,
            "progress": max(0, min(100, int(row.get("progress", default["progress"])))),
            "icon": default["icon"],
        }
    open_at_raw = payload.get("open_at", current.get("open_at"))
    open_at = None
    if open_at_raw:
        try:
            dt = datetime.fromisoformat(str(open_at_raw).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            open_at = dt.isoformat()
        except Exception:
            open_at = None
    doc = {
        "enabled": enabled,
        "title": title,
        "message": message,
        "subtitle": subtitle,
        "html": html,
        "systems": systems,
        "open_at": open_at,
        "updated_at": now_utc().isoformat(),
        "updated_by": user["username"],
    }
    await db.system_settings.update_one({"key": "maintenance"}, {"$set": doc}, upsert=True)
    return {**doc, "env_locked": MAINTENANCE_MODE_ENV}


# ---------- Online Gate — hub social (ouverture événements) ----------
DEFAULT_ONLINE_GATE_HTML = {
    "brand_name": "NEXORIA",
    "brand_tagline": "LA COMMUNAUTÉ AVANT TOUT",
    "badge": "Nexus fermé",
    "title": "Le Nexus\nse repose",
    "body": (
        "Le serveur Nexus n'est pas ouvert en permanence. Les Sentinelles l'ouvrent "
        "lors des rassemblements et événements communautaires."
    ),
    "body_sub": "Le reste du site reste accessible. Rejoignez le Discord pour la prochaine ouverture.",
    "footer": "NEXORIA — Unis dans l'éternité",
    "discord_label": "Rejoindre la communauté",
}


def _online_gate_html(doc: dict) -> dict:
    stored = doc.get("html") if isinstance(doc.get("html"), dict) else {}
    merged = {**DEFAULT_ONLINE_GATE_HTML, **(stored or {})}
    out = {}
    for key in DEFAULT_ONLINE_GATE_HTML:
        raw = merged.get(key, DEFAULT_ONLINE_GATE_HTML.get(key, ""))
        preserve = key == "title"
        out[key] = normalize_maintenance_text(raw, max_len=MAINTENANCE_HTML_LIMITS.get(key, 30000), preserve_breaks=preserve)
        if not out[key]:
            out[key] = DEFAULT_ONLINE_GATE_HTML.get(key, "")
    return out


async def get_online_gate() -> dict:
    doc = await db.system_settings.find_one({"key": "online_gate"}, {"_id": 0})
    base = {"open": True, "html": {}, "updated_at": None}
    if not doc:
        return base
    return {**base, **{k: v for k, v in doc.items() if k != "key"}}


async def is_online_open() -> bool:
    doc = await get_online_gate()
    return bool(doc.get("open", True))


async def _site_access_block() -> tuple[bool, str, str]:
    """Return (blocked, reason, message). reason: maintenance | ''"""
    maint_enabled, maint_msg = await is_maintenance_active()
    if maint_enabled:
        return True, "maintenance", maint_msg or "Maintenance du Nexus en cours"
    return False, "", ""


@api.get("/system/online-gate")
async def online_gate_status():
    """Public — frontend polls to know if the social hub is open."""
    doc = await get_online_gate()
    return {
        "open": bool(doc.get("open", True)),
        "html": _online_gate_html(doc),
        "updated_at": doc.get("updated_at"),
    }


@api.get("/online/status")
async def online_gate_public_status():
    """Public — rich Nexus gate status (Nexus overlay only, does not block the site)."""
    doc = await get_online_gate()
    return {
        "open": bool(doc.get("open", True)),
        "html": _online_gate_html(doc),
        "updated_at": doc.get("updated_at"),
    }


@api.post("/admin/online-gate")
async def set_online_gate(payload: dict, user: dict = Depends(get_admin_dep)):
    current = await get_online_gate()
    html_in = payload.get("html") if isinstance(payload.get("html"), dict) else {}
    html = {}
    for key in DEFAULT_ONLINE_GATE_HTML:
        raw = html_in.get(key, _online_gate_html(current).get(key, ""))
        limit = MAINTENANCE_HTML_LIMITS.get(key, 30000)
        html[key] = normalize_maintenance_text(raw, max_len=limit, preserve_breaks=(key == "title"))
        if not html[key]:
            html[key] = DEFAULT_ONLINE_GATE_HTML.get(key, "")
    doc = {
        "key": "online_gate",
        "open": bool(payload.get("open", current.get("open", True))),
        "html": html,
        "updated_at": now_utc().isoformat(),
        "updated_by": user["username"],
    }
    await db.system_settings.update_one({"key": "online_gate"}, {"$set": doc}, upsert=True)
    return {k: v for k, v in doc.items() if k != "key"}


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
    discord_auth_forum.schedule_auth_event("rename", {"username": new_name, "old_username": old})
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
# ===================== VIP « Pass Ascendant » endpoints =====================
class VipPurchaseReq(BaseModel):
    plan: str


def _vip_plans_list():
    return [VIP_PLANS[k] for k in ("VIP_NEXUS_7", "VIP_NEXUS_30", "VIP_NEXUS_90")]


@api.get("/shop/vip-plans")
async def vip_plans_endpoint():
    """Public catalog of VIP plans (prices defined server-side)."""
    return {"plans": _vip_plans_list()}


@api.get("/vip/status")
async def vip_status(user: dict = Depends(get_user_dep)):
    full = await db.users.find_one({"user_id": user["user_id"]})
    dt = vip_until_dt(full)
    return {
        "is_vip": is_vip_active(full),
        "vip_until": dt.isoformat() if dt else None,
        "vip_plan": full.get("vip_plan"),
        "vip_total_days_purchased": int(full.get("vip_total_days_purchased", 0) or 0),
        "remaining_eclats": full.get("aether", 0),
        "plans": _vip_plans_list(),
    }


@api.post("/vip/purchase")
async def vip_purchase(req: VipPurchaseReq, user: dict = Depends(get_user_dep)):
    plan = VIP_PLANS.get((req.plan or "").strip().upper())
    if not plan:
        raise HTTPException(400, "Plan VIP invalide")
    uid = user["user_id"]
    price = plan["price"]
    now = now_utc()

    # Anti double-clic : refuse un nouvel achat dans les 3s suivant le précédent.
    guard = await db.users.find_one(
        {"user_id": uid},
        {"vip_last_purchase_at": 1, "vip_until": 1, "vip_total_days_purchased": 1, "username": 1},
    )
    last = _parse_dt((guard or {}).get("vip_last_purchase_at"))
    if last and (now - last).total_seconds() < 3:
        raise HTTPException(429, "Achat déjà en cours — patientez quelques secondes.")

    # Débit ATOMIQUE conditionnel : empêche tout solde négatif / double dépense.
    debit = await db.users.update_one(
        {"user_id": uid, "aether": {"$gte": price}},
        {"$inc": {"aether": -price}, "$set": {"vip_last_purchase_at": now.isoformat()}},
    )
    if debit.modified_count == 0:
        raise HTTPException(400, f"Écus insuffisants ({price} requis).")

    # Prolonge depuis la date d'expiration restante si déjà VIP, sinon depuis maintenant.
    current = vip_until_dt(guard) or now
    base = current if current > now else now
    new_until = base + timedelta(days=plan["days"])
    total_days = int((guard or {}).get("vip_total_days_purchased", 0) or 0) + plan["days"]

    await db.users.update_one({"user_id": uid}, {"$set": {
        "is_vip": True,
        "vip_until": new_until.isoformat(),
        "vip_plan": plan["id"],
        "vip_total_days_purchased": total_days,
    }})

    # Transaction persistée
    await db.vip_transactions.insert_one({
        "transaction_id": f"vip_{uuid.uuid4().hex[:12]}",
        "user_id": uid,
        "plan": plan["id"],
        "days": plan["days"],
        "price": price,
        "vip_until": new_until.isoformat(),
        "created_at": now.isoformat(),
    })

    # Avantages : badge + titre VIP (octroi permanent du titre)
    await grant_badge(uid, VIP_BADGE_ID)
    await db.user_titles.update_one(
        {"user_id": uid, "title_id": VIP_TITLE_ID},
        {"$set": {"user_id": uid, "title_id": VIP_TITLE_ID,
                  "obtained_at": now.isoformat(), "source": "vip"}},
        upsert=True,
    )

    # Rôle Discord VIP (si lié + configuré) + annonce salon récompenses
    username = (guard or {}).get("username") or user.get("username") or "Un héros"
    if DISCORD_VIP_ROLE_ID:
        discord_sync.schedule_extra_role(db, uid, DISCORD_VIP_ROLE_ID, "NEXORIA — Pass Ascendant (VIP)")
    discord_rewards.schedule_custom(
        f"✨ **{username}** vient d'activer le Pass ascendant jusqu'au {new_until.strftime('%d/%m/%Y')}."
    )
    logger.info("VIP purchase: user=%s plan=%s price=%s until=%s", uid, plan["id"], price, new_until.isoformat())

    await push_notification(
        db, uid, "vip",
        "Pass Ascendant activé",
        f"Ton statut VIP est actif jusqu'au {new_until.strftime('%d/%m/%Y')}.",
        "fanfare", "Gem", link="/shop",
    )
    await push_wallet_updated(uid)
    try:
        await nexus_world.push_profile_updated(uid, {
            "user_id": uid, "is_vip": True, "vip_until": new_until.isoformat(),
        })
    except Exception:
        pass

    fresh = await db.users.find_one({"user_id": uid}, {"aether": 1, "_id": 0})
    return {
        "success": True,
        "message": f"Pass ascendant activé pendant {plan['days']} jours.",
        "vip_until": new_until.isoformat(),
        "vip_plan": plan["id"],
        "is_vip": True,
        "remaining_eclats": (fresh or {}).get("aether", 0),
    }


@api.get("/shop/items")
async def list_shop_items():
    """Static catalog + admin-created items."""
    custom = await db.shop_items.find({}, {"_id": 0}).to_list(500)
    return SHOP_ITEMS + custom


# ---------- Real-money écus top-up (Stripe Checkout) ----------
class EcusCheckoutReq(BaseModel):
    pack_id: str


async def _credit_ecu_order(session_id: str, *, user_id: str = None, ecus: int = None):
    """Idempotently credit écus for a PAID Stripe session.

    Safe against the webhook and the confirm endpoint racing each other: the
    `credited` flag is flipped atomically so écus are granted exactly once.
    """
    if not session_id:
        return None
    order = await db.ecu_orders.find_one({"session_id": session_id})
    if not order:
        if not (user_id and ecus):
            return None
        order = {
            "session_id": session_id, "user_id": user_id, "pack_id": None,
            "ecus": int(ecus), "amount_eur": None, "status": "paid",
            "credited": False, "created_at": now_utc().isoformat(),
        }
        await db.ecu_orders.insert_one(order)
    if order.get("credited"):
        return order
    res = await db.ecu_orders.find_one_and_update(
        {"session_id": session_id, "credited": {"$ne": True}},
        {"$set": {"credited": True, "status": "paid", "credited_at": now_utc().isoformat()}},
        return_document=ReturnDocument.AFTER,
    )
    if not res:
        return order  # credited concurrently by the other path
    await grant_aether(res["user_id"], int(res["ecus"]),
                       f"Achat d'Écus — {res.get('pack_id') or 'recharge'}")
    try:
        await push_notification(db, res["user_id"], "ecus_purchase",
            "Recharge d'Écus", f"+{int(res['ecus'])} Écus crédités sur votre compte",
            "chime", "Coins")
    except Exception:
        pass
    return res


@api.get("/shop/ecus/packs")
async def list_ecu_packs():
    """Packs d'écus achetables avec de l'argent réel + état de configuration."""
    return {
        "enabled": stripe_enabled(),
        "currency": "eur",
        "packs": ECU_PACKS,
        "publishable_key": STRIPE_PUBLISHABLE_KEY or None,
    }


@api.post("/shop/ecus/checkout")
async def create_ecu_checkout(req: EcusCheckoutReq, user: dict = Depends(get_user_dep)):
    pack = get_ecu_pack(req.pack_id)
    if not pack:
        raise HTTPException(404, "Pack introuvable")
    if not stripe_enabled():
        raise HTTPException(503, "Le paiement par carte n'est pas encore configuré. Réessayez bientôt.")
    frontend = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    total_ecus = pack["ecus"] + pack.get("bonus", 0)
    try:
        session = _stripe.checkout.Session.create(
            mode="payment",
            # Ne pas lister payment_method_types : laisser Stripe afficher
            # automatiquement tous les moyens activés dans le Dashboard
            # (Google Pay, Apple Pay, Link, CB, etc.) selon l'éligibilité client.
            automatic_payment_methods={"enabled": True},
            line_items=[{
                "quantity": 1,
                "price_data": {
                    "currency": "eur",
                    "unit_amount": int(round(pack["price_eur"] * 100)),
                    "product_data": {
                        "name": f"{total_ecus} Écus — {pack.get('label', 'Pack Écus')}",
                        "description": "Écus NEXORIA — monnaie virtuelle du site",
                    },
                },
            }],
            success_url=f"{frontend}/shop?ecus=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend}/shop?ecus=cancel",
            client_reference_id=user["user_id"],
            metadata={
                "user_id": user["user_id"],
                "pack_id": pack["id"],
                "ecus": str(total_ecus),
            },
        )
        logger.info(
            "[stripe] Checkout créé avec automatic_payment_methods — session %s pack %s (%s Écus)",
            session.id, pack["id"], total_ecus,
        )
    except Exception as e:
        logger.error(f"[stripe] checkout create failed: {e}")
        raise HTTPException(502, "Impossible de créer la session de paiement.")
    await db.ecu_orders.insert_one({
        "session_id": session.id,
        "user_id": user["user_id"],
        "pack_id": pack["id"],
        "ecus": total_ecus,
        "amount_eur": pack["price_eur"],
        "status": "pending",
        "credited": False,
        "created_at": now_utc().isoformat(),
    })
    return {"url": session.url, "session_id": session.id}


@api.get("/shop/ecus/confirm")
async def confirm_ecu_purchase(session_id: str, user: dict = Depends(get_user_dep)):
    """Fallback confirmation after Stripe redirect (webhook remains the source of truth)."""
    if not stripe_enabled():
        raise HTTPException(503, "Paiement non configuré")
    try:
        session = _stripe.checkout.Session.retrieve(session_id)
    except Exception as e:
        logger.warning(f"[stripe] retrieve session failed: {e}")
        raise HTTPException(404, "Session introuvable")
    owner = session.get("client_reference_id") or (session.get("metadata") or {}).get("user_id")
    if owner != user["user_id"]:
        raise HTTPException(403, "Cette session ne vous appartient pas")
    if session.get("payment_status") != "paid":
        return {"status": session.get("payment_status"), "credited": False}
    meta = session.get("metadata") or {}
    order = await _credit_ecu_order(
        session_id, user_id=user["user_id"],
        ecus=int(meta["ecus"]) if meta.get("ecus") else None,
    )
    return {"status": "paid", "credited": True, "ecus": (order or {}).get("ecus", 0)}


@api.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    if not stripe_enabled():
        raise HTTPException(503, "Stripe non configuré")
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    if STRIPE_WEBHOOK_SECRET:
        try:
            event = _stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
        except Exception as e:
            logger.warning(f"[stripe] webhook signature check failed: {e}")
            raise HTTPException(400, "Signature invalide")
    else:
        import json as _json
        try:
            event = _json.loads(payload.decode("utf-8"))
        except Exception:
            raise HTTPException(400, "Payload invalide")
    try:
        etype = event["type"]
        obj = event["data"]["object"]
    except Exception:
        return {"received": True}
    if etype == "checkout.session.completed" and obj.get("payment_status") == "paid":
        meta = obj.get("metadata") or {}
        await _credit_ecu_order(
            obj.get("id"), user_id=meta.get("user_id"),
            ecus=int(meta["ecus"]) if meta.get("ecus") else None,
        )
    return {"received": True}


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
        raise HTTPException(400, f"Écus insuffisants ({item['price']} requis)")

    # Prevent duplicate purchase for non-stackable categories
    if item["category"] in ("cosmetic", "kingdom", "mount", "title", "aura", "pass"):
        already_owned = (
            await db.user_cosmetics.find_one({"user_id": user["user_id"], "sku": sku})
            or await db.user_perks.find_one({"user_id": user["user_id"], "sku": sku})
            or await db.user_mounts.find_one({"user_id": user["user_id"], "sku": sku})
            or await db.user_auras.find_one({"user_id": user["user_id"], "sku": sku})
            or await db.user_titles.find_one({"user_id": user["user_id"], "sku": sku})
            or await db.user_passes.find_one({"user_id": user["user_id"], "sku": sku})
        )
        if already_owned:
            raise HTTPException(400, "Vous possédez déjà cet item")

    await spend_aether(user["user_id"], item["price"], f"Achat boutique : {item['name']}")

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
            await grant_aether(user["user_id"], item["price"], f"Remboursement boutique : {item['name']}")
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
            if sku == "key_chest_cosmic":
                items_won = await open_chest(user["user_id"], min_rarity="epic")
                applied["chest_items"] = items_won
            elif sku == "scroll_class_change":
                await db.users.update_one(
                    {"user_id": user["user_id"]},
                    {"$inc": {"class_change_credits": 3}},
                )
                applied["class_change_credits_added"] = 3
            else:
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
        await db.user_perks.insert_one({
            "user_id": user["user_id"], "sku": sku,
            "perk": item.get("perk"),
            "obtained_at": now_utc().isoformat(),
        })
        applied["perk_unlocked"] = sku
        if item.get("perk") == "throne":
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"has_throne": True}})
        if item.get("perk") in ("treasury",) or item.get("sku") == "kingdom_aether_mine":
            applied["passive_aether"] = True
    elif item["category"] == "chest":
        # Premium chests honor their guaranteed-rarity descriptions.
        chest_kwargs = {}
        if sku == "chest_divine":
            chest_kwargs = {"min_rarity": "rare", "luck_boost": 2.0}  # reliques rares garanties
        elif sku == "chest_royal":
            chest_kwargs = {"luck_boost": 1.6}  # meilleures chances d'Épique
        try:
            items_won = await open_chest(user["user_id"], **chest_kwargs)
        except HTTPException:
            await grant_aether(user["user_id"], item["price"], f"Remboursement boutique : {item['name']}")
            await db.shop_purchases.delete_one({"purchase_id": purchase_doc["purchase_id"]})
            raise
        if not items_won:
            await grant_aether(user["user_id"], item["price"], f"Remboursement boutique : {item['name']}")
            await db.shop_purchases.delete_one({"purchase_id": purchase_doc["purchase_id"]})
            raise HTTPException(400, "Coffre vide : vous possédez déjà tous les objets disponibles.")
        applied["chest_items"] = items_won
    elif item["category"] == "mount":
        await db.user_mounts.insert_one({"user_id": user["user_id"], "sku": sku, "obtained_at": now_utc().isoformat()})
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"active_mount": sku}})
        applied["mount_equipped"] = sku
    elif item["category"] == "title":
        title_id = item.get("title_id", sku.replace("title_", ""))
        await db.user_titles.insert_one({
            "user_id": user["user_id"], "sku": sku, "title_id": title_id,
            "obtained_at": now_utc().isoformat(),
        })
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"active_title": title_id}})
        applied["title_equipped"] = title_id
    elif item["category"] == "aura":
        await db.user_auras.insert_one({"user_id": user["user_id"], "sku": sku, "obtained_at": now_utc().isoformat()})
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"active_aura_sku": sku}})
        applied["aura_equipped"] = sku
    elif item["category"] == "pass":
        active_season = await db.seasons.find_one({"active": True}, {"_id": 0})
        if not active_season:
            await grant_aether(user["user_id"], item["price"], f"Remboursement boutique : {item['name']}")
            await db.shop_purchases.delete_one({"purchase_id": purchase_doc["purchase_id"]})
            raise HTTPException(400, "Aucune saison n'est en cours. Le Passe Saison sera disponible au lancement de la prochaine saison.")
        season_id = active_season["season_id"]
        existing_pass = await db.user_passes.find_one({"user_id": user["user_id"], "season_id": season_id})
        if existing_pass:
            await grant_aether(user["user_id"], item["price"], f"Remboursement boutique : {item['name']}")
            await db.shop_purchases.delete_one({"purchase_id": purchase_doc["purchase_id"]})
            raise HTTPException(400, "Vous possédez déjà le Passe pour la saison en cours.")
        await db.user_passes.insert_one({
            "user_id": user["user_id"], "sku": sku,
            "season_id": season_id,
            "obtained_at": now_utc().isoformat(),
        })
        # Reward the holder right away + flag the pass for end-of-season bonus.
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {f"season_pass.{season_id}": True}},
        )
        await grant_badge(user["user_id"], "season_passholder")
        await grant_xp(user["user_id"], SEASON_PASS_BONUS_XP, "Passe Saison")
        await grant_aether(user["user_id"], SEASON_PASS_BONUS_AETHER, "Passe Saison — récompense de bienvenue")
        applied["pass_unlocked"] = sku
        applied["season_id"] = season_id
        applied["season_pass_bonus"] = {"xp": SEASON_PASS_BONUS_XP, "aether": SEASON_PASS_BONUS_AETHER}
    else:
        await grant_aether(user["user_id"], item["price"], f"Remboursement boutique : {item['name']}")
        await db.shop_purchases.delete_one({"purchase_id": purchase_doc["purchase_id"]})
        raise HTTPException(400, f"Catégorie boutique non supportée : {item['category']}")

    await add_chronicle(user["user_id"], f"A acquis « {item['name']} » à la Boutique des Écus", "shop")
    await push_notification(db, user["user_id"], "shop", "Achat confirmé", f"« {item['name']} » est à vous", "ding", "ShoppingBag")

    # WebSocket sync: push inventory refresh without polling.
    try:
        inv_payload = {
            "sku": sku,
            "name": item["name"],
            "category": item["category"],
            "applied": applied,
        }
        await nexus_world.push_inventory_updated(user["user_id"], "shop", inv_payload)
        # Legacy event kept for Shop page listeners during migration
        await nexus_world.push_to_user(user["user_id"], "shop:purchased", {
            **inv_payload,
            "ts": now_utc().isoformat(),
        })
        profile_patch = {}
        if applied.get("aura_equipped"):
            profile_patch["active_aura_sku"] = applied["aura_equipped"]
        if applied.get("title_equipped"):
            profile_patch["active_title"] = applied["title_equipped"]
        if applied.get("mount_equipped"):
            profile_patch["active_mount"] = applied["mount_equipped"]
        if item["category"] == "cosmetic" and sku.startswith("frame_"):
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"active_frame": sku}})
            profile_patch["active_frame"] = sku
        if profile_patch:
            await nexus_world.push_profile_updated(user["user_id"], profile_patch)
        fresh = await db.users.find_one({"user_id": user["user_id"]}, {"aether": 1})
        if fresh:
            await nexus_world.push_profile_updated(user["user_id"], {
                "user_id": user["user_id"],
                "aether": fresh.get("aether", 0),
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
    mounts = await db.user_mounts.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    auras = await db.user_auras.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    titles_owned = await db.user_titles.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    passes = await db.user_passes.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(20)
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
    return {
        "cosmetics": cosmetics, "consumables": consumables, "perks": perks, "boosts": active_boosts,
        "mounts": mounts, "auras": auras, "titles": titles_owned, "passes": passes,
    }


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
    username: Optional[str] = Field(None, min_length=2, max_length=32)
    email: Optional[EmailStr] = None
    display_name: Optional[str] = Field(None, max_length=32)
    role: Optional[str] = None
    class_id: Optional[str] = None
    secondary_class_id: Optional[str] = None
    level: Optional[int] = None
    xp: Optional[int] = None
    skill_points: Optional[int] = None
    aether: Optional[int] = None
    reputation: Optional[int] = None
    active_title: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, max_length=512)
    banner_url: Optional[str] = Field(None, max_length=512)
    clear_ban: Optional[bool] = None


class BanReq(BaseModel):
    duration_hours: int  # 0 = permanent (use large number)
    reason: str


@api.put("/admin/users/{user_id}")
async def admin_edit_user(user_id: str, req: UserEditReq, user: dict = Depends(get_admin_dep)):
    data = req.model_dump(exclude_unset=True)
    clear_ban = data.pop("clear_ban", None)
    update = dict(data)
    if not update and not clear_ban:
        return {"ok": True, "updated_fields": []}

    if "role" in update and update["role"] not in ("user", "admin", "moderator"):
        raise HTTPException(400, "Rôle invalide")
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(404, "Utilisateur introuvable")

    if "username" in update:
        update["username"] = update["username"].strip()
        if update["username"] != target.get("username"):
            existing = await find_user_by_username(update["username"], {"user_id": 1})
            if existing and existing["user_id"] != user_id:
                raise HTTPException(400, "Pseudo déjà pris")
    if "email" in update:
        update["email"] = str(update["email"]).lower().strip()
        if update["email"] != (target.get("email") or "").lower():
            taken = await db.users.find_one({"email": update["email"], "user_id": {"$ne": user_id}})
            if taken:
                raise HTTPException(400, "Email déjà utilisé")
    if "display_name" in update:
        update["display_name"] = (update["display_name"] or "").strip()
    if "class_id" in update:
        if update["class_id"] not in CLASSES:
            raise HTTPException(400, "Classe invalide")
        update["class_name"] = CLASSES[update["class_id"]]["name"]
    if "secondary_class_id" in update:
        sec = (update["secondary_class_id"] or "").strip() or None
        if sec and sec not in CLASSES:
            raise HTTPException(400, "Classe secondaire invalide")
        update["secondary_class_id"] = sec
    if "active_title" in update:
        title_ids = {t["id"] for t in TITLES}
        if update["active_title"] not in title_ids:
            raise HTTPException(400, "Titre invalide")
    if "skill_points" in update:
        if update["skill_points"] < 0 or update["skill_points"] > 9999:
            raise HTTPException(400, "Points de compétence invalides (0–9999)")
    if "level" in update:
        if update["level"] < 1 or update["level"] > 999:
            raise HTTPException(400, "Niveau invalide (1–999)")
        update["rank"] = rank_from_level(update["level"])
        if "xp" not in update:
            lvl = update["level"]
            floor = xp_for_level(lvl) if lvl >= 2 else 0
            update["xp"] = max(target.get("xp", 0), floor)
    if "xp" in update and update["xp"] < 0:
        raise HTTPException(400, "XP invalide")
    if "aether" in update and update["aether"] < 0:
        raise HTTPException(400, "Écus invalides")
    if "reputation" in update and update["reputation"] < 0:
        raise HTTPException(400, "Réputation invalide")

    owner_username = os.environ.get("OWNER_USERNAME", "SmouzYi")
    if target.get("username") == owner_username and "role" in update and update["role"] != "admin":
        raise HTTPException(400, f"Impossible de rétrograder le propriétaire ({owner_username})")
    if user_id == user["user_id"] and "role" in update and update["role"] != "admin":
        raise HTTPException(400, "Impossible de se rétrograder soi-même")

    updated_fields = list(update.keys())
    if update:
        if "username" in update and update["username"] != target.get("username"):
            discord_auth_forum.schedule_auth_event("rename", {
                "username": update["username"],
                "old_username": target.get("username"),
            })
        await db.users.update_one({"user_id": user_id}, {"$set": update})
        await add_chronicle(user_id, f"Le Conseil a modifié son profil ({', '.join(update.keys())})", "admin")

    if clear_ban:
        await db.users.update_one(
            {"user_id": user_id},
            {"$unset": {"banned_until": "", "ban_reason": ""}},
        )
        await db.ban_history.update_many(
            {"user_id": user_id, "lifted": False},
            {"$set": {"lifted": True, "lifted_at": now_utc().isoformat()}},
        )
        await add_chronicle(user_id, "Banni levé par le Conseil (édition héros)", "unban")
        updated_fields.append("clear_ban")

    economy_deltas = {}
    for field in ("aether", "xp", "reputation"):
        if field in update:
            delta = int(update[field]) - int(target.get(field, 0) or 0)
            if delta != 0:
                economy_deltas[field] = delta
    if economy_deltas:
        discord_rewards.schedule_reward_notify(
            db,
            user_id,
            "Modification du Conseil",
            xp=economy_deltas.get("xp", 0),
            aether=economy_deltas.get("aether", 0),
            reputation=economy_deltas.get("reputation", 0),
            extra=[f"Champs modifiés : {', '.join(updated_fields)}"],
        )
    if any(k in update for k in ("aether", "level", "xp", "rank", "skill_points")):
        await push_wallet_updated(user_id)
    return {"ok": True, "updated_fields": updated_fields}


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
    try:
        await nexus_world.disconnect_user(user_id)
    except Exception as e:
        logger.warning("nexus disconnect on ban failed: %s", e)
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
def _discord_profile_fields(profile: dict) -> dict:
    return {
        "discord_id": profile["discord_id"],
        "discord_username": profile.get("discord_username"),
        "discord_global_name": profile.get("discord_global_name"),
        "discord_avatar_url": profile.get("discord_avatar_url"),
    }


def _avatar_should_sync_from_discord(user: dict, profile: dict) -> bool:
    current = user.get("avatar_url") or ""
    if not profile.get("discord_avatar_url"):
        return False
    if not current:
        return True
    if current == user.get("discord_avatar_url"):
        return True
    return "cdn.discordapp.com/avatars/" in current


@api.get("/auth/discord/status")
async def discord_status():
    return {
        "configured": discord_auth.is_configured(),
        "signup_xp_bonus": DISCORD_SIGNUP_XP_BONUS,
        "signup_badge_id": DISCORD_SIGNUP_BADGE_ID,
    }


@api.get("/auth/discord/url")
async def discord_url():
    if not discord_auth.is_configured():
        raise HTTPException(503, detail={"code": "not_configured", "message": "Discord OAuth non configuré côté serveur"})
    return {"url": discord_auth.build_authorize_url()}


@api.post("/auth/discord/exchange")
async def discord_exchange(req: DiscordExchangeReq, response: Response):
    try:
        profile = await discord_auth.exchange_code(req.code)
    except discord_auth.DiscordAuthError as e:
        raise HTTPException(e.status, detail={"code": e.code, "message": e.message})
    except Exception as e:
        logger.exception("Discord OAuth unexpected error")
        raise HTTPException(500, detail={"code": "internal_error", "message": f"Échec Discord OAuth: {str(e)[:120]}"})

    email = profile["email"].lower()
    discord_id = profile["discord_id"]
    by_discord = await db.users.find_one({"discord_id": discord_id})
    by_email = await db.users.find_one({"email": email})

    if by_discord and by_email and by_discord["user_id"] != by_email["user_id"]:
        raise HTTPException(
            409,
            detail={
                "code": "discord_account_conflict",
                "message": "Ce compte Discord est déjà lié à un autre profil NEXORIA",
            },
        )

    existing = by_discord or by_email
    is_new_account = False
    xp_bonus = 0
    badge_granted = False
    discord_linked = False

    if existing:
        enforce_ban_or_raise(existing)
        user_id = existing["user_id"]
        patch = _discord_profile_fields(profile)
        if _avatar_should_sync_from_discord(existing, profile):
            patch["avatar_url"] = profile.get("discord_avatar_url")
        if not existing.get("discord_id"):
            discord_linked = True
            patch["auth_provider"] = existing.get("auth_provider") or "discord"
        await db.users.update_one({"user_id": user_id}, {"$set": patch})
        user = await db.users.find_one({"user_id": user_id})
        if discord_linked:
            badge_granted = await grant_badge(user_id, DISCORD_SIGNUP_BADGE_ID)
        await add_chronicle(user_id, "Connexion via Discord", "login")
    else:
        is_new_account = True
        user_id = generate_user_id()
        username = profile["username"].replace(" ", "") or f"Heros{uuid.uuid4().hex[:6]}"
        base = username
        i = 0
        while await db.users.find_one({"username": username}):
            i += 1
            username = f"{base}{i}"
        cls = CLASSES["explorer"]
        user = {
            "user_id": user_id,
            "email": email,
            "username": username,
            "password_hash": None,
            **{k: v for k, v in _discord_profile_fields(profile).items()},
            "class_id": "explorer",
            "class_name": cls["name"],
            "secondary_class_id": None,
            "avatar_url": profile.get("discord_avatar_url"),
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
            "role": "admin" if username == OWNER_USERNAME else "user",
            "auth_provider": "discord",
            "created_at": now_utc().isoformat(),
            "dna": {
                "creativity": 15,
                "ambition": 10,
                "sociability": 10,
                "curiosity": 13,
                "persistence": 10,
                "influence": 10,
            },
            "kingdom": {b["id"]: {"level": 1 if b["id"] == "castle" else 0} for b in KINGDOM_BUILDINGS},
            "skills_allocated": {},
            "followers": 0,
            "following": 0,
            "needs_class_selection": True,
        }
        await db.users.insert_one(user)
        await add_chronicle(user_id, f"Le héros {username} a rejoint NEXORIA via Discord", "creation")
        if DISCORD_SIGNUP_XP_BONUS > 0:
            await grant_xp(user_id, DISCORD_SIGNUP_XP_BONUS, "Inscription via Discord")
            xp_bonus = DISCORD_SIGNUP_XP_BONUS
        badge_granted = await grant_badge(user_id, DISCORD_SIGNUP_BADGE_ID)
        user = await db.users.find_one({"user_id": user_id})

    token = create_session_token()
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user["user_id"],
        "expires_at": session_expiry().isoformat(),
        "created_at": now_utc().isoformat(),
        "last_activity_at": now_utc().isoformat(),
        "provider": "discord",
    })
    set_session_cookie(response, token)
    await touch_user_last_seen(user["user_id"])
    await maybe_process_daily_login(user["user_id"])
    discord_sync.schedule_sync(db, user["user_id"])
    if is_new_account:
        discord_auth_forum.schedule_auth_event("register", user)
        if req.referral_code:
            try:
                await apply_referral(req.referral_code, user["user_id"])
            except Exception as e:
                logger.warning(f"referral attribution (discord) failed: {e}")
        await claim_founder_reward(user["user_id"])
    else:
        discord_auth_forum.schedule_auth_event("login", user)
    fresh = await db.users.find_one({"user_id": user["user_id"]})
    result = public_user(fresh or user)
    result["session_token"] = token
    result["auth_meta"] = {
        "is_new_account": is_new_account,
        "discord_linked": discord_linked or is_new_account,
        "xp_bonus": xp_bonus,
        "badge_granted": badge_granted,
        "badge_id": DISCORD_SIGNUP_BADGE_ID if badge_granted else None,
        "email_provisional": (user.get("email") or "").endswith("@nexoria.local"),
    }
    return result


@api.delete("/auth/discord/unlink")
async def discord_unlink(user: dict = Depends(get_user_dep)):
    """Remove Discord link from the NEXORIA profile (does not delete the account)."""
    if not user.get("discord_id"):
        raise HTTPException(400, detail={"code": "not_linked", "message": "Aucun compte Discord lié"})
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {
            "$unset": {
                "discord_id": "",
                "discord_username": "",
                "discord_global_name": "",
                "discord_guild_nick": "",
                "discord_avatar_url": "",
                "discord_profile_synced_at": "",
            }
        },
    )
    await add_chronicle(user["user_id"], "Compte Discord délié", "settings")
    fresh = await db.users.find_one({"user_id": user["user_id"]})
    return public_user(fresh or user)


# ---------- Staff Chat & Broadcasts ----------
class StaffMsgReq(BaseModel):
    content: str


class BroadcastReq(BaseModel):
    title: str
    message: str
    sound: str = "fanfare"  # fanfare | horn | bell | war | trumpet | chime | drum

VALID_BROADCAST_SOUNDS = {"fanfare", "horn", "bell", "war", "trumpet", "chime", "drum", "ding"}


@api.get("/staff/chat")
async def staff_chat_list(user: dict = Depends(get_staff_dep)):
    msgs = await db.staff_chat.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    msgs.reverse()
    return msgs


@api.post("/staff/chat")
async def staff_chat_post(req: StaffMsgReq, user: dict = Depends(get_staff_dep)):
    content = req.content.strip()
    if not content:
        raise HTTPException(400, "Message vide")
    # Slash commands
    if content.startswith("/"):
        parts = content.split(maxsplit=1)
        cmd = parts[0].lower()
        arg = parts[1].strip() if len(parts) > 1 else ""
        if cmd in ("/delete", "/del", "/supprimer"):
            if not arg:
                raise HTTPException(400, "Usage: /delete <id_message>")
            target = await db.staff_chat.find_one({"msg_id": {"$regex": f"^{re.escape(arg)}"}}, {"_id": 0})
            if not target:
                raise HTTPException(404, "Message introuvable")
            if target["author_id"] != user["user_id"] and user.get("role") != "admin":
                raise HTTPException(403, "Seul l'auteur ou un admin peut supprimer")
            await db.staff_chat.delete_one({"msg_id": target["msg_id"]})
            return {"ok": True, "deleted": target["msg_id"]}
        if cmd == "/help":
            help_doc = {
                "msg_id": f"smsg_{uuid.uuid4().hex[:12]}",
                "author_id": "system", "author_username": "Système", "author_role": "admin",
                "content": "Commandes: /delete <id> · Émotes: :sword: :shield: :crown: :fire: :star: :heart:",
                "created_at": now_utc().isoformat(), "system": True,
            }
            await db.staff_chat.insert_one(help_doc)
            help_doc.pop("_id", None)
            return help_doc
        raise HTTPException(400, "Commande inconnue — tapez /help")
    doc = {
        "msg_id": f"smsg_{uuid.uuid4().hex[:12]}",
        "author_id": user["user_id"],
        "author_username": user["username"],
        "author_role": user["role"],
        "author_avatar": user.get("avatar_url"),
        "content": content[:1000],
        "created_at": now_utc().isoformat(),
    }
    await db.staff_chat.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/admin/broadcast")
async def broadcast_alert(req: BroadcastReq, user: dict = Depends(get_admin_dep)):
    """Push an alert visible to ALL connected users with sound."""
    sound = req.sound if req.sound in VALID_BROADCAST_SOUNDS else "fanfare"
    doc = {
        "alert_id": f"alert_{uuid.uuid4().hex[:12]}",
        "title": req.title[:120],
        "message": req.message[:500],
        "sound": sound,
        "issued_by": user["username"],
        "created_at": now_utc().isoformat(),
        "expires_at": (now_utc() + timedelta(minutes=10)).isoformat(),
        "kind": "broadcast",
    }
    await db.broadcasts.insert_one(doc)
    doc.pop("_id", None)
    # Also push to each user's notification feed
    cursor = db.users.find({}, {"user_id": 1, "_id": 0})
    async for u in cursor:
        await push_notification(db, u["user_id"], "broadcast", req.title, req.message, sound, "Megaphone")
    return doc


class NewsCreateReq(BaseModel):
    title: str
    content: str = ""
    content_html: Optional[str] = None
    category: str = "announce"
    image_url: Optional[str] = None
    featured: bool = True
    published: bool = True


class NewsUpdateReq(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    content_html: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    featured: Optional[bool] = None
    published: Optional[bool] = None


NEWS_CATEGORIES = {"event", "update", "community", "announce"}


@api.get("/community/overview")
async def community_overview(user: dict = Depends(get_user_dep)):
    """Aggregated data for the Community page: team, recruiting guilds, news, stats."""
    # ----- Team (staff) -----
    staff_rows = await db.users.find(
        {"role": {"$in": ["admin", "moderator"]}},
        {"_id": 0, "user_id": 1, "username": 1, "display_name": 1, "role": 1,
         "avatar_url": 1, "discord_avatar_url": 1, "level": 1, "rank": 1,
         "active_title": 1, "class_name": 1, "quote": 1, "bio": 1},
    ).sort("level", -1).to_list(50)
    role_order = {"admin": 0, "moderator": 1}
    staff_rows.sort(key=lambda u: (role_order.get(u.get("role"), 9), -(u.get("level") or 0)))
    for s in staff_rows:
        title_id = s.get("active_title") or "novice"
        title_doc = next((t for t in TITLES if t["id"] == title_id), None)
        s["active_title_name"] = title_doc["name"] if title_doc else title_id.replace("_", " ").title()

    # ----- Recruiting guilds (top by level) -----
    guilds = await db.guilds.find({}, {"_id": 0}).sort("level", -1).limit(6).to_list(6)
    for g in guilds:
        g["member_count"] = await db.guild_members.count_documents({"guild_id": g.get("guild_id")})

    # ----- Latest news -----
    news = await db.news.find({"published": True}, {"_id": 0}).sort("created_at", -1).limit(4).to_list(4)

    # ----- Stats -----
    total_heroes = await db.users.count_documents({})
    total_guilds = await db.guilds.count_documents({})
    try:
        online_now = nexus_world._presence_payload().get("total", 0)
    except Exception:
        online_now = 0

    return {
        "team": staff_rows,
        "guilds": guilds,
        "news": news,
        "stats": {
            "heroes": total_heroes,
            "guilds": total_guilds,
            "staff": len(staff_rows),
            "online": online_now,
        },
    }


@api.get("/news")
async def public_news(limit: int = 12, featured_only: bool = False):
    q = {"published": True}
    if featured_only:
        q["featured"] = True
    items = await db.news.find(q, {"_id": 0}).sort("created_at", -1).limit(min(limit, 30)).to_list(min(limit, 30))
    return items


@api.get("/news/{news_id}")
async def public_news_article(news_id: str):
    doc = await db.news.find_one({"news_id": news_id, "published": True}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Article introuvable")
    return doc


class NewsCommentReq(BaseModel):
    content: str


@api.get("/news/{news_id}/comments")
async def list_news_comments(news_id: str, user: dict = Depends(get_user_dep)):
    article = await db.news.find_one({"news_id": news_id, "published": True})
    if not article:
        raise HTTPException(404, "Article introuvable")
    comments = await db.news_comments.find(
        {"news_id": news_id, "hidden": {"$ne": True}},
        {"_id": 0},
    ).sort("created_at", 1).limit(200).to_list(200)
    return comments


@api.post("/news/{news_id}/comments")
async def post_news_comment(news_id: str, req: NewsCommentReq, user: dict = Depends(get_user_dep)):
    article = await db.news.find_one({"news_id": news_id, "published": True})
    if not article:
        raise HTTPException(404, "Article introuvable")
    content = (req.content or "").strip()
    if len(content) < 2 or len(content) > 800:
        raise HTTPException(400, "Commentaire 2-800 caractères")
    today = now_utc().date().isoformat()
    daily = await db.news_comments.count_documents({
        "user_id": user["user_id"],
        "created_at": {"$gte": f"{today}T00:00:00"},
    })
    if daily >= 20:
        raise HTTPException(429, "Limite de commentaires quotidienne atteinte")
    doc = {
        "comment_id": f"nc_{uuid.uuid4().hex[:12]}",
        "news_id": news_id,
        "user_id": user["user_id"],
        "username": user["username"],
        "avatar_url": user.get("avatar_url"),
        "role": user.get("role", "user"),
        "content": content,
        "hidden": False,
        "created_at": now_utc().isoformat(),
    }
    await db.news_comments.insert_one(doc)
    doc.pop("_id", None)
    await grant_xp(user["user_id"], 15, "news_comment")
    total = await db.news_comments.count_documents({"user_id": user["user_id"]})
    if total == 1:
        await grant_badge(user["user_id"], "news_scribe")
    if total >= 25:
        await grant_badge(user["user_id"], "news_sage")
    if total >= 100:
        await grant_badge(user["user_id"], "news_herald")
    return doc


@api.delete("/news/comments/{comment_id}")
async def delete_news_comment(comment_id: str, user: dict = Depends(get_user_dep)):
    c = await db.news_comments.find_one({"comment_id": comment_id})
    if not c:
        raise HTTPException(404, "Commentaire introuvable")
    is_staff = user.get("role") in ("admin", "moderator")
    if c["user_id"] != user["user_id"] and not is_staff:
        raise HTTPException(403, "Action interdite")
    await db.news_comments.update_one(
        {"comment_id": comment_id},
        {"$set": {"hidden": True, "moderated_by": user["username"], "moderated_at": now_utc().isoformat()}},
    )
    return {"ok": True}


@api.get("/admin/news")
async def admin_list_news(user: dict = Depends(get_staff_dep)):
    items = await db.news.find({}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return items


@api.post("/admin/news")
async def admin_create_news(req: NewsCreateReq, user: dict = Depends(get_admin_dep)):
    cat = req.category if req.category in NEWS_CATEGORIES else "announce"
    content_html = sanitize_maintenance_html(req.content_html or req.content or "", max_len=12000)
    plain = strip_forum_plain(content_html) or (req.content or "").strip()
    if not req.title.strip() or len(plain) < 2:
        raise HTTPException(400, "Titre et contenu requis")
    doc = {
        "news_id": f"news_{uuid.uuid4().hex[:12]}",
        "title": req.title.strip()[:160],
        "content": plain[:2000],
        "content_html": content_html,
        "category": cat,
        "image_url": (req.image_url or "").strip()[:512] or None,
        "featured": req.featured,
        "published": req.published,
        "author": user["username"],
        "created_at": now_utc().isoformat(),
    }
    await db.news.insert_one(doc)
    doc.pop("_id", None)
    if req.published and req.featured:
        alert = {
            "alert_id": f"news_{doc['news_id']}",
            "title": doc["title"],
            "message": doc["content"][:500],
            "sound": "chime",
            "issued_by": user["username"],
            "created_at": doc["created_at"],
            "expires_at": (now_utc() + timedelta(minutes=30)).isoformat(),
            "kind": "news",
        }
        await db.broadcasts.insert_one(alert)
    return doc


@api.put("/admin/news/{news_id}")
async def admin_update_news(news_id: str, req: NewsUpdateReq, user: dict = Depends(get_admin_dep)):
    existing = await db.news.find_one({"news_id": news_id})
    if not existing:
        raise HTTPException(404, "Article introuvable")
    patch = {k: v for k, v in req.model_dump().items() if v is not None}
    if "category" in patch and patch["category"] not in NEWS_CATEGORIES:
        raise HTTPException(400, "Catégorie invalide")
    if patch:
        if "content_html" in patch or "content" in patch:
            raw_html = patch.get("content_html") or patch.get("content") or existing.get("content_html") or existing.get("content", "")
            content_html = sanitize_maintenance_html(raw_html, max_len=12000)
            plain = strip_forum_plain(content_html)
            patch["content_html"] = content_html
            patch["content"] = plain[:2000]
        patch["updated_at"] = now_utc().isoformat()
        await db.news.update_one({"news_id": news_id}, {"$set": patch})
    doc = await db.news.find_one({"news_id": news_id}, {"_id": 0})
    return doc


@api.delete("/admin/news/{news_id}")
async def admin_delete_news(news_id: str, user: dict = Depends(get_admin_dep)):
    r = await db.news.delete_one({"news_id": news_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Article introuvable")
    return {"ok": True}


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
        "appear_offline": 1,
    }).to_list(500)
    # active = valid session with recent activity (5 min)
    cutoff = (now_utc() - timedelta(minutes=5)).isoformat()
    now_iso = now_utc().isoformat()
    active_sessions = await db.user_sessions.distinct("user_id", {
        "expires_at": {"$gt": now_iso},
        "$or": [
            {"last_activity_at": {"$gt": cutoff}},
            {"last_activity_at": {"$exists": False}, "created_at": {"$gt": cutoff}},
        ],
    })
    active_set = set(active_sessions)
    for u in users:
        # Hidden-presence heroes always read as offline on the public map.
        u["online"] = (u["user_id"] in active_set) and not u.get("appear_offline")
        u.pop("appear_offline", None)
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
        raise HTTPException(400, f"{GUILD_CREATE_COST} Écus requis pour fonder un ordre")
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
    await spend_aether(user["user_id"], GUILD_CREATE_COST, "guild_create")
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
    target = await find_user_by_username(req.target_username, {"user_id": 1, "username": 1})
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
        f"L'ordre « {guild['name']} » vous invite", f"Tag [{guild['tag']}] — clique pour répondre",
        "ding", "Castle", link="/guilds?invites=1")
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
    await progress_quests(user["user_id"], "guild_chat", 1)
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
        raise HTTPException(400, "Écus insuffisants")
    g = await db.guilds.find_one({"guild_id": guild_id})
    await spend_aether(user["user_id"], req.amount, f"Dépôt au coffre — {g['name']}")
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
    await grant_aether(target_user_id, req.amount, f"Récompense de guilde — {g['name']}")
    await push_notification(db, target_user_id, "guild_reward",
        f"Récompense de l'ordre « {g['name']} »", f"+{req.amount} Écus", "coin", "Coins")
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


def strip_forum_plain(raw: str) -> str:
    if not raw:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", str(raw), flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", text).strip()


def _forum_until_active(until_val) -> tuple[bool, str | None]:
    if not until_val:
        return False, None
    try:
        bu = datetime.fromisoformat(until_val) if isinstance(until_val, str) else until_val
    except ValueError:
        return False, None
    if bu.tzinfo is None:
        bu = bu.replace(tzinfo=timezone.utc)
    if bu > datetime.now(timezone.utc):
        return True, bu.isoformat()
    return False, None


def get_forum_ban_detail(user: dict) -> dict | None:
    active, until = _forum_until_active(user.get("forum_banned_until"))
    if not active:
        return None
    return {
        "forum_banned": True,
        "reason": user.get("forum_ban_reason", "Comportement inapproprié sur le forum"),
        "until": until,
    }


def get_forum_mute_detail(user: dict) -> dict | None:
    active, until = _forum_until_active(user.get("forum_muted_until"))
    if not active:
        return None
    return {
        "forum_muted": True,
        "reason": user.get("forum_mute_reason", "Restriction temporaire du forum"),
        "until": until,
    }


def enforce_forum_access(user: dict):
    """Bloque tout accès au forum (lecture + écriture). Distinct du ban site."""
    detail = get_forum_ban_detail(user)
    if detail:
        raise HTTPException(status_code=403, detail=detail)


def enforce_forum_post(user: dict):
    """Empêche de poster — le forum reste lisible si seulement muté."""
    enforce_forum_access(user)
    detail = get_forum_mute_detail(user)
    if detail:
        raise HTTPException(status_code=403, detail=detail)


class ForumThreadReq(BaseModel):
    category: str
    title: str
    content: str
    content_html: Optional[str] = None


@api.get("/forum/access-status")
async def forum_access_status(user: dict = Depends(get_user_dep)):
    """État d'accès forum — distinct du ban site global."""
    ban = get_forum_ban_detail(user)
    if ban:
        return ban
    mute = get_forum_mute_detail(user)
    if mute:
        return {**mute, "forum_banned": False}
    return {"forum_banned": False, "forum_muted": False}


@api.get("/forum/categories")
async def list_forum_categories(user: dict = Depends(get_user_dep)):
    enforce_forum_access(user)
    cats = []
    for c in FORUM_CATEGORIES:
        thread_count = await db.forum_threads.count_documents({"category": c["id"]})
        last = await db.forum_threads.find_one({"category": c["id"]}, sort=[("last_activity_at", -1)])
        cats.append({**c, "thread_count": thread_count, "last_activity_at": last["last_activity_at"] if last else None})
    return cats


@api.get("/forum/threads")
async def list_forum_threads(category: str, user: dict = Depends(get_user_dep)):
    enforce_forum_access(user)
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
    enforce_forum_post(user)
    if not any(c["id"] == req.category for c in FORUM_CATEGORIES):
        raise HTTPException(404, "Catégorie introuvable")
    title = req.title.strip()
    content_html = sanitize_maintenance_html(req.content_html or req.content or "", max_len=12000)
    plain = strip_forum_plain(content_html) or req.content.strip()
    if len(title) < 5 or len(title) > 120:
        raise HTTPException(400, "Titre 5-120 caractères")
    if len(plain) < 10 or len(plain) > 5000:
        raise HTTPException(400, "Message 10-5000 caractères")
    thread_id = f"thr_{uuid.uuid4().hex[:12]}"
    now_iso = now_utc().isoformat()
    thread = {
        "thread_id": thread_id, "category": req.category,
        "user_id": user["user_id"], "title": title,
        "content": plain, "content_html": content_html,
        "replies_count": 0, "views": 0,
        "pinned": False, "locked": False,
        "created_at": now_iso, "last_activity_at": now_iso,
    }
    await db.forum_threads.insert_one(thread)
    await progress_quests(user["user_id"], "forum_thread", 1)
    await grant_xp(user["user_id"], 30, "forum_thread")
    await add_chronicle(user["user_id"], f"A ouvert le débat « {title} »", "forum")
    await grant_badge(user["user_id"], "scholar")
    thread.pop("_id", None)
    return thread


@api.get("/forum/threads/{thread_id}")
async def get_forum_thread(thread_id: str, user: dict = Depends(get_user_dep)):
    enforce_forum_access(user)
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
    content_html: Optional[str] = None


@api.post("/forum/threads/{thread_id}/replies")
async def reply_thread(thread_id: str, req: ForumReplyReq, user: dict = Depends(get_user_dep)):
    enforce_forum_post(user)
    thread = await db.forum_threads.find_one({"thread_id": thread_id})
    if not thread:
        raise HTTPException(404, "Sujet introuvable")
    if thread.get("locked"):
        raise HTTPException(403, "Sujet verrouillé")
    content_html = sanitize_maintenance_html(req.content_html or req.content or "", max_len=4000)
    plain = strip_forum_plain(content_html) or req.content.strip()
    if len(plain) < 2 or len(plain) > 2000:
        raise HTTPException(400, "Message 2-2000 caractères")
    reply = {
        "reply_id": f"rpl_{uuid.uuid4().hex[:12]}",
        "thread_id": thread_id, "user_id": user["user_id"],
        "content": plain, "content_html": content_html,
        "created_at": now_utc().isoformat(),
    }
    await db.forum_replies.insert_one(reply)
    await db.forum_threads.update_one({"thread_id": thread_id},
        {"$inc": {"replies_count": 1}, "$set": {"last_activity_at": now_utc().isoformat()}})
    await progress_quests(user["user_id"], "forum_reply", 1)
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


@api.get("/forum/recent")
async def forum_recent(limit: int = 8, user: dict = Depends(get_user_dep)):
    enforce_forum_access(user)
    limit = max(1, min(limit, 20))
    threads = await db.forum_threads.find(
        {},
        {"_id": 0, "thread_id": 1, "category": 1, "title": 1, "last_activity_at": 1, "replies_count": 1, "views": 1},
    ).sort("last_activity_at", -1).limit(limit).to_list(limit)
    return threads


@api.get("/admin/pulse")
async def admin_pulse(user: dict = Depends(get_staff_dep)):
    from datetime import timedelta
    now = now_utc()
    week_ago = (now - timedelta(days=7)).isoformat()
    day_ago = (now - timedelta(days=1)).isoformat()
    enabled, _ = await is_maintenance_active()
    online_open = await is_online_open()
    open_tickets = await db.tickets.count_documents({"status": {"$ne": "closed"}})
    open_reports = await db.reports.count_documents({"status": "open"})
    banned = await db.users.count_documents({"banned_until": {"$gt": now.isoformat()}})
    return {
        "maintenance_enabled": enabled,
        "online_open": online_open,
        "open_tickets": open_tickets,
        "open_reports": open_reports,
        "banned_users": banned,
        "new_users_week": await db.users.count_documents({"created_at": {"$gte": week_ago}}),
        "forum_threads": await db.forum_threads.count_documents({}),
        "forum_replies": await db.forum_replies.count_documents({}),
        "threads_today": await db.forum_threads.count_documents({"created_at": {"$gte": day_ago}}),
        "replies_today": await db.forum_replies.count_documents({"created_at": {"$gte": day_ago}}),
        "active_sessions": await count_site_online(),
    }


class ForumThreadEditReq(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    content_html: Optional[str] = None


@api.put("/forum/threads/{thread_id}")
async def edit_forum_thread(thread_id: str, req: ForumThreadEditReq, user: dict = Depends(get_staff_dep)):
    thread = await db.forum_threads.find_one({"thread_id": thread_id})
    if not thread:
        raise HTTPException(404, "Sujet introuvable")
    title = (req.title or thread.get("title", "")).strip()
    content_html = sanitize_maintenance_html(req.content_html or req.content or thread.get("content_html") or thread.get("content", ""), max_len=12000)
    plain = strip_forum_plain(content_html)
    if len(title) < 5 or len(title) > 120:
        raise HTTPException(400, "Titre 5-120 caractères")
    if len(plain) < 10:
        raise HTTPException(400, "Message trop court")
    await db.forum_threads.update_one(
        {"thread_id": thread_id},
        {"$set": {"title": title, "content": plain, "content_html": content_html, "edited_at": now_utc().isoformat(), "edited_by": user["user_id"]}},
    )
    return {"ok": True}


class ForumReplyEditReq(BaseModel):
    content: str
    content_html: Optional[str] = None


@api.put("/forum/replies/{reply_id}")
async def edit_forum_reply(reply_id: str, req: ForumReplyEditReq, user: dict = Depends(get_staff_dep)):
    reply = await db.forum_replies.find_one({"reply_id": reply_id})
    if not reply:
        raise HTTPException(404, "Réponse introuvable")
    content_html = sanitize_maintenance_html(req.content_html or req.content or "", max_len=4000)
    plain = strip_forum_plain(content_html) or req.content.strip()
    if len(plain) < 2:
        raise HTTPException(400, "Message trop court")
    await db.forum_replies.update_one(
        {"reply_id": reply_id},
        {"$set": {"content": plain, "content_html": content_html, "edited_at": now_utc().isoformat(), "edited_by": user["user_id"]}},
    )
    return {"ok": True}


@api.get("/admin/forum/search-user")
async def admin_forum_search_user(q: str, user: dict = Depends(get_staff_dep)):
    q = (q or "").strip()
    if len(q) < 2:
        raise HTTPException(400, "Recherche trop courte")
    doc = await db.users.find_one(
        {"username": {"$regex": q, "$options": "i"}},
        {
            "_id": 0, "user_id": 1, "username": 1, "role": 1, "level": 1,
            "forum_banned_until": 1, "forum_ban_reason": 1,
            "forum_muted_until": 1, "forum_mute_reason": 1,
            "banned_until": 1, "ban_reason": 1,
        },
    )
    if not doc:
        raise HTTPException(404, "Héros introuvable")
    return doc


@api.get("/admin/forum/threads")
async def admin_forum_threads(user: dict = Depends(get_staff_dep)):
    threads = await db.forum_threads.find({}, {"_id": 0}).sort("last_activity_at", -1).limit(80).to_list(80)
    user_ids = list({t["user_id"] for t in threads})
    udocs = await db.users.find(
        {"user_id": {"$in": user_ids}},
        {"_id": 0, "user_id": 1, "username": 1, "role": 1, "level": 1, "forum_muted_until": 1, "forum_banned_until": 1},
    ).to_list(100)
    umap = {u["user_id"]: u for u in udocs}
    cat_map = {c["id"]: c["name"] for c in FORUM_CATEGORIES}
    for t in threads:
        t["author"] = umap.get(t["user_id"], {})
        t["category_name"] = cat_map.get(t["category"], t["category"])
    return threads


@api.delete("/forum/replies/{reply_id}")
async def delete_forum_reply(reply_id: str, user: dict = Depends(get_user_dep)):
    reply = await db.forum_replies.find_one({"reply_id": reply_id})
    if not reply:
        raise HTTPException(404, "Réponse introuvable")
    is_staff = user.get("role") in ("admin", "moderator")
    if not is_staff and reply["user_id"] != user["user_id"]:
        raise HTTPException(403, "Action interdite")
    await db.forum_replies.delete_one({"reply_id": reply_id})
    await db.forum_threads.update_one(
        {"thread_id": reply["thread_id"]},
        {"$inc": {"replies_count": -1}},
    )
    return {"ok": True}


class ForumCleanupReq(BaseModel):
    mode: str  # stale_zero | older_than | orphan_replies
    days: int = 30
    confirm: str = ""


@api.post("/admin/forum/cleanup")
async def admin_forum_cleanup(req: ForumCleanupReq, user: dict = Depends(get_admin_dep)):
    """Purge forum content — destructive, admin only."""
    if req.confirm.strip().upper() != "NETTOYER":
        raise HTTPException(400, 'Tapez « NETTOYER » pour confirmer')
    cutoff = (now_utc() - timedelta(days=max(1, min(req.days, 3650)))).isoformat()
    deleted_threads = 0
    deleted_replies = 0

    if req.mode == "stale_zero":
        stale = await db.forum_threads.find(
            {"replies_count": {"$lte": 0}, "created_at": {"$lt": cutoff}},
            {"thread_id": 1, "_id": 0},
        ).to_list(5000)
        for t in stale:
            await db.forum_replies.delete_many({"thread_id": t["thread_id"]})
            await db.forum_threads.delete_one({"thread_id": t["thread_id"]})
            deleted_threads += 1
    elif req.mode == "older_than":
        old = await db.forum_threads.find(
            {"created_at": {"$lt": cutoff}},
            {"thread_id": 1, "_id": 0},
        ).to_list(10000)
        for t in old:
            r = await db.forum_replies.delete_many({"thread_id": t["thread_id"]})
            deleted_replies += r.deleted_count
            await db.forum_threads.delete_one({"thread_id": t["thread_id"]})
            deleted_threads += 1
    elif req.mode == "orphan_replies":
        thread_ids = {t["thread_id"] for t in await db.forum_threads.find({}, {"thread_id": 1, "_id": 0}).to_list(50000)}
        orphans = await db.forum_replies.find(
            {"thread_id": {"$nin": list(thread_ids)}},
            {"reply_id": 1, "_id": 0},
        ).to_list(50000)
        for reply in orphans:
            await db.forum_replies.delete_one({"reply_id": reply["reply_id"]})
            deleted_replies += 1
    else:
        raise HTTPException(400, "Mode invalide (stale_zero | older_than | orphan_replies)")

    await add_chronicle(user["user_id"], f"Nettoyage forum ({req.mode}) — {deleted_threads} sujets, {deleted_replies} réponses", "admin")
    return {
        "ok": True,
        "mode": req.mode,
        "deleted_threads": deleted_threads,
        "deleted_replies": deleted_replies,
    }


class ForumMuteReq(BaseModel):
    duration_hours: int = 24
    reason: str = "Comportement inapproprié sur le forum"


@api.post("/forum/moderation/mute/{user_id}")
async def forum_mute_user(user_id: str, req: ForumMuteReq, user: dict = Depends(get_staff_dep)):
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(404, "Utilisateur introuvable")
    if target.get("role") == "admin":
        raise HTTPException(400, "Impossible de muter un admin")
    if user.get("role") == "moderator" and target.get("role") in ("admin", "moderator"):
        raise HTTPException(403, "Action interdite")
    hours = max(1, min(req.duration_hours, 24 * 30))
    muted_until = (now_utc() + timedelta(hours=hours)).isoformat()
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"forum_muted_until": muted_until, "forum_mute_reason": req.reason[:300]}},
    )
    await add_chronicle(user_id, f"Mute forum {hours}h par {user['username']}", "forum_mute")
    return {"ok": True, "forum_muted_until": muted_until}


@api.post("/forum/moderation/unmute/{user_id}")
async def forum_unmute_user(user_id: str, user: dict = Depends(get_staff_dep)):
    await db.users.update_one(
        {"user_id": user_id},
        {"$unset": {"forum_muted_until": "", "forum_mute_reason": ""}},
    )
    return {"ok": True}


@api.post("/forum/moderation/ban/{user_id}")
async def forum_ban_user(user_id: str, req: BanReq, user: dict = Depends(get_staff_dep)):
    """Exclusion du forum uniquement — n'affecte PAS l'accès au site."""
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(404, "Utilisateur introuvable")
    if target.get("role") == "admin":
        raise HTTPException(400, "Impossible d'exclure un admin du forum")
    if user.get("role") == "moderator" and target.get("role") in ("admin", "moderator"):
        raise HTTPException(403, "Action interdite")
    hours = max(1, min(req.duration_hours, 24 * 365 * 10))
    banned_until = (now_utc() + timedelta(hours=hours)).isoformat()
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "forum_banned_until": banned_until,
                "forum_ban_reason": req.reason[:300],
            },
            "$unset": {"forum_muted_until": "", "forum_mute_reason": ""},
        },
    )
    await add_chronicle(user_id, f"Exclu de la Tribune {hours}h par {user['username']}", "forum_ban")
    return {"ok": True, "forum_banned_until": banned_until, "reason": req.reason[:300]}


@api.post("/forum/moderation/unban/{user_id}")
async def forum_unban_user(user_id: str, user: dict = Depends(get_staff_dep)):
    await db.users.update_one(
        {"user_id": user_id},
        {"$unset": {"forum_banned_until": "", "forum_ban_reason": ""}},
    )
    await add_chronicle(user_id, f"Exclusion forum levée par {user['username']}", "forum_unban")
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
    alert_doc = {
        "alert_id": f"season_{season_id}",
        "title": f"⚔ Nouvelle saison — {req.name}",
        "message": req.description[:500] or f"La saison « {req.name} » est ouverte !",
        "sound": "war",
        "issued_by": user["username"],
        "created_at": start.isoformat(),
        "expires_at": (start + timedelta(minutes=30)).isoformat(),
        "kind": "season",
    }
    await db.broadcasts.insert_one(alert_doc)
    all_users = await db.users.find({}, {"_id": 0, "user_id": 1}).to_list(5000)
    for u in all_users:
        await push_notification(db, u["user_id"], "season_start",
            f"Saison « {req.name} » ouverte", req.description[:200], "war", "Sparkles")
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
        # Passe Saison : récompenses doublées pour les détenteurs du pass.
        has_pass = await db.user_passes.find_one(
            {"user_id": row["user_id"], "season_id": season_id}, {"_id": 0}
        )
        if reward_aether:
            if has_pass:
                reward_aether *= SEASON_PASS_REWARD_MULTIPLIER
            label = " (Passe Saison ×2)" if has_pass else ""
            await grant_aether(row["user_id"], reward_aether, f"Récompense de saison (rang #{rank}){label}")
            await push_notification(db, row["user_id"], "season_reward",
                f"Récompense saison #{rank}", f"+{reward_aether} Écus{label}", "coin", "Coins")
        elif has_pass:
            # Hors Top 50 mais détenteur du pass : récompense de participation.
            await grant_aether(row["user_id"], 500, "Passe Saison — récompense de participation")
            await push_notification(db, row["user_id"], "season_reward",
                "Passe Saison", "+500 Écus pour votre participation à la saison", "coin", "Ticket")
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


@app.middleware("http")
async def maintenance_gate(request: Request, call_next):
    """Block non-staff API access while global maintenance is active."""
    # CORS preflight must never be blocked — browsers send OPTIONS without auth headers.
    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path
    if not path.startswith("/api"):
        return await call_next(request)
    norm = path.rstrip("/") or path
    if norm in MAINTENANCE_PUBLIC_PATHS or any(norm.startswith(p) for p in ("/api/maintenance/", "/api/online/")):
        return await call_next(request)
    blocked, reason, message = await _site_access_block()
    if not blocked:
        return await call_next(request)
    # Allow authenticated staff through
    try:
        user = await get_current_user(request, db)
        if is_staff_user(user):
            return await call_next(request)
    except HTTPException:
        pass
    # Allow beta testers holding a valid key cookie
    if reason == "maintenance" and await has_beta_access(request):
        return await call_next(request)
    return JSONResponse(
        status_code=503,
        content={
            "detail": message,
            "maintenance": reason == "maintenance",
        },
        headers={
            "X-Maintenance-Mode": "1" if reason == "maintenance" else "0",
        },
    )


# ---------- Startup ----------

# ============================================================================
# FRIENDS — Liens de fraternité
# ============================================================================
class FriendReq(BaseModel):
    target_username: str


@api.post("/friends/request")
async def send_friend_request(req: FriendReq, user: dict = Depends(get_user_dep)):
    target_username = (req.target_username or "").strip()
    if len(target_username) < 3:
        raise HTTPException(400, "Pseudo invalide")
    target = await find_user_by_username(target_username, {"user_id": 1, "username": 1})
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
        f"{user['username']} souhaite vous lier", "Acceptez ou refusez le pacte d'amitié", "ding", "UserPlus", link="/friends")
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
        f"{user['username']} a accepté votre demande", "Un nouveau lien d'amitié est forgé", "ding", "Users", link="/friends")
    return {"ok": True}


@api.post("/friends/requests/{request_id}/decline")
async def decline_friend_request(request_id: str, user: dict = Depends(get_user_dep)):
    req_doc = await db.friend_requests.find_one({"request_id": request_id, "to_user": user["user_id"]})
    if not req_doc or req_doc["status"] != "pending":
        raise HTTPException(404, "Demande introuvable")
    await db.friend_requests.update_one({"request_id": request_id}, {"$set": {"status": "declined", "responded_at": now_utc().isoformat()}})
    return {"ok": True}


def _nexus_online_ids():
    try:
        import nexus_world
        return nexus_world.get_online_user_ids()
    except Exception:
        return set()


def _enrich_friends_online(friends: list) -> list:
    online = _nexus_online_ids()
    for f in friends:
        f["online"] = f.get("user_id") in online
    return friends


@api.get("/friends")
async def list_friends(user: dict = Depends(get_user_dep)):
    links = await db.friendships.find(
        {"$or": [{"user_a": user["user_id"]}, {"user_b": user["user_id"]}]}, {"_id": 0}
    ).to_list(500)
    friend_ids = [link["user_b"] if link["user_a"] == user["user_id"] else link["user_a"] for link in links]
    friends = await db.users.find({"user_id": {"$in": friend_ids}},
        {"_id": 0, "user_id": 1, "username": 1, "level": 1, "class_id": 1, "class_name": 1,
         "role": 1, "avatar_url": 1, "rank": 1}).to_list(500)
    return _enrich_friends_online(friends)


@api.get("/friends/requests/count")
async def friend_requests_count(user: dict = Depends(get_user_dep)):
    n = await db.friend_requests.count_documents({"to_user": user["user_id"], "status": "pending"})
    return {"count": n}


@api.delete("/friends/{target_user_id}")
async def unfriend(target_user_id: str, user: dict = Depends(get_user_dep)):
    a, b = sorted([user["user_id"], target_user_id])
    result = await db.friendships.delete_one({"user_a": a, "user_b": b})
    if not result.deleted_count:
        raise HTTPException(404, "Lien d'amitié introuvable")
    return {"ok": True}


def _friend_pair_key(a: str, b: str) -> str:
    x, y = sorted([a, b])
    return f"{x}|{y}"


async def _are_friends(user_a: str, user_b: str) -> bool:
    a, b = sorted([user_a, user_b])
    return bool(await db.friendships.find_one({"user_a": a, "user_b": b}))


class FriendMessageReq(BaseModel):
    text: str


@api.get("/friends/chat/threads")
async def list_friend_chat_threads(user: dict = Depends(get_user_dep)):
    """Conversations with accepted friends — last message + unread count."""
    links = await db.friendships.find(
        {"$or": [{"user_a": user["user_id"]}, {"user_b": user["user_id"]}]}, {"_id": 0}
    ).to_list(500)
    friend_ids = [
        link["user_b"] if link["user_a"] == user["user_id"] else link["user_a"]
        for link in links
    ]
    if not friend_ids:
        return []
    friends = await db.users.find(
        {"user_id": {"$in": friend_ids}},
        {"_id": 0, "user_id": 1, "username": 1, "level": 1, "class_id": 1, "class_name": 1,
         "role": 1, "avatar_url": 1, "rank": 1},
    ).to_list(500)
    fmap = {f["user_id"]: f for f in friends}
    online = _nexus_online_ids()
    threads = []
    for fid in friend_ids:
        fdoc = fmap.get(fid)
        if not fdoc:
            continue
        fdoc = dict(fdoc)
        fdoc["online"] = fid in online
        pair = _friend_pair_key(user["user_id"], fid)
        last = await db.friend_messages.find_one(
            {"pair_key": pair}, {"_id": 0}, sort=[("created_at", -1)]
        )
        unread = await db.friend_messages.count_documents({
            "pair_key": pair, "to_user": user["user_id"], "read": False,
        })
        threads.append({
            "friend": fdoc,
            "last_message": last,
            "unread": unread,
        })
    threads.sort(
        key=lambda t: (t["last_message"] or {}).get("created_at", ""),
        reverse=True,
    )
    return threads


@api.get("/friends/chat/{friend_id}/messages")
async def get_friend_messages(
    friend_id: str,
    user: dict = Depends(get_user_dep),
    limit: int = 80,
    before: str | None = None,
):
    if not await _are_friends(user["user_id"], friend_id):
        raise HTTPException(403, "Vous n'êtes pas liés à ce héros")
    pair = _friend_pair_key(user["user_id"], friend_id)
    q = {"pair_key": pair}
    if before:
        q["created_at"] = {"$lt": before}
    msgs = await db.friend_messages.find(q, {"_id": 0}).sort("created_at", -1).limit(min(limit, 100)).to_list(100)
    msgs.reverse()
    await db.friend_messages.update_many(
        {"pair_key": pair, "to_user": user["user_id"], "read": False},
        {"$set": {"read": True, "read_at": now_utc().isoformat()}},
    )
    return msgs


@api.post("/friends/chat/{friend_id}/messages")
async def send_friend_message(friend_id: str, req: FriendMessageReq, user: dict = Depends(get_user_dep)):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(400, "Message vide")
    if len(text) > 500:
        raise HTTPException(400, "Message trop long (500 caractères max)")
    if not await _are_friends(user["user_id"], friend_id):
        raise HTTPException(403, "Vous n'êtes pas liés à ce héros")
    friend = await db.users.find_one({"user_id": friend_id}, {"_id": 0, "user_id": 1, "username": 1})
    if not friend:
        raise HTTPException(404, "Héros introuvable")
    pair = _friend_pair_key(user["user_id"], friend_id)
    message_id = f"fmsg_{uuid.uuid4().hex[:12]}"
    doc = {
        "message_id": message_id,
        "pair_key": pair,
        "from_user": user["user_id"],
        "to_user": friend_id,
        "text": text,
        "read": False,
        "created_at": now_utc().isoformat(),
    }
    await db.friend_messages.insert_one(doc)
    await progress_quests(user["user_id"], "friend_message", 1)
    push_doc = {k: v for k, v in doc.items() if k != "_id"}
    push_doc["from_username"] = user.get("username") or "Héros"
    try:
        import nexus_world
        await nexus_world.push_to_user(friend_id, "friend_message:new", push_doc)
    except Exception:
        pass
    try:
        await push_notification(
            db, friend_id, "friend_message",
            f"Message de {push_doc['from_username']}",
            text[:120] + ("…" if len(text) > 120 else ""),
            "ding", "MessageCircle",
            link=f"/friends?chat={user['user_id']}",
        )
    except Exception:
        pass
    return push_doc


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
    await push_staff_alert(
        db, "staff_ticket",
        "Nouvelle doléance",
        f"{user['username']} — {subject[:80]}",
        sound="war", icon="Ticket",
        link="/admin?tab=tickets",
    )
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
    if is_staff and t["user_id"] != user["user_id"]:
        preview = content[:120] + ("…" if len(content) > 120 else "")
        await push_notification(db, t["user_id"], "ticket_reply",
            f"Le Conseil a répondu à « {t['subject'][:60]} »",
            preview, "ding", "MessageCircle",
            link=f"/tickets")
    elif not is_staff:
        await push_staff_alert(
            db, "staff_ticket_reply",
            "Réponse joueur — doléance",
            f"{user['username']} sur « {t['subject'][:60]} »",
            sound="chime", icon="MessageCircle",
            link="/admin?tab=tickets",
        )
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
# REPORTS — Signalements joueurs / contenus
# ============================================================================
REPORT_TARGET_TYPES = {"forum_thread", "forum_reply", "user", "news_article"}
REPORT_REASONS = {"spam", "harassment", "inappropriate", "cheating", "other"}


class ReportCreateReq(BaseModel):
    target_type: str
    target_id: str
    reported_user_id: Optional[str] = None
    reason: str = "other"
    details: str = ""


@api.post("/reports")
async def create_report(req: ReportCreateReq, user: dict = Depends(get_user_dep)):
    if req.target_type not in REPORT_TARGET_TYPES:
        raise HTTPException(400, "Type de signalement invalide")
    if req.reason not in REPORT_REASONS:
        raise HTTPException(400, "Motif invalide")
    details = (req.details or "").strip()[:1000]
    if len(details) < 5:
        raise HTTPException(400, "Décrivez le problème (5 caractères minimum)")
    cutoff = (now_utc() - timedelta(hours=24)).isoformat()
    dup = await db.reports.find_one({
        "reporter_id": user["user_id"],
        "target_type": req.target_type,
        "target_id": req.target_id,
        "created_at": {"$gte": cutoff},
    })
    if dup:
        raise HTTPException(400, "Vous avez déjà signalé ce contenu récemment")
    reported_user_id = req.reported_user_id
    context_label = ""
    extra_thread_id = None
    if req.target_type == "forum_thread":
        doc = await db.forum_threads.find_one({"thread_id": req.target_id}, {"_id": 0, "title": 1, "user_id": 1})
        if not doc:
            raise HTTPException(404, "Sujet introuvable")
        reported_user_id = reported_user_id or doc.get("user_id")
        context_label = doc.get("title", "")[:120]
    elif req.target_type == "forum_reply":
        doc = await db.forum_replies.find_one({"reply_id": req.target_id}, {"_id": 0, "user_id": 1, "thread_id": 1})
        if not doc:
            raise HTTPException(404, "Réponse introuvable")
        reported_user_id = reported_user_id or doc.get("user_id")
        context_label = f"Réponse dans {doc.get('thread_id', '?')}"
        extra_thread_id = doc.get("thread_id")
    elif req.target_type == "user":
        doc = await db.users.find_one({"user_id": req.target_id}, {"_id": 0, "username": 1})
        if not doc:
            raise HTTPException(404, "Joueur introuvable")
        reported_user_id = req.target_id
        context_label = f"Joueur {doc.get('username', '?')}"
    elif req.target_type == "news_article":
        doc = await db.news.find_one({"news_id": req.target_id}, {"_id": 0, "title": 1, "author": 1})
        if not doc:
            raise HTTPException(404, "Article introuvable")
        context_label = doc.get("title", "")[:120]
    if reported_user_id == user["user_id"]:
        raise HTTPException(400, "Vous ne pouvez pas vous signaler vous-même")
    reported = None
    if reported_user_id:
        reported = await db.users.find_one({"user_id": reported_user_id}, {"_id": 0, "username": 1})
    report = {
        "report_id": f"rpt_{uuid.uuid4().hex[:12]}",
        "reporter_id": user["user_id"],
        "reporter_username": user["username"],
        "target_type": req.target_type,
        "target_id": req.target_id,
        "reported_user_id": reported_user_id,
        "reported_username": reported.get("username") if reported else None,
        "reason": req.reason,
        "details": details,
        "context_label": context_label,
        "thread_id": extra_thread_id,
        "status": "open",
        "created_at": now_utc().isoformat(),
        "resolved_at": None,
        "resolved_by": None,
    }
    await db.reports.insert_one(report)
    report.pop("_id", None)
    who = reported.get("username") if reported else context_label or req.target_id
    await push_staff_alert(
        db, "staff_report",
        "Signalement reçu",
        f"{user['username']} → {who} ({req.reason})",
        sound="war", icon="Flag",
        link="/admin?tab=reports",
    )
    return report


@api.get("/admin/reports")
async def admin_list_reports(status: str = "open", user: dict = Depends(get_staff_dep)):
    q = {} if status == "all" else {"status": status}
    return await db.reports.find(q, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)


class ReportStatusReq(BaseModel):
    status: str  # open | resolved | dismissed


@api.put("/admin/reports/{report_id}")
async def admin_resolve_report(report_id: str, req: ReportStatusReq, user: dict = Depends(get_staff_dep)):
    if req.status not in ("open", "resolved", "dismissed"):
        raise HTTPException(400, "Statut invalide")
    existing = await db.reports.find_one({"report_id": report_id})
    if not existing:
        raise HTTPException(404, "Signalement introuvable")
    await db.reports.update_one(
        {"report_id": report_id},
        {"$set": {
            "status": req.status,
            "resolved_at": now_utc().isoformat() if req.status != "open" else None,
            "resolved_by": user["username"] if req.status != "open" else None,
        }},
    )
    if req.status == "resolved" and existing.get("status") == "open":
        reporter_id = existing.get("reporter_id")
        if reporter_id:
            await grant_xp(reporter_id, 50, "report_validated")
            await grant_aether(reporter_id, 25, "report_validated")
            try:
                await grant_badge(reporter_id, "guardian_just")
            except Exception:
                pass
            await push_notification(
                db, reporter_id, "report_resolved",
                "Signalement traité",
                "Les modérateurs ont validé votre signalement — merci pour votre vigilance.",
                "ding", "Shield",
            )
    return {"ok": True}


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
    if req.amount > 0:
        await grant_aether(req.target_user_id, req.amount, f"Don du Conseil — {req.reason or 'admin'}")
    else:
        new_aether = max(0, target.get("aether", 0) + req.amount)
        await db.users.update_one({"user_id": req.target_user_id}, {"$set": {"aether": new_aether}})
        await push_wallet_updated(req.target_user_id)
        discord_rewards.schedule_reward_notify(
            db, req.target_user_id, "Retrait du Conseil",
            aether=req.amount,
            extra=[req.reason or "sans motif"],
        )
        await add_chronicle(req.target_user_id,
            f"Le Conseil ({user['username']}) retire {req.amount} Écus · {req.reason or 'sans motif'}",
            "admin")
        return {"ok": True, "new_aether": new_aether}
    new_aether = max(0, target.get("aether", 0) + req.amount)
    sign = "+" if req.amount > 0 else ""
    await add_chronicle(req.target_user_id,
        f"Le Conseil ({user['username']}) accorde {sign}{req.amount} Écus · {req.reason or 'sans motif'}",
        "admin")
    await push_notification(db, req.target_user_id, "aether_grant",
        f"{sign}{req.amount} Écus du Conseil",
        req.reason or "Don administratif", "coin", "Coins")
    await push_wallet_updated(req.target_user_id)
    return {"ok": True, "new_aether": new_aether}


# ============================================================================
# DISCORD ROLE SYNC — endpoints
# ============================================================================
@api.post("/discord/sync-me")
async def discord_sync_me(user: dict = Depends(get_user_dep)):
    """User-triggered sync: Discord profile (nick, avatar) + guild roles."""
    result = await discord_sync.sync_discord_roles(db, user["user_id"])
    if result.get("ok") or result.get("profile_updated"):
        fresh = await db.users.find_one({"user_id": user["user_id"]})
        if fresh:
            result["user"] = public_user(fresh)
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
async def public_stats(request: Request):
    """Lightweight public counters for the Landing/Dashboard pages."""
    viewer = await get_optional_user_dep(request)
    if viewer:
        await touch_user_last_seen(viewer["user_id"], min_interval_seconds=60)
    try:
        heroes = await db.users.count_documents({})
        guilds = await db.guilds.count_documents({})
        events_active = 0
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            events_active = await db.scheduled_events.count_documents({
                "$or": [
                    {"ends_at": {"$exists": False}},
                    {"ends_at": None},
                    {"ends_at": ""},
                    {"ends_at": {"$gt": now_iso}},
                ],
            })
        except Exception:
            pass
        # Joueurs connectés sur le site (session valide + activité récente)
        try:
            site_online = await count_site_online()
        except Exception:
            site_online = 0
        # Héros dans le Nexus Online (présence monde)
        try:
            from nexus_world import _players as _nexus_players  # type: ignore
            heroes_online = len({p.get("user_id") for p in _nexus_players.values() if p.get("user_id")})
        except Exception:
            heroes_online = 0
        try:
            staff_online = nexus_world.staff_online_summary()
        except Exception:
            staff_online = {"total": 0, "by_role": {"admin": 0, "moderator": 0}, "members": []}
        # New signups in the last 24h
        try:
            yesterday_iso = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
            new_signups = await db.users.count_documents({"created_at": {"$gt": yesterday_iso}})
        except Exception:
            new_signups = 0
        # Visits 24h — joueurs uniques avec session ou last_seen récente
        try:
            session_users = await db.user_sessions.distinct(
                "user_id", {"created_at": {"$gt": yesterday_iso}},
            )
            seen_users = await db.users.distinct(
                "user_id", {"last_seen": {"$gt": yesterday_iso}},
            )
            visits_today = len(set(session_users) | set(seen_users))
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
            "site_online": site_online,
            "staff_online": staff_online,
            "guilds": guilds,
            "events": events_active,
            "new_signups": new_signups,
            "visits_today": visits_today,
            "server_stability": server_stability,
        }
    except Exception:
        return {"heroes": 0, "heroes_online": 0, "site_online": 0, "guilds": 0, "events": 0,
                "new_signups": 0, "visits_today": 0, "server_stability": 99.9}


@api.get("/users/{user_id}/card")
async def hero_card(user_id: str, viewer: dict = Depends(get_user_dep)):
    """Premium hero card: profile + badges + inventory + chronicles + equipment + stats + guild."""
    u = await db.users.find_one({"user_id": user_id}, {
        "_id": 0, "password_hash": 0, "google_id": 0,
    })
    if not u:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if not await _hero_card_visible_to(viewer, u):
        reason = "private" if u.get("profile_visibility") == "private" else "friends_only"
        return {
            "hidden": True,
            "reason": reason,
            "username": u["username"],
            "display_name": u.get("display_name") or u["username"],
        }
    inv = await db.inventory.find({"user_id": user_id}, {"_id": 0}).sort("obtained_at", -1).to_list(200)
    badges = await db.user_badges.find({"user_id": user_id}, {"_id": 0}).sort("unlocked_at", -1).to_list(120)
    badges = enrich_badges(badges)
    chronicles = await db.chronicles.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(40).to_list(40)
    friends_count = await db.friendships.count_documents({
        "$or": [{"user_a": user_id}, {"user_b": user_id}],
    })
    guild = None
    guild_tag = None
    membership = await db.guild_members.find_one({"user_id": user_id}, {"_id": 0})
    if membership:
        guild = await db.guilds.find_one(
            {"guild_id": membership["guild_id"]},
            {"_id": 0, "guild_id": 1, "name": 1, "tag": 1, "color": 1, "level": 1},
        )
        if guild:
            guild = {**guild, "rank": membership.get("rank", "membre")}
            guild_tag = guild.get("tag")
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
    friend_request_pending = False
    if viewer["user_id"] != user_id:
        a, b = sorted([viewer["user_id"], user_id])
        is_friend = bool(await db.friendships.find_one({"user_a": a, "user_b": b}))
        if not is_friend:
            friend_request_pending = bool(await db.friend_requests.find_one({
                "from_user": viewer["user_id"], "to_user": user_id, "status": "pending",
            }))
    incoming_friend_request = None
    if viewer["user_id"] != user_id and not is_friend:
        inc = await db.friend_requests.find_one(
            {"from_user": user_id, "to_user": viewer["user_id"], "status": "pending"},
            {"_id": 0, "request_id": 1, "from_user": 1, "created_at": 1},
        )
        if inc:
            incoming_friend_request = inc
    # Friends preview for Relations tab
    friend_links = await db.friendships.find(
        {"$or": [{"user_a": user_id}, {"user_b": user_id}]}, {"_id": 0},
    ).sort("since", -1).limit(24).to_list(24)
    friend_ids = [
        link["user_b"] if link["user_a"] == user_id else link["user_a"]
        for link in friend_links
    ]
    friends = []
    if friend_ids:
        friends = await db.users.find(
            {"user_id": {"$in": friend_ids}},
            {"_id": 0, "user_id": 1, "username": 1, "level": 1, "class_name": 1,
             "rank": 1, "role": 1, "avatar_url": 1, "active_title": 1},
        ).to_list(24)
    # Equipped cosmetics (frame / banner from shop)
    equipped_cosmetics = {}
    if u.get("active_frame"):
        frame_item = get_shop_item(u["active_frame"])
        if frame_item:
            equipped_cosmetics["frame"] = {**frame_item, "sku": u["active_frame"], "slot": "frame"}
    if u.get("active_banner"):
        banner_item = get_shop_item(u["active_banner"])
        if banner_item:
            equipped_cosmetics["banner"] = {**banner_item, "sku": u["active_banner"], "slot": "banner"}
    title_id = u.get("active_title", "novice")
    title_doc = next((t for t in TITLES if t["id"] == title_id), None)
    active_aura = {
        "title_id": title_id,
        "title_name": title_doc["name"] if title_doc else title_id.replace("_", " ").title(),
        "rank": u.get("rank", "Novice"),
    }
    u["active_title_name"] = active_aura["title_name"]
    # VIP status recomputed from vip_until (never trust stored is_vip alone).
    u["is_vip"] = is_vip_active(u)
    u["vip_until"] = iso(u.get("vip_until")) if u.get("vip_until") else None
    u["vip_plan"] = u.get("vip_plan")
    titles_progress = [
        {
            "id": t["id"], "name": t["name"], "unlock_level": t["unlock_level"],
            "unlocked": (u.get("level") or 1) >= t["unlock_level"],
            "active": t["id"] == title_id,
        }
        for t in TITLES
    ]
    quests_completed = await db.user_quests.count_documents({"user_id": user_id, "completed": True})
    return {
        "hidden": False,
        "user": {**u, "quests_completed": quests_completed},
        "inventory": inv,
        "badges": badges,
        "chronicles": chronicles,
        "friends_count": friends_count,
        "friends": friends,
        "guild": guild,
        "guild_tag": guild_tag,
        "location": location,
        "is_friend": is_friend,
        "friend_request_pending": friend_request_pending,
        "incoming_friend_request": incoming_friend_request,
        "is_self": viewer["user_id"] == user_id,
        "equipped_cosmetics": equipped_cosmetics,
        "active_aura": active_aura,
        "titles_progress": titles_progress,
        "dna": u.get("dna") or {},
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
app.mount("/uploads", StaticFiles(directory=str(ROOT_DIR / "uploads")), name="uploads")

# Mount the Nexus Online (Socket.IO) ASGI app.
# Tried /api/nexus first but the Starlette Mount does not bind cleanly under the
# already-included APIRouter prefix. Mounting at /api/realtime/nexus works.
# Mount the Nexus Online (Socket.IO) ASGI app under root.
# The socketio_path is configured as 'api/nexus/socket.io' so requests to
# /api/nexus/socket.io/... go through ingress (which only forwards /api).
# We attach the socketio ASGIApp as a fallback after all FastAPI routes.
_nexus_asgi = nexus_world.build_socketio_app(db, hooks={
    "on_chat_message": on_nexus_chat_message,
    "on_boss_defeated": on_boss_defeated,
    "on_nexus_join": on_nexus_join,
})
app.mount("/api/nexus", _nexus_asgi)



_vip_expiry_task = None


async def revoke_vip_perks(uid: str, active_title: str | None = None):
    """Strip every VIP advantage when the Pass Ascendant ends.

    Removes: is_vip flag, VIP badge, VIP title ownership (and resets the active
    title if it was the VIP one), the Discord VIP role, and pushes a live profile
    update so Nexus visuals (aura, golden name) disappear immediately.
    The +10% XP/Écus boosts and daily bonus chest stop on their own since they are
    recomputed from is_vip_active().
    """
    set_fields = {"is_vip": False}
    if active_title == VIP_TITLE_ID:
        set_fields["active_title"] = "novice"
    await db.users.update_one({"user_id": uid}, {"$set": set_fields})
    try:
        await db.user_badges.delete_one({"user_id": uid, "badge_id": VIP_BADGE_ID})
        await db.user_titles.delete_one({"user_id": uid, "title_id": VIP_TITLE_ID})
    except Exception as e:  # noqa: BLE001
        logger.warning("revoke_vip_perks cleanup failed for %s: %s", uid, e)
    if DISCORD_VIP_ROLE_ID:
        discord_sync.schedule_remove_role(db, uid, DISCORD_VIP_ROLE_ID, "NEXORIA — Pass Ascendant expiré")
    try:
        patch = {"user_id": uid, "is_vip": False}
        if active_title == VIP_TITLE_ID:
            patch["active_title"] = "novice"
        await nexus_world.push_profile_updated(uid, patch)
    except Exception:
        pass
    try:
        await push_notification(
            db, uid, "vip",
            "Pass Ascendant expiré",
            "Ton statut VIP a pris fin. Renouvelle-le dans la boutique pour conserver tes avantages.",
            "ding", "Gem", link="/shop",
        )
    except Exception:
        pass
    logger.info("VIP perks revoked for user=%s", uid)


async def _vip_expiry_loop(interval: int = 300):
    """Periodically downgrade expired VIPs: clear is_vip, remove Discord role, notify."""
    logger.info("VIP expiry watcher running (every %ss)", interval)
    while True:
        try:
            now_iso = now_utc().isoformat()
            expired = await db.users.find(
                {"is_vip": True, "vip_until": {"$lt": now_iso}},
                {"user_id": 1, "active_title": 1, "_id": 0},
            ).to_list(500)
            for u in expired:
                await revoke_vip_perks(u["user_id"], u.get("active_title"))
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001
            logger.warning("VIP expiry loop error: %s", e)
        await asyncio.sleep(interval)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("username", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.posts.create_index("post_id", unique=True)
    await db.posts.create_index("created_at")
    await db.user_badges.create_index([("user_id", 1), ("badge_id", 1)], unique=True)
    await db.nexus_messages.create_index([("user_id", 1), ("created_at", -1)])
    await db.chronicles.create_index([("user_id", 1), ("created_at", -1)])
    await db.user_quests.create_index("user_id_quest_id", unique=True, sparse=True)
    await db.gm_audit_log.create_index([("created_at", -1)])
    await db.friend_requests.create_index([("to_user", 1), ("status", 1)])
    await db.friend_messages.create_index([("pair_key", 1), ("created_at", -1)])
    await db.friend_messages.create_index([("to_user", 1), ("read", 1)])
    await db.users.create_index("referral_code", sparse=True)
    await db.referrals.create_index("referred_id", unique=True, sparse=True)
    await db.referrals.create_index([("referrer_id", 1), ("created_at", -1)])
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

    await enforce_owner_roles()

    if MAINTENANCE_MODE_ENV:
        await db.system_settings.update_one(
            {"key": "maintenance"},
            {"$set": {
                "enabled": True,
                "message": os.environ.get(
                    "MAINTENANCE_MESSAGE",
                    "Les Sentinelles restaurent l'équilibre du monde.",
                ),
                "updated_at": now_utc().isoformat(),
                "updated_by": "env:MAINTENANCE_MODE",
            }},
            upsert=True,
        )
        logger.info("NEXORIA: MAINTENANCE_MODE=true — site verrouillé (staff autorisé)")

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

    # Auto-sync Discord roles/ranks on a rotating 30s schedule.
    try:
        discord_sync.start_periodic_sync(db, interval=30)
    except Exception as e:
        logger.warning(f"NEXORIA: could not start Discord periodic sync — {e}")

    # VIP « Pass Ascendant » expiry watcher.
    global _vip_expiry_task
    try:
        _vip_expiry_task = asyncio.create_task(_vip_expiry_loop(300))
    except Exception as e:
        logger.warning(f"NEXORIA: could not start VIP expiry watcher — {e}")

    logger.info("NEXORIA backend started")


@app.on_event("shutdown")
async def shutdown():
    try:
        discord_sync.stop_periodic_sync()
    except Exception:
        pass
    try:
        if _vip_expiry_task:
            _vip_expiry_task.cancel()
    except Exception:
        pass
    client.close()
