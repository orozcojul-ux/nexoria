"""Admin economy dashboard routes — admin only."""

from __future__ import annotations

from typing import Callable, Awaitable

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from economy_transactions import (
    build_economy_summary,
    build_items_summary,
    build_top_richest,
    query_transactions,
    record_economy_transaction,
)


class AdjustEcusReq(BaseModel):
    user_id: str = Field(..., min_length=3)
    amount: int = Field(..., description="Positif = ajout, négatif = retrait")
    reason: str = Field(..., min_length=3, max_length=300)
    allow_negative_balance: bool = False


def register_economy_admin_routes(
    api: APIRouter,
    *,
    db,
    get_admin_dep: Callable,
    grant_aether: Callable[..., Awaitable[None]],
    push_wallet_updated: Callable[..., Awaitable[None]],
    add_chronicle: Callable[..., Awaitable[None]],
    now_utc: Callable,
):
    @api.get("/admin/economy/summary")
    async def admin_economy_summary(user: dict = Depends(get_admin_dep)):
        return await build_economy_summary(db)

    @api.get("/admin/economy/transactions")
    async def admin_economy_transactions(
        user: dict = Depends(get_admin_dep),
        date_from: str | None = None,
        date_to: str | None = None,
        user_id: str | None = None,
        username: str | None = None,
        type: str | None = None,
        source: str | None = None,
        min_amount: int | None = None,
        max_amount: int | None = None,
        page: int = 1,
        limit: int = 50,
    ):
        return await query_transactions(
            db,
            date_from=date_from,
            date_to=date_to,
            user_id=user_id,
            username=username,
            tx_type=type,
            source=source,
            min_amount=min_amount,
            max_amount=max_amount,
            page=page,
            limit=limit,
        )

    @api.get("/admin/economy/top-richest")
    async def admin_economy_top_richest(user: dict = Depends(get_admin_dep), limit: int = 20):
        limit = max(1, min(limit, 100))
        return {"items": await build_top_richest(db, limit=limit)}

    @api.get("/admin/economy/items-summary")
    async def admin_economy_items_summary(user: dict = Depends(get_admin_dep)):
        return await build_items_summary(db)

    @api.post("/admin/economy/adjust-ecus")
    async def admin_economy_adjust_ecus(req: AdjustEcusReq, user: dict = Depends(get_admin_dep)):
        if req.amount == 0:
            raise HTTPException(400, "Montant invalide")
        target = await db.users.find_one({"user_id": req.user_id}, {"_id": 0})
        if not target:
            raise HTTPException(404, "Héros introuvable")

        balance_before = int(target.get("aether") or 0)
        balance_after = balance_before + req.amount
        if balance_after < 0 and not req.allow_negative_balance:
            raise HTTPException(400, "Solde insuffisant — le solde ne peut pas être négatif")

        reason = req.reason.strip()
        admin_label = user.get("username") or "admin"

        if req.amount > 0:
            await grant_aether(
                req.user_id,
                req.amount,
                f"Ajustement admin — {reason}",
                source="admin",
                created_by=user.get("user_id"),
                metadata={"admin_username": admin_label},
            )
            fresh = await db.users.find_one({"user_id": req.user_id}, {"aether": 1})
            balance_after = int((fresh or {}).get("aether") or balance_after)
        else:
            new_balance = balance_after if req.allow_negative_balance else max(0, balance_after)
            await db.users.update_one({"user_id": req.user_id}, {"$set": {"aether": new_balance}})
            await push_wallet_updated(req.user_id)
            balance_after = new_balance
            await record_economy_transaction(
                db,
                user_id=req.user_id,
                username=target.get("username"),
                amount=req.amount,
                tx_type="admin_adjustment",
                source="admin",
                reason=f"Ajustement admin — {reason}",
                balance_before=balance_before,
                balance_after=balance_after,
                created_by=user.get("user_id"),
                metadata={"admin_username": admin_label},
            )

        sign = "+" if req.amount > 0 else ""
        await add_chronicle(
            req.user_id,
            f"Le Conseil ({admin_label}) ajuste {sign}{req.amount} Écus — {reason}",
            "admin",
        )

        fresh = await db.users.find_one({"user_id": req.user_id}, {"aether": 1})
        return {
            "ok": True,
            "user_id": req.user_id,
            "username": target.get("username"),
            "amount": req.amount,
            "balance_before": balance_before,
            "balance_after": int((fresh or {}).get("aether") or balance_after),
        }

    return api
