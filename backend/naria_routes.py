"""Routes API Naria — modération site."""
from __future__ import annotations

import re
from typing import Optional

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

import naria_moderation as naria
from naria_system import (
    COMMUNITY_MODERATION_CONTENT_TYPES,
    NARIA_SYSTEM_KEY,
    NARIA_USERNAME,
    NEXUS_MODERATION_CONTENT_TYPES,
    SHUMI_SYSTEM_KEY,
    SHUMI_USERNAME,
    is_system_user,
)

_OFFICIAL_SENTINEL_USERNAMES = frozenset({NARIA_USERNAME.lower(), SHUMI_USERNAME.lower()})


def _is_duplicate_sentinel_staff(user_doc: dict) -> bool:
    """Évite Naria/Shumi en double (entrée système + compte admin/mod)."""
    if is_system_user(user_doc):
        return True
    uname = (user_doc.get("username") or "").strip().lower()
    return uname in _OFFICIAL_SENTINEL_USERNAMES

router = APIRouter()


def _staff_log_filter() -> dict:
    """Logs émis par un modérateur ou Sage humain (pas Naria / Shumi)."""
    system_actors = [NARIA_USERNAME, SHUMI_USERNAME, "Vigile", "vigile"]
    system_sources = [NARIA_SYSTEM_KEY, SHUMI_SYSTEM_KEY, "vigile"]
    return {
        "$or": [
            {"actionSource": "staff"},
            {"actorType": {"$in": ["admin", "moderator", "staff"]}},
            {
                "$and": [
                    {"role": {"$in": ["admin", "moderator"]}},
                    {"actorName": {"$nin": system_actors}},
                ],
            },
            {
                "$and": [
                    {"actor": {"$exists": True, "$type": "string"}},
                    {"actorName": {"$exists": False}},
                    {"actionSource": {"$nin": system_sources}},
                ],
            },
        ],
    }


def _actor_log_filter(*, user_id: str | None = None, username: str | None = None) -> dict:
    """Logs émis par un acteur précis (modérateur humain, etc.)."""
    clauses: list[dict] = []
    if user_id:
        clauses.append({"actorId": user_id})
    if username:
        clauses.extend([
            {"actorName": username},
            {"actor": username},
        ])
    if not clauses:
        raise HTTPException(400, "Acteur invalide")
    return {"$or": clauses} if len(clauses) > 1 else clauses[0]


async def _resolve_sentinel_log_filter(db, sentinel: str) -> dict:
    key = (sentinel or "").strip()
    lowered = key.lower()
    if lowered.startswith("user:"):
        uid = key[5:].strip()
        if not uid:
            raise HTTPException(400, "Sentinelle invalide")
        doc = await db.users.find_one({"user_id": uid}, {"_id": 0, "user_id": 1, "username": 1, "role": 1})
        if not doc:
            raise HTTPException(404, "Sentinelle introuvable")
        if doc.get("role") not in ("moderator", "admin"):
            raise HTTPException(400, "Cet héros n'est pas modérateur ou Sage")
        return _actor_log_filter(user_id=uid, username=doc.get("username"))
    return _sentinel_log_filter(lowered)


def _sentinel_log_filter(sentinel: str) -> dict:
    key = (sentinel or "").strip().lower()
    if key == NARIA_SYSTEM_KEY:
        community_types = list(COMMUNITY_MODERATION_CONTENT_TYPES)
        return {
            "$or": [
                {"actionSource": NARIA_SYSTEM_KEY},
                {"actorName": NARIA_USERNAME},
                {
                    "$and": [
                        {"actionSource": {"$nin": ["staff", SHUMI_SYSTEM_KEY, "vigile"]}},
                        {"actorType": {"$nin": ["admin", "moderator", "staff"]}},
                        {"contentType": {"$in": community_types}},
                    ],
                },
                {
                    "$and": [
                        {"actionSource": "staff"},
                        {"contentType": {"$in": community_types}},
                    ],
                },
            ],
        }
    if key == SHUMI_SYSTEM_KEY:
        nexus_types = list(NEXUS_MODERATION_CONTENT_TYPES)
        return {
            "$or": [
                {"actionSource": SHUMI_SYSTEM_KEY},
                {"actorName": {"$in": [SHUMI_USERNAME, "Vigile", "vigile"]}},
                {
                    "$and": [
                        {"actionSource": {"$nin": ["staff", NARIA_SYSTEM_KEY]}},
                        {"actorType": {"$nin": ["admin", "moderator", "staff"]}},
                        {"$or": [
                            {"contentType": {"$in": nexus_types}},
                            {"contentType": {"$regex": "^nexus_"}},
                        ]},
                    ],
                },
                {
                    "$and": [
                        {"actionSource": "staff"},
                        {"$or": [
                            {"contentType": {"$in": nexus_types}},
                            {"contentType": {"$regex": "^nexus_"}},
                        ]},
                    ],
                },
            ],
        }
    if key in ("staff", "human", "moderator"):
        return _staff_log_filter()
    raise HTTPException(400, "Sentinelle invalide (all, naria, shumi, staff ou user:{id})")


def register_naria_routes(api, *, db, get_user_dep, get_staff_dep, get_supreme_council_dep, now_utc):
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
    async def admin_moderation_dashboard(user: dict = Depends(get_supreme_council_dep)):
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

    @api.get("/admin/moderation/sentinels")
    async def admin_moderation_sentinels(user: dict = Depends(get_staff_dep)):
        """Liste des sentinelles affichées dans le panel (Naria, Shumi, modérateurs humains)."""
        is_supreme = user.get("role") == "admin" or bool(user.get("is_nexus_supreme"))
        sentinels: list[dict] = []

        if is_supreme:
            sentinels.extend([
                {
                    "key": "naria",
                    "kind": "system",
                    "username": NARIA_USERNAME,
                    "label": NARIA_USERNAME,
                    "subtitleKey": "admin.mod.sentinel.naria",
                    "subtitle": "Forum, profils, fil social, articles, guildes.",
                    "accent": "#A855F7",
                },
                {
                    "key": "shumi",
                    "kind": "system",
                    "username": SHUMI_USERNAME,
                    "label": SHUMI_USERNAME,
                    "subtitleKey": "admin.mod.sentinel.shumi",
                    "subtitle": "Nexus Online — salons temps réel, trade, guildes.",
                    "accent": "#22D3EE",
                },
            ])
            admins = await db.users.find(
                {"role": "admin"},
                {"_id": 0, "user_id": 1, "username": 1, "display_name": 1, "avatar_url": 1},
            ).sort("username", 1).to_list(100)
            for a in admins:
                if _is_duplicate_sentinel_staff(a):
                    continue
                uname = a.get("username") or a["user_id"]
                sentinels.append({
                    "key": f"user:{a['user_id']}",
                    "kind": "admin",
                    "user_id": a["user_id"],
                    "username": uname,
                    "label": uname,
                    "display_name": a.get("display_name") or uname,
                    "avatar_url": a.get("avatar_url"),
                    "subtitleKey": "admin.mod.sentinel.admin",
                    "subtitle": "Sage — actions de modération.",
                    "accent": "#9D4CDD",
                })

        mod_query = {"role": "moderator"}
        if not is_supreme:
            mod_query["user_id"] = user["user_id"]
        mods = await db.users.find(
            mod_query,
            {"_id": 0, "user_id": 1, "username": 1, "display_name": 1, "avatar_url": 1},
        ).sort("username", 1).to_list(100)

        for m in mods:
            if _is_duplicate_sentinel_staff(m):
                continue
            uname = m.get("username") or m["user_id"]
            sentinels.append({
                "key": f"user:{m['user_id']}",
                "kind": "moderator",
                "user_id": m["user_id"],
                "username": uname,
                "label": uname,
                "display_name": m.get("display_name") or uname,
                "avatar_url": m.get("avatar_url"),
                "subtitleKey": "admin.mod.sentinel.human",
                "subtitle": "Sentinelle humaine — actions de modération.",
                "accent": "#F97316",
            })

        return sentinels

    @api.get("/admin/moderation/logs")
    async def admin_moderation_logs(
        sentinel: str = "all",
        status: str = "all",
        limit: int = 100,
        user: dict = Depends(get_staff_dep),
    ):
        is_supreme = user.get("role") == "admin" or bool(user.get("is_nexus_supreme"))
        if not is_supreme:
            own = f"user:{user['user_id']}"
            if sentinel == "all" or sentinel in ("staff", "human", "moderator"):
                sentinel = own
            elif sentinel != own:
                raise HTTPException(403, "Accès réservé à vos propres logs")
        q: dict = {}
        if status != "all":
            q["status"] = status
        if sentinel != "all":
            if sentinel.lower().startswith("user:"):
                q.update(await _resolve_sentinel_log_filter(db, sentinel))
            else:
                q.update(_sentinel_log_filter(sentinel))
        return await db.moderation_logs.find(q, {"_id": 0}).sort("createdAt", -1).limit(min(limit, 200)).to_list(200)

    @api.get("/admin/moderation/warnings")
    async def admin_moderation_warnings(
        user_id: Optional[str] = None,
        user: dict = Depends(get_staff_dep),
    ):
        q = {"userId": user_id} if user_id else {}
        return await db.moderation_warnings.find(q, {"_id": 0}).sort("createdAt", -1).limit(200).to_list(200)

    @api.get("/admin/moderation/scores")
    async def admin_moderation_scores(user: dict = Depends(get_supreme_council_dep)):
        return await db.moderation_user_scores.find(
            {}, {"_id": 0},
        ).sort("score", -1).limit(100).to_list(100)

    class ReviewLogReq(BaseModel):
        status: str
        restore_content: bool = False

    @api.put("/admin/moderation/logs/{log_id}")
    async def admin_review_log(log_id: str, req: ReviewLogReq, user: dict = Depends(get_supreme_council_dep)):
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
    async def admin_reset_score(user_id: str, user: dict = Depends(get_supreme_council_dep)):
        target = await db.users.find_one({"user_id": user_id}, {"_id": 0, "username": 1})
        await naria.reset_user_score(db, user_id)
        await naria.log_staff_action(
            db,
            staff=user,
            action_type="score_reset",
            reason="Score réinitialisé",
            target_user_id=user_id,
            target_username=(target or {}).get("username"),
            severity="low",
        )
        return {"ok": True}

    class ReduceScoreReq(BaseModel):
        amount: int = Field(2, ge=1, le=20)

    @api.post("/admin/moderation/scores/{user_id}/reduce")
    async def admin_reduce_score(user_id: str, req: ReduceScoreReq, user: dict = Depends(get_supreme_council_dep)):
        target = await db.users.find_one({"user_id": user_id}, {"_id": 0, "username": 1})
        new_score = await naria.reduce_user_score(db, user_id, req.amount)
        await naria.log_staff_action(
            db,
            staff=user,
            action_type="score_reduce",
            reason=f"Score réduit de {req.amount}",
            target_user_id=user_id,
            target_username=(target or {}).get("username"),
            severity="low",
            metadata={"amount": req.amount, "new_score": new_score},
        )
        return {"ok": True, "score": new_score}

    @api.post("/admin/moderation/users/{user_id}/lift-restriction")
    async def admin_lift_restriction(user_id: str, user: dict = Depends(get_supreme_council_dep)):
        target = await db.users.find_one({"user_id": user_id}, {"_id": 0, "user_id": 1, "moderation_restricted_until": 1, "username": 1})
        if not target:
            raise HTTPException(404, "Joueur introuvable")
        from moderation_guards import require_restriction_active
        require_restriction_active(target)
        await naria.lift_restriction(db, user_id)
        await naria.log_staff_action(
            db,
            staff=user,
            action_type="lift_restriction",
            reason="Restriction levée",
            target_user_id=user_id,
            target_username=target.get("username"),
            severity="low",
        )
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
        await naria.log_staff_action(
            db,
            staff=user,
            action_type="warning",
            reason=req.reason or "Avertissement manuel",
            target_user_id=user_id,
            target_username=target.get("username"),
            preview=req.message,
            severity="medium",
        )
        await push_notification(
            db, user_id, "moderation_warning",
            "Avertissement modération", req.message,
            icon="Shield", link="/profile",
        )
        return {"ok": True, "warning_id": warning_id}

    @api.get("/admin/moderation/friend-messages")
    async def admin_moderation_friend_messages(
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        q: Optional[str] = None,
        after: Optional[str] = None,
        limit: int = 100,
        user: dict = Depends(get_staff_dep),
    ):
        query: dict = {}
        resolved_uid = (user_id or "").strip() or None
        if username and username.strip():
            un = username.strip()
            u = await db.users.find_one(
                {"username": {"$regex": f"^{re.escape(un)}$", "$options": "i"}},
                {"_id": 0, "user_id": 1},
            )
            if not u:
                return []
            resolved_uid = u["user_id"]
        if resolved_uid:
            query["$or"] = [{"from_user": resolved_uid}, {"to_user": resolved_uid}]
        if q and q.strip():
            query["text"] = {"$regex": q.strip()[:80], "$options": "i"}
        if after and after.strip():
            query["created_at"] = {"$gt": after.strip()}
        rows = await db.friend_messages.find(
            query, {"_id": 0},
        ).sort("created_at", -1).limit(min(limit, 200)).to_list(200)
        uids = {u for m in rows for u in (m.get("from_user"), m.get("to_user")) if u}
        users = await db.users.find(
            {"user_id": {"$in": list(uids)}},
            {"_id": 0, "user_id": 1, "username": 1, "role": 1},
        ).to_list(500)
        umap = {u["user_id"]: u for u in users}
        for m in rows:
            m["from_username"] = (umap.get(m.get("from_user")) or {}).get("username")
            m["to_username"] = (umap.get(m.get("to_user")) or {}).get("username")
        return rows

    @api.get("/admin/moderation/comments")
    async def admin_moderation_comments(
        source: str = "all",
        user_id: Optional[str] = None,
        limit: int = 100,
        user: dict = Depends(get_staff_dep),
    ):
        cap = min(limit, 200)
        out: list[dict] = []
        if source in ("all", "news"):
            q: dict = {}
            if user_id:
                q["user_id"] = user_id
            news_rows = await db.news_comments.find(q, {"_id": 0}).sort("created_at", -1).limit(cap).to_list(cap)
            for r in news_rows:
                r["source"] = "news"
                r["text"] = r.get("content")
                out.append(r)
        if source in ("all", "feed"):
            q = {}
            if user_id:
                q["user_id"] = user_id
            feed_rows = await db.comments.find(q, {"_id": 0}).sort("created_at", -1).limit(cap).to_list(cap)
            for r in feed_rows:
                r["source"] = "feed"
                r["text"] = r.get("content")
                out.append(r)
        out.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return out[:cap]

    class HideContentReq(BaseModel):
        reason: str = Field("Masqué par le staff", max_length=300)

    @api.post("/admin/moderation/friend-messages/{message_id}/hide")
    async def admin_hide_friend_message(
        message_id: str,
        req: HideContentReq,
        user: dict = Depends(get_staff_dep),
    ):
        msg = await db.friend_messages.find_one({"message_id": message_id}, {"_id": 0})
        if not msg:
            raise HTTPException(404, "Message introuvable")
        await naria.hide_content(
            db, "friend_message", message_id, req.reason,
            actor_name=user.get("username") or "staff",
        )
        from_user = msg.get("from_user")
        target_username = None
        if from_user:
            u = await db.users.find_one({"user_id": from_user}, {"_id": 0, "username": 1})
            target_username = (u or {}).get("username")
        await naria.log_staff_action(
            db,
            staff=user,
            action_type="hide",
            reason=req.reason,
            target_user_id=from_user,
            target_username=target_username,
            content_type="friend_message",
            content_id=message_id,
            preview=msg.get("text") or "",
        )
        return {"ok": True}

    @api.post("/admin/moderation/friend-messages/{message_id}/restore")
    async def admin_restore_friend_message(message_id: str, user: dict = Depends(get_staff_dep)):
        msg = await db.friend_messages.find_one({"message_id": message_id}, {"_id": 0})
        if not msg:
            raise HTTPException(404, "Message introuvable")
        ok = await naria.restore_content(db, "friend_message", message_id)
        if not ok:
            raise HTTPException(404, "Message introuvable ou déjà visible")
        from_user = msg.get("from_user")
        target_username = None
        if from_user:
            u = await db.users.find_one({"user_id": from_user}, {"_id": 0, "username": 1})
            target_username = (u or {}).get("username")
        await naria.log_staff_action(
            db,
            staff=user,
            action_type="restore",
            reason="Contenu restauré par le staff",
            target_user_id=from_user,
            target_username=target_username,
            content_type="friend_message",
            content_id=message_id,
            preview=msg.get("text") or "",
        )
        return {"ok": True}

    return api
