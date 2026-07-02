"""Central economy transaction log for NEXORIA (Écus / users.aether)."""

from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

VALID_TYPES = {"gain", "spend", "admin_adjustment", "refund", "system"}
VALID_SOURCES = {
    "quest", "wheel", "craft", "arena", "combat", "shop", "admin", "event",
    "daily_chest", "p2p", "trade", "guild", "referral", "stripe", "kingdom",
    "rift", "season", "unknown",
}

SOURCE_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("quest", ("quête", "quest:", "quete")),
    ("wheel", ("roue du nexus", "roue")),
    ("craft", ("forge", "palier forge")),
    ("shop", ("achat boutique", "boutique", "remboursement boutique", "achat d'écus", "achat d'écus")),
    ("combat", ("combat :", "combat:")),
    ("arena", ("arène", "arene", "arena")),
    ("admin", ("conseil", "don du conseil", "retrait du conseil", "modification du conseil")),
    ("event", ("événement", "evenement", "saison", "défi communautaire")),
    ("daily_chest", ("coffre", "passive", "connexion")),
    ("p2p", ("envoyé", "envoye", "reçu", "recu", "échange")),
    ("trade", ("trade", "échange")),
    ("guild", ("guilde", "coffre de guilde", "guild")),
    ("referral", ("parrainage",)),
    ("stripe", ("stripe", "ecu_order")),
    ("kingdom", ("royaume", "amélioration royaume")),
    ("rift", ("rift", "faille")),
    ("season", ("récompense de saison", "season")),
]


def infer_economy_source(reason: str | None, explicit: str | None = None) -> str:
    if explicit and explicit in VALID_SOURCES:
        return explicit
    text = (reason or "").lower()
    for source, needles in SOURCE_RULES:
        if any(n in text for n in needles):
            return source
    return "unknown"


def _today_bounds() -> tuple[str, str]:
    now = datetime.now(timezone.utc)
    start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    return start.isoformat(), end.isoformat()


async def record_economy_transaction(
    db,
    *,
    user_id: str,
    amount: int,
    tx_type: str,
    source: str = "unknown",
    reason: str = "",
    username: str | None = None,
    source_id: str | None = None,
    balance_before: int | None = None,
    balance_after: int | None = None,
    created_by: str | None = None,
    metadata: dict | None = None,
    currency: str = "ecus",
) -> None:
    """Append one row to economy_transactions. Never raises."""
    try:
        if not user_id or not amount:
            return
        tx_type = tx_type if tx_type in VALID_TYPES else ("gain" if amount > 0 else "spend")
        source = source if source in VALID_SOURCES else infer_economy_source(reason, source)
        if not username:
            u = await db.users.find_one({"user_id": user_id}, {"username": 1})
            username = (u or {}).get("username") or "Héros"
        doc = {
            "transaction_id": f"etx_{uuid.uuid4().hex[:14]}",
            "user_id": user_id,
            "username": username,
            "type": tx_type,
            "amount": int(amount),
            "currency": currency,
            "source": source,
            "source_id": source_id,
            "reason": (reason or "")[:500],
            "balance_before": balance_before,
            "balance_after": balance_after,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": created_by,
            "metadata": metadata or {},
        }
        await db.economy_transactions.insert_one(doc)
    except Exception as exc:
        logger.warning("record_economy_transaction failed: %s", exc)


async def _sum_transactions(db, start_iso: str, end_iso: str, positive: bool) -> int:
    match = {"created_at": {"$gte": start_iso, "$lt": end_iso}}
    if positive:
        match["amount"] = {"$gt": 0}
    else:
        match["amount"] = {"$lt": 0}
    pipeline = [
        {"$match": match},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    rows = await db.economy_transactions.aggregate(pipeline).to_list(1)
    if not rows:
        return 0
    total = int(rows[0].get("total") or 0)
    return total if positive else abs(total)


async def _count_since(db, collection: str, field: str, start_iso: str, end_iso: str, extra: dict | None = None) -> int:
    try:
        q = {field: {"$gte": start_iso, "$lt": end_iso}, **(extra or {})}
        return await db[collection].count_documents(q)
    except Exception:
        return 0


async def build_economy_summary(db) -> dict[str, Any]:
    start, end = _today_bounds()
    users = await db.users.find({}, {"_id": 0, "user_id": 1, "username": 1, "aether": 1, "level": 1, "class_name": 1, "last_seen": 1}).to_list(50000)
    balances = [max(0, int(u.get("aether") or 0)) for u in users]
    total_circulation = sum(balances)
    avg_balance = round(total_circulation / len(balances), 1) if balances else 0
    median_balance = 0
    if balances:
        s = sorted(balances)
        mid = len(s) // 2
        median_balance = s[mid] if len(s) % 2 else round((s[mid - 1] + s[mid]) / 2, 1)

    richest = None
    if users:
        top = max(users, key=lambda u: int(u.get("aether") or 0))
        richest = {
            "user_id": top.get("user_id"),
            "username": top.get("username"),
            "ecus": int(top.get("aether") or 0),
            "level": top.get("level"),
            "class_name": top.get("class_name"),
            "last_seen": top.get("last_seen"),
        }

    created_today = await _sum_transactions(db, start, end, positive=True)
    spent_today = await _sum_transactions(db, start, end, positive=False)
    tx_today = await _count_since(db, "economy_transactions", "created_at", start, end)

    by_source_rows = await db.economy_transactions.aggregate([
        {"$match": {"created_at": {"$gte": start, "$lt": end}}},
        {"$group": {"_id": "$source", "count": {"$sum": 1}, "volume": {"$sum": {"$abs": "$amount"}}}},
        {"$sort": {"volume": -1}},
    ]).to_list(50)
    by_type_rows = await db.economy_transactions.aggregate([
        {"$match": {"created_at": {"$gte": start, "$lt": end}}},
        {"$group": {"_id": "$type", "count": {"$sum": 1}, "volume": {"$sum": {"$abs": "$amount"}}}},
        {"$sort": {"count": -1}},
    ]).to_list(20)

    crafts_today = await _count_since(db, "craft_history", "created_at", start, end)
    wheel_today = await _count_since(db, "nexus_wheel_spins", "created_at", start, end)
    quests_today = await _count_since(db, "user_quests", "completed_at", start, end, {"completed": True})
    combat_today = await _count_since(db, "combat_kills", "created_at", start, end)
    items_today = await _count_since(db, "inventory", "obtained_at", start, end)

    top_gains = await db.economy_transactions.aggregate([
        {"$match": {"created_at": {"$gte": start, "$lt": end}, "amount": {"$gt": 0}}},
        {"$group": {"_id": "$user_id", "username": {"$first": "$username"}, "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1}},
        {"$limit": 20},
    ]).to_list(20)

    top_spends = await db.economy_transactions.aggregate([
        {"$match": {"created_at": {"$gte": start, "$lt": end}, "amount": {"$lt": 0}}},
        {"$group": {"_id": "$user_id", "username": {"$first": "$username"}, "total": {"$sum": "$amount"}}},
        {"$sort": {"total": 1}},
        {"$limit": 20},
    ]).to_list(20)

    alerts = _build_alerts(
        balances=balances,
        created_today=created_today,
        spent_today=spent_today,
        by_source_rows=by_source_rows,
        richest=richest,
    )

    return {
        "total_ecus_in_circulation": total_circulation,
        "ecus_created_today": created_today,
        "ecus_spent_today": spent_today,
        "average_balance": avg_balance,
        "median_balance": median_balance,
        "richest_player": richest,
        "total_transactions_today": tx_today,
        "crafts_today": crafts_today,
        "wheel_spins_today": wheel_today,
        "quest_rewards_today": quests_today,
        "combat_rewards_today": combat_today,
        "items_created_today": items_today,
        "by_source": [{"source": r["_id"] or "unknown", "count": r["count"], "volume": int(r["volume"])} for r in by_source_rows],
        "by_type": [{"type": r["_id"] or "unknown", "count": r["count"], "volume": int(r["volume"])} for r in by_type_rows],
        "top_gains_today": [{"user_id": r["_id"], "username": r.get("username"), "ecus": int(r["total"])} for r in top_gains],
        "top_spends_today": [{"user_id": r["_id"], "username": r.get("username"), "ecus": abs(int(r["total"]))} for r in top_spends],
        "alerts": alerts,
    }


def _build_alerts(*, balances, created_today, spent_today, by_source_rows, richest) -> list[dict]:
    alerts: list[dict] = []
    if richest and int(richest.get("ecus") or 0) >= 100_000:
        alerts.append({
            "level": "warning",
            "code": "high_balance",
            "message": f"Solde très élevé : {richest['username']} ({richest['ecus']:,} Écus)".replace(",", " "),
        })
    if created_today >= 50_000:
        alerts.append({
            "level": "warning",
            "code": "mass_creation",
            "message": f"Création massive d'Écus aujourd'hui ({created_today:,} Écus)".replace(",", " "),
        })
    admin_vol = next((int(r.get("volume") or 0) for r in by_source_rows if r.get("_id") == "admin"), 0)
    if admin_vol >= 10_000:
        alerts.append({
            "level": "info",
            "code": "admin_rewards",
            "message": f"Volume admin élevé aujourd'hui ({admin_vol:,} Écus)".replace(",", " "),
        })
    unknown_count = next((int(r.get("count") or 0) for r in by_source_rows if r.get("_id") in (None, "unknown")), 0)
    if unknown_count >= 20:
        alerts.append({
            "level": "info",
            "code": "unknown_source",
            "message": f"{unknown_count} transactions avec source inconnue aujourd'hui",
        })
    if balances:
        p99 = sorted(balances)[max(0, int(len(balances) * 0.99) - 1)]
        if p99 > 0 and richest and int(richest.get("ecus") or 0) > p99 * 3:
            alerts.append({
                "level": "warning",
                "code": "outlier_player",
                "message": f"{richest['username']} dépasse largement le percentile 99 ({p99:,} Écus)".replace(",", " "),
            })
    return alerts


async def build_top_richest(db, limit: int = 20) -> list[dict]:
    rows = await db.users.find(
        {},
        {"_id": 0, "user_id": 1, "username": 1, "level": 1, "class_name": 1, "aether": 1, "last_seen": 1},
    ).sort("aether", -1).limit(limit).to_list(limit)
    return [
        {
            "user_id": r.get("user_id"),
            "username": r.get("username"),
            "level": r.get("level"),
            "class_name": r.get("class_name"),
            "ecus": int(r.get("aether") or 0),
            "last_seen": r.get("last_seen"),
        }
        for r in rows
    ]


async def build_items_summary(db) -> dict[str, Any]:
    start, end = _today_bounds()

    top_owned = await db.inventory.aggregate([
        {"$group": {
            "_id": {"name": "$name", "rarity": "$rarity"},
            "total_qty": {"$sum": {"$ifNull": ["$quantity", 1]}},
            "owners": {"$addToSet": "$user_id"},
        }},
        {"$project": {"name": "$_id.name", "rarity": "$_id.rarity", "total_qty": 1, "owner_count": {"$size": "$owners"}}},
        {"$sort": {"total_qty": -1}},
        {"$limit": 20},
    ]).to_list(20)

    rarest = await db.inventory.aggregate([
        {"$group": {
            "_id": {"name": "$name", "rarity": "$rarity"},
            "total_qty": {"$sum": {"$ifNull": ["$quantity", 1]}},
            "owners": {"$addToSet": "$user_id"},
        }},
        {"$project": {"name": "$_id.name", "rarity": "$_id.rarity", "total_qty": 1, "owner_count": {"$size": "$owners"}}},
        {"$sort": {"total_qty": 1, "owner_count": 1}},
        {"$limit": 20},
    ]).to_list(20)

    top_crafts = await db.craft_history.aggregate([
        {"$group": {"_id": "$recipe_id", "name": {"$first": "$recipe_name"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20},
    ]).to_list(20)

    top_wheel = await db.nexus_wheel_spins.aggregate([
        {"$group": {"_id": "$reward_id", "label": {"$first": "$reward.label"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20},
    ]).to_list(20)

    resources = await db.inventory.aggregate([
        {"$match": {"type": "resource"}},
        {"$group": {"_id": "$name", "total_qty": {"$sum": {"$ifNull": ["$quantity", 1]}}}},
        {"$sort": {"total_qty": -1}},
        {"$limit": 20},
    ]).to_list(20)

    items_today = await _count_since(db, "inventory", "obtained_at", start, end)

    return {
        "most_owned_items": [
            {"name": r.get("name"), "rarity": r.get("rarity"), "total_qty": int(r.get("total_qty") or 0), "owner_count": int(r.get("owner_count") or 0)}
            for r in top_owned
        ],
        "rarest_items": [
            {"name": r.get("name"), "rarity": r.get("rarity"), "total_qty": int(r.get("total_qty") or 0), "owner_count": int(r.get("owner_count") or 0)}
            for r in rarest
        ],
        "top_resources": [{"name": r.get("_id"), "total_qty": int(r.get("total_qty") or 0)} for r in resources],
        "top_crafts": [{"recipe_id": r.get("_id"), "name": r.get("name"), "count": int(r.get("count") or 0)} for r in top_crafts],
        "top_wheel_rewards": [{"reward_id": r.get("_id"), "label": r.get("label"), "count": int(r.get("count") or 0)} for r in top_wheel],
        "items_created_today": items_today,
    }


def _username_filter_clause(username: str | None) -> dict[str, Any] | None:
    term = (username or "").strip()
    if not term:
        return None
    pattern = re.escape(term)
    return {"username": {"$regex": pattern, "$options": "i"}}


async def query_transactions(
    db,
    *,
    date_from: str | None = None,
    date_to: str | None = None,
    user_id: str | None = None,
    username: str | None = None,
    tx_type: str | None = None,
    source: str | None = None,
    min_amount: int | None = None,
    max_amount: int | None = None,
    page: int = 1,
    limit: int = 50,
) -> dict[str, Any]:
    q: dict[str, Any] = {}
    if date_from or date_to:
        q["created_at"] = {}
        if date_from:
            q["created_at"]["$gte"] = date_from
        if date_to:
            q["created_at"]["$lte"] = date_to
    if user_id:
        q["user_id"] = user_id
    if username and (username or "").strip():
        pattern = re.escape(username.strip())
        clauses: list[dict[str, Any]] = [
            {"username": {"$regex": pattern, "$options": "i"}},
        ]
        users = await db.users.find(
            {
                "$or": [
                    {"username": {"$regex": pattern, "$options": "i"}},
                    {"display_name": {"$regex": pattern, "$options": "i"}},
                ],
            },
            {"_id": 0, "user_id": 1},
        ).limit(100).to_list(100)
        user_ids = list({u["user_id"] for u in users if u.get("user_id")})
        if user_ids:
            clauses.append({"user_id": {"$in": user_ids}})
        user_filt: dict[str, Any] = {"$or": clauses} if len(clauses) > 1 else clauses[0]
        if q:
            q = {"$and": [q, user_filt]}
        else:
            q = user_filt
    if tx_type and tx_type in VALID_TYPES:
        q["type"] = tx_type
    if source and source in VALID_SOURCES:
        q["source"] = source
    if min_amount is not None or max_amount is not None:
        q["amount"] = {}
        if min_amount is not None:
            q["amount"]["$gte"] = min_amount
        if max_amount is not None:
            q["amount"]["$lte"] = max_amount

    limit = max(1, min(limit, 200))
    page = max(1, page)
    skip = (page - 1) * limit
    total = await db.economy_transactions.count_documents(q)
    rows = await db.economy_transactions.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": rows, "total": total, "page": page, "limit": limit, "pages": max(1, (total + limit - 1) // limit)}
