"""Routes API Naria — modération site."""
from __future__ import annotations

from typing import Optional

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

import naria_moderation as naria

router = APIRouter()


def register_naria_routes(api, *, db, get_user_dep, get_staff_dep, now_utc):
    """Monte les routes sur le router API principal."""

    @api.get("/moderation/status")
    async def moderation_status(user: dict = Depends(get_user_dep)):
        detail = naria.moderation_restriction_detail(user)
        score_doc = await naria.get_user_score_doc(db, user["user_id"])
        return {
            "restricted": bool(detail),
            "restriction": detail,
            "score": score_doc.get("score", 0),
            "warnings_count": score_doc.get("warnings_count", 0),
        }

    @api.get("/moderation/warnings")
    async def my_warnings(user: dict = Depends(get_user_dep)):
        rows = await db.moderation_warnings.find(
            {"userId": user["user_id"], "status": {"$ne": "dismissed"}},
            {"_id": 0},
        ).sort("createdAt", -1).limit(50).to_list(50)
        return rows

    @api.put("/moderation/warnings/{warning_id}/read")
    async def mark_warning_read(warning_id: str, user: dict = Depends(get_user_dep)):
        r = await db.moderation_warnings.update_one(
            {"warning_id": warning_id, "userId": user["user_id"]},
            {"$set": {"readAt": naria.now_iso()}},
        )
        if r.matched_count == 0:
            raise HTTPException(404, "Avertissement introuvable")
        return {"ok": True}

    @api.get("/admin/moderation/dashboard")
    async def admin_moderation_dashboard(user: dict = Depends(get_staff_dep)):
        pending = await db.moderation_logs.count_documents({"status": "pending_review"})
        warnings_24h = await db.moderation_warnings.count_documents({
            "createdAt": {"$gte": (now_utc() - timedelta(hours=24)).isoformat()},
        })
        hidden = await db.moderation_logs.count_documents({"actionType": "hide"})
        restricted = await db.users.count_documents({
            "moderation_restricted_until": {"$gt": now_utc().isoformat()},
        })
        high_scores = await db.moderation_user_scores.count_documents({"score": {"$gte": 5}})
        bans = await db.moderation_logs.count_documents({"actionType": {"$in": ["ban", "ban_proposed"]}})
        return {
            "pending_alerts": pending,
            "warnings_recent": warnings_24h,
            "hidden_content": hidden,
            "restricted_users": restricted,
            "high_score_users": high_scores,
            "ban_events": bans,
            "auto_ban_enabled": naria.AUTO_BAN_ENABLED,
        }

    @api.get("/admin/moderation/logs")
    async def admin_moderation_logs(
        status: str = "all",
        limit: int = 100,
        user: dict = Depends(get_staff_dep),
    ):
        q = {}
        if status != "all":
            q["status"] = status
        return await db.moderation_logs.find(q, {"_id": 0}).sort("createdAt", -1).limit(min(limit, 200)).to_list(200)

    @api.get("/admin/moderation/warnings")
    async def admin_moderation_warnings(
        user_id: Optional[str] = None,
        user: dict = Depends(get_staff_dep),
    ):
        q = {"userId": user_id} if user_id else {}
        return await db.moderation_warnings.find(q, {"_id": 0}).sort("createdAt", -1).limit(200).to_list(200)

    @api.get("/admin/moderation/scores")
    async def admin_moderation_scores(user: dict = Depends(get_staff_dep)):
        return await db.moderation_user_scores.find(
            {}, {"_id": 0},
        ).sort("score", -1).limit(100).to_list(100)

    class ReviewLogReq(BaseModel):
        status: str
        restore_content: bool = False

    @api.put("/admin/moderation/logs/{log_id}")
    async def admin_review_log(log_id: str, req: ReviewLogReq, user: dict = Depends(get_staff_dep)):
        if req.status not in ("approved", "dismissed", "restored"):
            raise HTTPException(400, "Statut invalide")
        restore = req.restore_content or req.status == "restored"
        log = await naria.review_log(
            db, log_id,
            status=req.status,
            admin_username=user["username"],
            restore_content_flag=restore,
        )
        if not log:
            raise HTTPException(404, "Log introuvable")
        return {"ok": True, "log": log}

    @api.post("/admin/moderation/scores/{user_id}/reset")
    async def admin_reset_score(user_id: str, user: dict = Depends(get_staff_dep)):
        await naria.reset_user_score(db, user_id)
        return {"ok": True}

    class ReduceScoreReq(BaseModel):
        amount: int = Field(2, ge=1, le=20)

    @api.post("/admin/moderation/scores/{user_id}/reduce")
    async def admin_reduce_score(user_id: str, req: ReduceScoreReq, user: dict = Depends(get_staff_dep)):
        new_score = await naria.reduce_user_score(db, user_id, req.amount)
        return {"ok": True, "score": new_score}

    @api.post("/admin/moderation/users/{user_id}/lift-restriction")
    async def admin_lift_restriction(user_id: str, user: dict = Depends(get_staff_dep)):
        await naria.lift_restriction(db, user_id)
        return {"ok": True}

    class ManualWarningReq(BaseModel):
        message: str = Field(..., min_length=5, max_length=500)
        reason: str = Field("", max_length=300)

    @api.post("/admin/moderation/users/{user_id}/warn")
    async def admin_manual_warning(user_id: str, req: ManualWarningReq, user: dict = Depends(get_staff_dep)):
        target = await db.users.find_one({"user_id": user_id}, {"_id": 0, "user_id": 1, "username": 1})
        if not target:
            raise HTTPException(404, "Joueur introuvable")
        import uuid
        from notifications import push_notification

        warning_id = f"mwarn_{uuid.uuid4().hex[:12]}"
        now = naria.now_iso()
        await db.moderation_warnings.insert_one({
            "warning_id": warning_id,
            "userId": user_id,
            "username": target.get("username"),
            "warningMessage": req.message,
            "reason": req.reason or "Avertissement manuel",
            "severity": "medium",
            "contentType": None,
            "contentId": None,
            "createdBy": user["username"],
            "createdAt": now,
            "readAt": None,
            "status": "active",
        })
        await db.moderation_logs.insert_one({
            "log_id": f"mlog_{uuid.uuid4().hex[:12]}",
            "actor": user["username"],
            "actorType": "admin",
            "role": user.get("role"),
            "user_id": user_id,
            "username": target.get("username"),
            "actionType": "warning",
            "reason": req.reason or "Avertissement manuel",
            "severity": "medium",
            "contentType": None,
            "contentId": None,
            "originalTextPreview": req.message[:300],
            "scoreAdded": 0,
            "totalScore": 0,
            "createdAt": now,
            "metadata": {},
            "reviewedBy": user["username"],
            "reviewedAt": now,
            "status": "approved",
        })
        await push_notification(
            db, user_id, "moderation_warning",
            "Avertissement modération", req.message,
            icon="Shield", link="/profile",
        )
        return {"ok": True, "warning_id": warning_id}

    return api
