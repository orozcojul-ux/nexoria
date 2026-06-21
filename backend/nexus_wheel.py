"""Roue du Nexus — logique métier (cooldown, spin, historique)."""
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

from nexus_wheel_data import (
    WHEEL_COOLDOWN_HOURS,
    WHEEL_VERSION,
    WHEEL_DAILY_SPINS_DEFAULT,
    WHEEL_DAILY_SPINS_VIP,
    NEXUS_WHEEL_REWARDS,
    pick_wheel_reward,
    public_reward,
    reward_segment_index,
)


def _parse_iso(value) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _daily_spin_limit(is_vip: bool) -> int:
    return WHEEL_DAILY_SPINS_VIP if is_vip else WHEEL_DAILY_SPINS_DEFAULT


async def _recent_spins(db, user_id: str) -> list:
    since = (datetime.now(timezone.utc) - timedelta(hours=WHEEL_COOLDOWN_HOURS)).isoformat()
    return await db.nexus_wheel_spins.find(
        {"user_id": user_id, "created_at": {"$gte": since}},
        {"_id": 0, "created_at": 1},
    ).sort("created_at", 1).to_list(WHEEL_DAILY_SPINS_VIP + 1)


async def wheel_spin_state(db, user_id: str, is_vip: bool = False) -> dict:
    """Quota de tours sur fenêtre glissante 24 h (1 standard, 3 VIP)."""
    limit = _daily_spin_limit(is_vip)
    recent = await _recent_spins(db, user_id)
    used = len(recent)
    remaining = max(0, limit - used)
    now = datetime.now(timezone.utc)

    if remaining > 0:
        last_dt = _parse_iso(recent[-1]["created_at"]) if recent else None
        return {
            "canSpin": True,
            "lastSpinAt": last_dt.isoformat() if last_dt else None,
            "nextSpinAt": None,
            "secondsRemaining": 0,
            "dailySpinLimit": limit,
            "spinsUsed": used,
            "spinsRemaining": remaining,
        }

    oldest_dt = _parse_iso(recent[0]["created_at"]) if recent else None
    next_dt = (oldest_dt + timedelta(hours=WHEEL_COOLDOWN_HOURS)) if oldest_dt else now
    remaining_sec = max(0, int((next_dt - now).total_seconds()))
    last_dt = _parse_iso(recent[-1]["created_at"]) if recent else None
    return {
        "canSpin": False,
        "lastSpinAt": last_dt.isoformat() if last_dt else None,
        "nextSpinAt": next_dt.isoformat(),
        "secondsRemaining": remaining_sec,
        "dailySpinLimit": limit,
        "spinsUsed": used,
        "spinsRemaining": 0,
    }


def wheel_timing(last_spin_at) -> dict:
    """Compat legacy — préférer wheel_spin_state."""
    now = datetime.now(timezone.utc)
    last_dt = _parse_iso(last_spin_at)
    if not last_dt:
        return {
            "canSpin": True,
            "lastSpinAt": None,
            "nextSpinAt": None,
            "secondsRemaining": 0,
        }
    next_dt = last_dt + timedelta(hours=WHEEL_COOLDOWN_HOURS)
    if now >= next_dt:
        return {
            "canSpin": True,
            "lastSpinAt": last_dt.isoformat(),
            "nextSpinAt": None,
            "secondsRemaining": 0,
        }
    remaining = int((next_dt - now).total_seconds())
    return {
        "canSpin": False,
        "lastSpinAt": last_dt.isoformat(),
        "nextSpinAt": next_dt.isoformat(),
        "secondsRemaining": max(0, remaining),
    }


async def get_wheel_status(db, user_id: str, is_vip: bool = False) -> dict:
    user = await db.users.find_one(
        {"user_id": user_id},
        {"last_nexus_wheel_at": 1, "aether": 1, "vip_until": 1, "_id": 0},
    )
    timing = await wheel_spin_state(db, user_id, is_vip)
    bonus = int((user or {}).get("nexus_wheel_bonus_spins", 0) or 0)
    return {
        **timing,
        "ecus": int((user or {}).get("aether", 0) or 0),
        "cooldownHours": WHEEL_COOLDOWN_HOURS,
        "wheelVersion": WHEEL_VERSION,
        "isVip": bool(is_vip),
        "bonusSpinsAvailable": bonus,
        "rewards": [public_reward(r) for r in NEXUS_WHEEL_REWARDS],
    }


async def apply_wheel_reward(db, user_id: str, reward: dict, helpers: dict) -> dict:
    """Applique la récompense via les helpers injectés depuis server.py."""
    grant_aether = helpers["grant_aether"]
    grant_xp = helpers["grant_xp"]
    open_chest = helpers["open_chest"]
    give_relic = helpers["_give_relic"]
    grant_badge = helpers["grant_badge"]
    add_chronicle = helpers["add_chronicle"]
    push_wallet = helpers["push_wallet_updated"]
    push_inventory = helpers["push_inventory_updated"]

    applied = {"type": reward["type"], "details": {}}
    rtype = reward["type"]

    if rtype == "aether":
        amount = int(reward.get("rewardEcus") or reward.get("amount") or 0)
        await grant_aether(user_id, amount, "Roue du Nexus")
        applied["details"] = {"ecus": amount, "rewardEcus": amount}
    elif rtype == "xp":
        amount = int(reward.get("amount") or 0)
        await grant_xp(user_id, amount, "nexus_wheel")
        applied["details"] = {"xp": amount}
    elif rtype == "resource":
        qty = int(reward.get("amount") or 1)
        name = reward.get("resource_name") or "Ressource du Nexus"
        rarity = "common" if reward.get("rarity") == "common" else "rare"
        icon = reward.get("icon") or "Sparkles"
        grant_craft = helpers.get("grant_craft_resource")
        if grant_craft:
            await grant_craft(user_id, name, qty)
        else:
            await give_relic(user_id, {
                "name": name,
                "type": "material",
                "rarity": rarity,
                "icon": icon,
                "quantity": qty,
            })
        applied["details"] = {"resource": name, "quantity": qty}
    elif rtype == "chest":
        from fastapi import HTTPException as FastHTTPException
        try:
            items = await open_chest(user_id, min_rarity=reward.get("min_rarity"))
            applied["details"] = {"items": items}
        except FastHTTPException:
            fallback = 150 if reward.get("min_rarity") else 75
            await grant_aether(user_id, fallback, "Roue du Nexus (coffre — inventaire plein)")
            applied["details"] = {"fallbackEcus": fallback, "reason": "inventory_full"}
    elif rtype == "blessing":
        hours = int(reward.get("duration_hours") or 24)
        expires = (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()
        await db.user_boosts.update_many(
            {"user_id": user_id, "boost_type": "nexus_wheel_blessing"},
            {"$set": {"expires_at": datetime.now(timezone.utc).isoformat()}},
        )
        await db.user_boosts.insert_one({
            "user_id": user_id,
            "sku": "nexus_wheel_blessing",
            "boost_type": "nexus_wheel_blessing",
            "boost_value": 1.05,
            "expires_at": expires,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source": "nexus_wheel",
        })
        badge_id = reward.get("badge_id")
        if badge_id:
            await grant_badge(user_id, badge_id)
        applied["details"] = {"blessingUntil": expires, "badge_id": badge_id}
    elif rtype == "none":
        applied["details"] = {"flavor": reward.get("flavor") or reward.get("description")}

    try:
        await add_chronicle(user_id, f"Roue du Nexus : {reward['label']}", "wheel")
        await push_wallet(user_id)
        if rtype in ("resource", "chest"):
            await push_inventory(user_id, "nexus_wheel", {"reward_id": reward["id"]})
    except Exception:
        pass

    return applied


async def _check_wheel_badges(db, user_id: str, reward: dict, helpers: dict) -> None:
    grant_badge = helpers.get("grant_badge")
    if not grant_badge:
        return
    total = await db.nexus_wheel_spins.count_documents({"user_id": user_id})
    if total >= 1:
        await grant_badge(user_id, "wheel_first_spin")
    if total >= 7:
        await grant_badge(user_id, "wheel_spinner_7")
    if total >= 30:
        await grant_badge(user_id, "wheel_spinner_30")
    if total >= 100:
        await grant_badge(user_id, "wheel_spinner_100")
    if reward.get("rarity") == "legendary":
        await grant_badge(user_id, "wheel_lucky")


async def spin_wheel(db, user: dict, helpers: dict) -> dict:
    user_id = user["user_id"]
    is_vip = bool(helpers.get("is_vip_active") and helpers["is_vip_active"](user))
    timing = await wheel_spin_state(db, user_id, is_vip)
    if not timing["canSpin"]:
        raise ValueError("COOLDOWN")

    reward = pick_wheel_reward()
    now_iso = datetime.now(timezone.utc).isoformat()
    applied = await apply_wheel_reward(db, user_id, reward, helpers)

    spin_doc = {
        "spin_id": f"wheel_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "reward_id": reward["id"],
        "reward": public_reward(reward),
        "applied": applied,
        "wheel_version": WHEEL_VERSION,
        "bonus_spin": False,
        "vip_spin": is_vip,
        "created_at": now_iso,
    }
    await db.nexus_wheel_spins.insert_one(spin_doc)
    await db.users.update_one({"user_id": user_id}, {"$set": {"last_nexus_wheel_at": now_iso}})

    progress_quests = helpers.get("progress_quests")
    if progress_quests:
        await progress_quests(user_id, "nexus_wheel_spin", 1)
    await _check_wheel_badges(db, user_id, reward, helpers)

    updated = await db.users.find_one({"user_id": user_id}, {"aether": 1, "_id": 0})
    new_timing = await wheel_spin_state(db, user_id, is_vip)

    return {
        "reward": public_reward(reward),
        "segmentIndex": reward_segment_index(reward["id"]),
        "applied": applied,
        "ecus": int(updated.get("aether", 0) or 0),
        **new_timing,
    }


async def get_wheel_history(db, user_id: str, limit: int = 15) -> list:
    rows = await db.nexus_wheel_spins.find(
        {"user_id": user_id},
        {"_id": 0},
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return rows
