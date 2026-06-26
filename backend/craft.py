"""Forge du Nexus — logique craft (backend autoritaire)."""
from __future__ import annotations

import logging
import secrets
import uuid
from datetime import datetime, timezone

from craft_data import (
    CRAFT_RECIPES,
    CRAFT_RESOURCES,
    CRAFT_MILESTONES,
    FAIL_COMPENSATION,
    get_craft_tier,
    public_recipe,
    public_resource,
    resource_id_from_name,
)

logger = logging.getLogger("nexoria.craft")

_hooks: dict = {}


def register_craft_hooks(hooks: dict) -> None:
    global _hooks
    _hooks = hooks or {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def seed_craft_recipes(db) -> int:
    """Insère/met à jour les recettes de base sans doublons."""
    count = 0
    for recipe in CRAFT_RECIPES:
        doc = {**recipe, "updated_at": _now_iso()}
        await db.craft_recipes.update_one(
            {"id": recipe["id"]},
            {"$set": doc, "$setOnInsert": {"created_at": _now_iso()}},
            upsert=True,
        )
        count += 1
    return count


async def _get_recipes(db) -> list[dict]:
    rows = await db.craft_recipes.find({"isActive": True}, {"_id": 0}).to_list(200)
    if not rows:
        await seed_craft_recipes(db)
        rows = await db.craft_recipes.find({"isActive": True}, {"_id": 0}).to_list(200)
    return rows


async def _inventory_material_counts(db, user_id: str) -> dict[str, int]:
    """Quantités matériaux dans l'inventaire, mappées par resource_id."""
    counts: dict[str, int] = {rid: 0 for rid in CRAFT_RESOURCES}
    cursor = db.inventory.find(
        {"user_id": user_id, "type": "material"},
        {"_id": 0, "name": 1, "quantity": 1},
    )
    async for row in cursor:
        rid = resource_id_from_name(row.get("name") or "")
        if rid:
            counts[rid] = counts.get(rid, 0) + int(row.get("quantity") or 1)
    return counts


async def sync_player_resources(db, user_id: str) -> dict[str, int]:
    """Synchronise player_resources depuis l'inventaire (migration / rattrapage)."""
    inv_counts = await _inventory_material_counts(db, user_id)
    doc = await db.player_resources.find_one({"user_id": user_id}, {"_id": 0})
    merged = dict(doc.get("resources", {})) if doc else {}
    changed = False
    for rid, qty in inv_counts.items():
        if qty > int(merged.get(rid, 0)):
            merged[rid] = qty
            changed = True
    if not doc:
        changed = True
    if changed:
        await db.player_resources.update_one(
            {"user_id": user_id},
            {
                "$set": {"resources": merged, "updated_at": _now_iso()},
                "$setOnInsert": {"user_id": user_id, "created_at": _now_iso()},
            },
            upsert=True,
        )
    return merged


async def get_player_resources(db, user_id: str) -> list[dict]:
    counts = await sync_player_resources(db, user_id)
    return [public_resource(rid, counts.get(rid, 0)) for rid in CRAFT_RESOURCES]


async def grant_player_resource(db, user_id: str, resource_id: str, quantity: int = 1) -> None:
    """Crédite une ressource craft (+ inventaire matériau pour cohérence)."""
    if resource_id not in CRAFT_RESOURCES or quantity <= 0:
        return
    meta = CRAFT_RESOURCES[resource_id]
    await db.player_resources.update_one(
        {"user_id": user_id},
        {
            "$inc": {f"resources.{resource_id}": quantity},
            "$set": {"updated_at": _now_iso()},
            "$setOnInsert": {"user_id": user_id, "created_at": _now_iso()},
        },
        upsert=True,
    )
    give_relic = _hooks.get("_give_relic")
    if give_relic:
        await give_relic(user_id, {
            "name": meta["name"],
            "type": "material",
            "rarity": "rare",
            "icon": meta.get("icon", "Sparkles"),
            "quantity": quantity,
        })


async def grant_player_resource_by_name(db, user_id: str, name: str, quantity: int = 1) -> None:
    rid = resource_id_from_name(name)
    if rid:
        await grant_player_resource(db, user_id, rid, quantity)


async def _take_player_resources(db, user_id: str, required: dict[str, int]) -> dict[str, int]:
    """Retire les ressources (player_resources + inventaire). Lève ValueError si insuffisant."""
    doc = await db.player_resources.find_one({"user_id": user_id}, {"_id": 0, "resources": 1})
    current = dict((doc or {}).get("resources") or {})
    for rid, need in required.items():
        if int(current.get(rid, 0)) < int(need):
            raise ValueError(f"missing_resource:{rid}")

    inc_fields = {f"resources.{rid}": -int(qty) for rid, qty in required.items()}
    await db.player_resources.update_one(
        {"user_id": user_id},
        {"$inc": inc_fields, "$set": {"updated_at": _now_iso()}},
    )

    take_from_inv = _hooks.get("_take_material_by_name")
    if take_from_inv:
        for rid, qty in required.items():
            name = CRAFT_RESOURCES[rid]["name"]
            await take_from_inv(user_id, name, int(qty))
    return required


async def get_recipes_public(db) -> list[dict]:
    rows = await _get_recipes(db)
    return [public_recipe(r) for r in rows if r.get("isActive", True)]


async def get_craft_history(db, user_id: str, limit: int = 25) -> list[dict]:
    rows = await db.craft_history.find(
        {"user_id": user_id}, {"_id": 0},
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return rows


_EPIC_RARITIES = frozenset({"epic", "legendary", "mythic", "divine", "cosmic"})


async def get_craft_stats(db, user_id: str) -> dict:
    attempts = await db.craft_history.count_documents({"user_id": user_id})
    successes = await db.craft_history.count_documents({"user_id": user_id, "success": True})
    failures = max(0, attempts - successes)
    legendary_successes = await db.craft_history.count_documents({
        "user_id": user_id,
        "success": True,
        "recipe_rarity": "legendary",
    })
    epic_successes = await db.craft_history.count_documents({
        "user_id": user_id,
        "success": True,
        "recipe_rarity": {"$in": list(_EPIC_RARITIES)},
    })
    return {
        "attempts": attempts,
        "successes": successes,
        "failures": failures,
        "legendary_successes": legendary_successes,
        "epic_successes": epic_successes,
    }


def _metric_value(stats: dict, metric: str) -> int:
    return int(stats.get(metric, 0) or 0)


async def get_craft_progress(db, user_id: str) -> dict:
    stats = await get_craft_stats(db, user_id)
    user = await db.users.find_one({"user_id": user_id}, {"craft_milestones_claimed": 1, "_id": 0}) or {}
    claimed = set(user.get("craft_milestones_claimed") or [])
    tier_info = get_craft_tier(stats["attempts"])
    current_tier = tier_info["current"]
    next_tier = tier_info["next"]
    if next_tier:
        span = max(1, next_tier["min"] - current_tier["min"])
        tier_progress = {
            "current": max(0, stats["attempts"] - current_tier["min"]),
            "needed": span,
            "percent": round(min(100.0, max(0, stats["attempts"] - current_tier["min"]) / span * 100), 1),
        }
    else:
        tier_progress = {"current": stats["attempts"], "needed": stats["attempts"] or 1, "percent": 100.0}

    milestones = []
    for ms in CRAFT_MILESTONES:
        key = ms["key"]
        val = _metric_value(stats, ms["metric"])
        milestones.append({
            "key": key,
            "threshold": ms["threshold"],
            "metric": ms["metric"],
            "label": ms["label"],
            "type": ms["type"],
            "reached": val >= ms["threshold"],
            "claimed": key in claimed,
            "progress": min(val, ms["threshold"]),
        })

    grant = _hooks.get("grant_badge")
    if grant:
        resources = await sync_player_resources(db, user_id)
        if all(int(resources.get(rid, 0)) > 0 for rid in CRAFT_RESOURCES):
            await grant(user_id, "craft_hoarder")

    return {
        **stats,
        "tier": current_tier,
        "nextTier": next_tier,
        "tierProgress": tier_progress,
        "milestones": milestones,
    }


async def _check_craft_badges(db, user_id: str, stats: dict, success: bool, recipe: dict) -> None:
    grant = _hooks.get("grant_badge")
    if not grant:
        return
    attempts = stats["attempts"]
    successes = stats["successes"]
    failures = stats["failures"]

    if attempts >= 1:
        await grant(user_id, "craft_apprentice")
    if successes >= 1:
        await grant(user_id, "craft_first_success")
    if attempts >= 10:
        await grant(user_id, "craft_forger_10")
    if attempts >= 50:
        await grant(user_id, "craft_forger_50")
    if successes >= 25:
        await grant(user_id, "craft_master")
    if successes >= 100:
        await grant(user_id, "craft_grandmaster")
    if failures >= 5:
        await grant(user_id, "craft_resilient")

    if success:
        rarity = recipe.get("rarity") or ""
        if rarity in _EPIC_RARITIES:
            await grant(user_id, "craft_epic_smith")
        if rarity == "legendary":
            await grant(user_id, "craft_legend_smith")
        if recipe.get("id") == "obsidian_blade":
            await grant(user_id, "craft_obsidian")

    resources = await sync_player_resources(db, user_id)
    if all(int(resources.get(rid, 0)) > 0 for rid in CRAFT_RESOURCES):
        await grant(user_id, "craft_hoarder")


async def _process_craft_milestones(db, user_id: str, stats: dict) -> None:
    user = await db.users.find_one({"user_id": user_id}, {"craft_milestones_claimed": 1, "_id": 0}) or {}
    claimed = set(user.get("craft_milestones_claimed") or [])
    grant_badge = _hooks.get("grant_badge")
    grant_aether = _hooks.get("grant_aether")
    grant_xp = _hooks.get("grant_xp")
    notify = _hooks.get("push_craft_notification")

    for ms in CRAFT_MILESTONES:
        key = ms["key"]
        if key in claimed:
            continue
        if _metric_value(stats, ms["metric"]) < ms["threshold"]:
            continue

        mtype = ms["type"]
        if mtype == "aether" and grant_aether:
            await grant_aether(user_id, int(ms["amount"]), "Palier Forge du Nexus")
        elif mtype == "xp" and grant_xp:
            await grant_xp(user_id, int(ms["amount"]), "craft_milestone")
        elif mtype == "badge" and grant_badge:
            await grant_badge(user_id, ms["badge_id"])
        elif mtype == "multi":
            if grant_badge and ms.get("badge_id"):
                await grant_badge(user_id, ms["badge_id"])
            if grant_aether and ms.get("amount"):
                await grant_aether(user_id, int(ms["amount"]), "Palier Forge du Nexus")

        await db.users.update_one(
            {"user_id": user_id},
            {"$addToSet": {"craft_milestones_claimed": key}},
        )
        claimed.add(key)
        if notify:
            await notify(user_id, ms["label"])


async def _after_craft(db, user_id: str, recipe: dict, success: bool) -> dict:
    stats = await get_craft_stats(db, user_id)
    await _check_craft_badges(db, user_id, stats, success, recipe)
    await _process_craft_milestones(db, user_id, stats)

    progress_quests = _hooks.get("progress_quests")
    if progress_quests:
        await progress_quests(user_id, "craft", 1)
        if success:
            await progress_quests(user_id, "craft_success", 1)
            rarity = recipe.get("rarity") or ""
            if rarity in _EPIC_RARITIES:
                await progress_quests(user_id, "craft_epic_success", 1)

    return await get_craft_progress(db, user_id)


async def execute_craft(db, user_id: str, recipe_id: str) -> dict:
    from fastapi import HTTPException

    recipes = {r["id"]: r for r in await _get_recipes(db)}
    recipe = recipes.get(recipe_id)
    if not recipe:
        logger.warning("craft missing recipe user=%s recipe=%s", user_id, recipe_id)
        raise HTTPException(404, "Recette introuvable")
    if not recipe.get("isActive", True):
        raise HTTPException(400, "Cette recette n'est plus disponible")

    await sync_player_resources(db, user_id)

    cooldown = int(recipe.get("cooldownSeconds") or 0)
    if cooldown > 0:
        last = await db.craft_history.find_one(
            {"user_id": user_id, "recipe_id": recipe_id},
            sort=[("created_at", -1)],
        )
        if last and last.get("created_at"):
            try:
                last_ts = datetime.fromisoformat(last["created_at"].replace("Z", "+00:00"))
                elapsed = (datetime.now(timezone.utc) - last_ts).total_seconds()
                if elapsed < cooldown:
                    wait = int(cooldown - elapsed)
                    raise HTTPException(429, f"Forge en recharge — réessayez dans {wait}s")
            except HTTPException:
                raise
            except Exception:
                pass

    required = {k: int(v) for k, v in (recipe.get("requiredResources") or {}).items()}
    cost_ecus = int(recipe.get("costEcus") or 0)

    doc = await db.player_resources.find_one({"user_id": user_id}, {"resources": 1})
    owned = dict((doc or {}).get("resources") or {})
    for rid, need in required.items():
        if int(owned.get(rid, 0)) < need:
            logger.info("craft missing resources user=%s recipe=%s rid=%s need=%s have=%s",
                        user_id, recipe_id, rid, need, owned.get(rid, 0))
            raise HTTPException(400, f"Ressources insuffisantes ({CRAFT_RESOURCES.get(rid, {}).get('name', rid)})")

    fresh = await db.users.find_one({"user_id": user_id}, {"aether": 1})
    if cost_ecus > int((fresh or {}).get("aether") or 0):
        logger.info("craft missing ecus user=%s recipe=%s cost=%s", user_id, recipe_id, cost_ecus)
        raise HTTPException(400, f"Écus insuffisants ({cost_ecus} requis)")

    spend_aether = _hooks.get("spend_aether")
    if spend_aether and cost_ecus > 0:
        await spend_aether(user_id, cost_ecus, f"Forge : {recipe['name']}")

    try:
        await _take_player_resources(db, user_id, required)
    except ValueError as e:
        if cost_ecus > 0 and _hooks.get("refund_aether"):
            await _hooks["refund_aether"](user_id, cost_ecus, f"Remboursement forge : {recipe['name']}")
        raise HTTPException(400, "Ressources insuffisantes") from e

    rate = float(recipe.get("successRate") or 1.0)
    roll = secrets.randbelow(10000) / 10000.0
    success = roll < rate

    result_item = None
    compensation = None

    if success:
        give_relic = _hooks.get("_give_relic")
        result_item = dict(recipe.get("resultItem") or {})
        result_item["quantity"] = 1
        if give_relic:
            await give_relic(user_id, result_item)
        add_chronicle = _hooks.get("add_chronicle")
        if add_chronicle:
            item_name = result_item.get("name", recipe["name"])
            await add_chronicle(
                user_id,
                f"A forgé « {item_name} » à la Forge du Nexus",
                "craft",
                i18n_key="chronicle.craft.success",
                i18n_params={
                    "item_id": result_item.get("id") or recipe.get("id"),
                    "item": item_name,
                },
            )
        logger.info("craft success user=%s recipe=%s", user_id, recipe_id)
    else:
        comp_id = FAIL_COMPENSATION["resource_id"]
        comp_qty = int(FAIL_COMPENSATION["quantity"])
        await grant_player_resource(db, user_id, comp_id, comp_qty)
        compensation = public_resource(comp_id, comp_qty)
        logger.info("craft failed user=%s recipe=%s roll=%.4f rate=%.4f", user_id, recipe_id, roll, rate)

    push_inventory = _hooks.get("push_inventory_updated")
    if push_inventory:
        await push_inventory(user_id, "craft", {"recipe_id": recipe_id, "success": success})

    entry = {
        "craft_id": f"craft_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "recipe_id": recipe_id,
        "recipe_name": recipe["name"],
        "recipe_rarity": recipe.get("rarity"),
        "recipe_category": recipe.get("category"),
        "success": success,
        "cost_ecus": cost_ecus,
        "resources_spent": required,
        "success_rate": rate,
        "roll": round(roll, 4),
        "result_item": result_item,
        "compensation": compensation,
        "created_at": _now_iso(),
    }
    await db.craft_history.insert_one(entry)
    entry.pop("_id", None)

    progress = await _after_craft(db, user_id, recipe, success)

    resources_after = await get_player_resources(db, user_id)
    wallet = await db.users.find_one({"user_id": user_id}, {"aether": 1})

    return {
        "success": success,
        "recipeId": recipe_id,
        "recipeName": recipe["name"],
        "costEcus": cost_ecus,
        "resourcesSpent": required,
        "resultItem": result_item,
        "compensation": compensation,
        "successRate": rate,
        "resources": resources_after,
        "ecus": int((wallet or {}).get("aether") or 0),
        "historyEntry": {k: v for k, v in entry.items() if k != "user_id"},
        "progress": progress,
    }
