"""Naria — Sentinelle automatisée de modération site NEXORIA."""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta

from moderation_rules import AnalysisResult, analyze_content, preview_text
from naria_language import detect_content_language, normalize_lang, resolve_user_language
from naria_messages import get_message, hidden_placeholder, pick_user_message
from naria_system import (
    NARIA_PUBLIC_ROLE,
    NARIA_USERNAME,
    SHUMI_PUBLIC_ROLE,
    SHUMI_USERNAME,
    resolve_moderation_actor,
    moderation_actor_system_key,
)
from notifications import push_notification, push_staff_alert

logger = logging.getLogger("nexoria.naria")

NARIA_ACTOR = NARIA_USERNAME
NARIA_ROLE = NARIA_PUBLIC_ROLE
MODERATION_ACTOR = NARIA_USERNAME
MODERATION_ROLE = NARIA_PUBLIC_ROLE
AUTO_BAN_ENABLED = False

SCORE_DECAY_DAYS = 14
SCORE_HALF_LIFE_DAYS = 7
CONFIDENCE_LOG_ONLY = 0.35
CONFIDENCE_WARN = 0.45
CONFIDENCE_HIDE = 0.72
NEW_ACCOUNT_DAYS = 3
VETERAN_LEVEL = 15

PUBLIC_CONTENT_TYPES = frozenset({
    "forum_thread", "forum_reply", "profile", "guild", "generic",
    "feed_post", "feed_comment", "news_comment",
})

CHAT_ZONES = frozenset({
    "nexus_room_chat", "nexus_global_chat", "nexus_trade_chat", "nexus_guild_chat",
    "guild_chat", "friend_message",
})

HIDDEN_PLACEHOLDER = "Message masqué par la modération."


def _has_toxic_hit(analysis: AnalysisResult) -> bool:
    return any(
        h.rule in ("bad_word", "hate_threat", "harassment")
        and h.severity in ("high", "critical")
        for h in analysis.hits
    )


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().isoformat()


def parse_iso(value) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value) if isinstance(value, str) else value
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def is_staff_user(user: dict | None) -> bool:
    if not user:
        return False
    return user.get("role") in ("admin", "moderator") or bool(user.get("is_nexus_supreme"))


def account_age_days(user: dict | None) -> float:
    if not user:
        return 999.0
    created = parse_iso(user.get("created_at"))
    if not created:
        return 30.0
    return (now_utc() - created).total_seconds() / 86400


def naria_team_member() -> dict:
    """Fallback when le compte système n'est pas encore provisionné."""
    return {
        "username": NARIA_USERNAME,
        "display_name": NARIA_USERNAME,
        "role": "sentinelle",
        "level": 99,
        "class_name": "Sentinelle",
        "rank": "Sentinelle officielle du Nexus",
        "is_official_sentinel": True,
        "team_role_label": NARIA_ROLE,
        "team_tagline": "",
        "team_bio": "",
        "team_specialties": [],
    }


async def _actor_fields(db, content_type: str = "generic") -> dict:
    actor = await resolve_moderation_actor(db, content_type)
    source = actor.get("action_source") or moderation_actor_system_key(content_type)
    return {
        "actorId": actor["user_id"],
        "actorName": actor["username"],
        "actorRole": actor["role"],
        "actorType": actor.get("actor_type", "system"),
        "actionSource": source,
        "actor": actor["username"],
        "role": actor["role"],
    }


@dataclass
class ModerationAction:
    allowed: bool = True
    action: str = "none"
    block: bool = False
    hide: bool = False
    warn: bool = False
    restrict_minutes: int = 0
    admin_alert: bool = False
    propose_ban: bool = False
    auto_ban: bool = False
    score_added: int = 0
    total_score: int = 0
    confidence: float = 0.0
    log_id: str | None = None
    warning_id: str | None = None
    user_message: str | None = None
    user_message_key: str = "naria.warning.respect"
    reason: str = ""
    reason_code: str = "none"
    severity: str = "low"
    status: str = "applied"
    user_language: str = "fr"
    detected_language: str = "fr"
    log_only: bool = False


def decay_score(score: int, last_infraction_at: str | None) -> int:
    if score <= 0 or not last_infraction_at:
        return max(0, score)
    last = parse_iso(last_infraction_at)
    if not last:
        return score
    days = (now_utc() - last).total_seconds() / 86400
    if days >= SCORE_DECAY_DAYS:
        return 0
    if days <= 0:
        return score
    factor = 0.5 ** (days / SCORE_HALF_LIFE_DAYS)
    return max(0, int(round(score * factor)))


def _context_score_multiplier(user: dict, score_doc: dict) -> float:
    """Joueur ancien sans historique → plus prudent ; nouveau spammeur → plus strict."""
    mult = 1.0
    age = account_age_days(user)
    warnings = int(score_doc.get("warnings_count") or 0)
    level = int(user.get("level") or 1)

    if warnings == 0 and level >= VETERAN_LEVEL:
        mult *= 0.65
    elif warnings == 0 and age > 30:
        mult *= 0.75
    elif age < NEW_ACCOUNT_DAYS:
        mult *= 1.25
    return mult


def decide_action(
    total_score: int,
    analysis: AnalysisResult,
    *,
    user: dict,
    score_doc: dict,
    content_type: str = "generic",
    actor_name: str = NARIA_USERNAME,
) -> ModerationAction:
    user_lang = normalize_lang(user.get("language") or score_doc.get("preferredLanguage") or "fr")
    action = ModerationAction(
        score_added=analysis.total_score,
        total_score=total_score,
        reason=analysis.primary_reason,
        reason_code=analysis.primary_reason_code,
        severity=analysis.max_severity,
        confidence=analysis.confidence,
        user_language=user_lang,
        detected_language=analysis.detected_language,
    )

    if not analysis.hits:
        return action

    conf = analysis.confidence
    warnings = int(score_doc.get("warnings_count") or 0)

    if conf < CONFIDENCE_LOG_ONLY:
        action.log_only = True
        action.action = "log"
        action.status = "logged"
        action.allowed = True
        return action

    effective_score = total_score
    if conf < CONFIDENCE_WARN and warnings == 0:
        effective_score = max(1, int(total_score * 0.5))

    chat_zones = CHAT_ZONES
    if content_type in chat_zones and conf < CONFIDENCE_HIDE and analysis.max_severity != "critical":
        effective_score = min(effective_score, 3)

    if _has_toxic_hit(analysis) and conf >= CONFIDENCE_HIDE:
        action.hide = True
        action.warn = True
        action.block = True
        action.action = "block"
        key, msg = pick_user_message(
            analysis.hits, user_lang, block=True, hide=True, actor=actor_name,
        )
        action.user_message_key = key
        action.user_message = msg
        action.allowed = False
        return action

    if analysis.max_severity == "critical" and conf >= 0.85 and effective_score >= 5:
        action.block = True
        action.warn = True
        action.action = "block"
        key, msg = pick_user_message(analysis.hits, user_lang, block=True, actor=actor_name)
        action.user_message_key = key
        action.user_message = msg
        action.allowed = False
        return action

    if effective_score <= 2:
        action.warn = True
        action.hide = True
        action.action = "hide"
    elif effective_score <= 4:
        if conf >= CONFIDENCE_HIDE or warnings >= 1:
            action.hide = True
            action.action = "hide"
        action.warn = True
    elif effective_score <= 7:
        action.hide = conf >= 0.55
        action.warn = True
        action.restrict_minutes = 10
        action.action = "restrict"
    elif effective_score <= 10:
        action.hide = True
        action.warn = True
        action.restrict_minutes = 60
        action.admin_alert = True
        action.status = "pending_review"
        action.action = "restrict"
    else:
        action.hide = True
        action.warn = True
        action.admin_alert = True
        action.propose_ban = True
        action.status = "pending_review"
        action.action = "propose_ban"
        if AUTO_BAN_ENABLED and analysis.max_severity == "critical" and conf >= 0.92:
            action.auto_ban = True
            action.action = "ban"

    key, msg = pick_user_message(
        analysis.hits, user_lang,
        restrict_minutes=action.restrict_minutes,
        hide=action.hide,
        block=action.block,
        actor=actor_name,
    )
    if action.warn and not action.block and action.hide:
        key = "naria.content.hidden_notice"
        msg = get_message(key, user_lang, actor=actor_name)
    if action.propose_ban and not action.block:
        key = "naria.ban.notice"
        msg = get_message(key, user_lang, actor=actor_name)
    action.user_message_key = key
    action.user_message = msg
    action.allowed = not action.block
    return action


def moderation_restriction_detail(user: dict | None) -> dict | None:
    if not user:
        return None
    until = parse_iso(user.get("moderation_restricted_until"))
    if not until or until <= now_utc():
        return None
    remaining = int((until - now_utc()).total_seconds())
    lang = resolve_user_language(user)
    return {
        "restricted": True,
        "restricted_until": until.isoformat(),
        "remaining_seconds": remaining,
        "reason": user.get("moderation_restriction_reason") or "Restriction modération",
        "actor": user.get("moderation_restriction_by_name") or user.get("moderation_restriction_by") or NARIA_ACTOR,
        "message": get_message(
            "naria.restriction.temporary",
            lang,
            minutes=max(1, remaining // 60),
            actor=user.get("moderation_restriction_by_name") or NARIA_ACTOR,
        ),
    }


async def ensure_indexes(db) -> None:
    await db.moderation_logs.create_index([("createdAt", -1)])
    await db.moderation_logs.create_index([("user_id", 1), ("createdAt", -1)])
    await db.moderation_logs.create_index([("status", 1), ("createdAt", -1)])
    await db.moderation_logs.create_index([("actionSource", 1), ("createdAt", -1)])
    await db.moderation_logs.create_index([("actorId", 1), ("createdAt", -1)])
    await db.moderation_warnings.create_index([("userId", 1), ("createdAt", -1)])
    await db.moderation_warnings.create_index("warning_id", unique=True)
    await db.moderation_user_scores.create_index("user_id", unique=True)


async def get_user_score_doc(db, user_id: str) -> dict:
    doc = await db.moderation_user_scores.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        return {
            "user_id": user_id,
            "score": 0,
            "warnings_count": 0,
            "restrictions_count": 0,
            "last_infraction_at": None,
            "restricted_until": None,
            "preferredLanguage": None,
            "lastDetectedLanguage": None,
        }
    decayed = decay_score(int(doc.get("score") or 0), doc.get("last_infraction_at"))
    if decayed != doc.get("score"):
        await db.moderation_user_scores.update_one(
            {"user_id": user_id},
            {"$set": {"score": decayed, "updated_at": now_iso()}},
        )
        doc["score"] = decayed
    return doc


async def enforce_post_allowed(user: dict) -> None:
    from fastapi import HTTPException

    detail = moderation_restriction_detail(user)
    if detail:
        raise HTTPException(status_code=403, detail={
            "moderation_restricted": True,
            "restricted_until": detail["restricted_until"],
            "remaining_seconds": detail["remaining_seconds"],
            "reason": detail["reason"],
            "message": detail["message"],
        })


async def _analyze(
    user: dict,
    text: str,
    *,
    is_duplicate: bool = False,
    content_type: str = "generic",
) -> AnalysisResult:
    user_lang = resolve_user_language(user)
    detected = detect_content_language(text, user_lang)
    analysis = analyze_content(
        text,
        is_duplicate=is_duplicate,
        user_language=user_lang,
        content_language=detected,
    )
    return analysis


async def _build_action(
    db,
    user: dict,
    text: str,
    *,
    is_duplicate: bool = False,
    content_type: str = "generic",
) -> tuple[AnalysisResult, ModerationAction] | None:
    if is_staff_user(user):
        return None

    analysis = await _analyze(user, text, is_duplicate=is_duplicate, content_type=content_type)
    if not analysis.hits:
        return None

    score_doc = await get_user_score_doc(db, user["user_id"])
    user_lang = resolve_user_language(user)
    mult = _context_score_multiplier(user, score_doc)
    added = max(1, int(round(analysis.total_score * mult))) if analysis.total_score else 0
    analysis.total_score = added

    new_total = int(score_doc.get("score") or 0) + added
    actor = await resolve_moderation_actor(db, content_type)
    actor_name = actor["username"]
    action = decide_action(new_total, analysis, user=user, score_doc=score_doc, content_type=content_type, actor_name=actor_name)
    action.score_added = added
    action.total_score = new_total
    action.user_language = user_lang
    action.detected_language = analysis.detected_language
    return analysis, action


async def publish_with_moderation(
    db,
    *,
    user: dict,
    text: str,
    content_type: str,
    content_id: str,
) -> ModerationAction:
    """Vérifie restrictions + preflight, puis modère après publication. Lève HTTP 403 si blocage."""
    from fastapi import HTTPException

    await enforce_post_allowed(user)
    blocked = await preflight_content(db, user, text, content_type=content_type)
    if blocked:
        raise HTTPException(status_code=403, detail={
            "moderation_blocked": True,
            "message": blocked.user_message or HIDDEN_PLACEHOLDER,
        })
    return await moderate_published_content(
        db, user=user, text=text, content_type=content_type, content_id=content_id,
    )


def sanitize_moderated_document(
    doc: dict | None,
    text_field: str,
    lang: str = "fr",
    *,
    content_type: str = "generic",
    is_staff: bool = False,
) -> dict | None:
    if not doc:
        return doc
    if is_staff or not doc.get("moderation_hidden"):
        return doc
    actor = doc.get("moderation_hidden_by")
    out = dict(doc)
    out[text_field] = hidden_placeholder(lang, actor=actor, content_type=content_type)
    return out


async def preflight_content(
    db, user: dict, text: str, *, is_duplicate: bool = False, content_type: str = "generic",
) -> ModerationAction | None:
    built = await _build_action(db, user, text, is_duplicate=is_duplicate, content_type=content_type)
    if not built:
        return None
    analysis, action = built
    if action.block:
        await _log_only(db, user, analysis, action, content_type, None, text)
        await _send_moderation_warning(db, user, action, content_type=content_type)
        return action
    return None


async def moderate_published_content(
    db,
    *,
    user: dict,
    text: str,
    content_type: str,
    content_id: str,
    is_duplicate: bool = False,
) -> ModerationAction:
    built = await _build_action(db, user, text, is_duplicate=is_duplicate, content_type=content_type)
    if not built:
        return ModerationAction()
    analysis, action = built
    if action.block:
        return action
    if action.log_only:
        await _log_only(db, user, analysis, action, content_type, content_id, text)
        return action
    await _apply_action(db, user, analysis, action, content_type, content_id, text)
    return action


async def inspect_and_act(
    db, *, user: dict, text: str, content_type: str,
    content_id: str | None = None, is_duplicate: bool = False,
) -> ModerationAction:
    blocked = await preflight_content(db, user, text, is_duplicate=is_duplicate, content_type=content_type)
    if blocked:
        return blocked
    if not content_id:
        return ModerationAction()
    return await moderate_published_content(
        db, user=user, text=text, content_type=content_type, content_id=content_id, is_duplicate=is_duplicate,
    )


def _log_payload(user, analysis, action, content_type, content_id, text, actor: dict) -> dict:
    return {
        **actor,
        "user_id": user["user_id"],
        "username": user.get("username"),
        "actionType": _action_type_label(action),
        "action": action.action,
        "reason": action.reason,
        "reasonCode": action.reason_code,
        "severity": action.severity,
        "confidence": action.confidence,
        "userLanguage": action.user_language,
        "detectedContentLanguage": action.detected_language,
        "contentType": content_type,
        "contentId": content_id,
        "originalTextPreview": preview_text(text),
        "scoreAdded": action.score_added,
        "totalScore": action.total_score,
        "userMessageKey": action.user_message_key,
        "metadata": {
            "hits": [h.rule for h in analysis.hits],
            "hit_confidences": [h.confidence for h in analysis.hits],
            "propose_ban": action.propose_ban,
            "auto_ban": action.auto_ban,
            "log_only": action.log_only,
        },
    }


async def _log_only(db, user, analysis, action, content_type, content_id, text) -> str:
    log_id = f"mlog_{uuid.uuid4().hex[:12]}"
    actor = await _actor_fields(db, content_type)
    payload = _log_payload(user, analysis, action, content_type, content_id, text, actor)
    payload.update({
        "log_id": log_id,
        "createdAt": now_iso(),
        "reviewedBy": None,
        "reviewedAt": None,
        "status": action.status if action.log_only else "blocked",
    })
    await db.moderation_logs.insert_one(payload)
    action.log_id = log_id
    return log_id


async def _send_moderation_warning(
    db,
    user: dict,
    action: ModerationAction,
    *,
    content_type: str,
    content_id: str | None = None,
) -> str | None:
    """Notification + entrée warning — visible par le joueur (cloche, profil)."""
    if not (action.warn or action.block) or not action.user_message:
        return None
    actor = await _actor_fields(db, content_type)
    actor_name = actor["actorName"]
    actor_id = actor["actorId"]
    user_lang = action.user_language
    warning_id = f"mwarn_{uuid.uuid4().hex[:12]}"
    now = now_iso()
    msg = action.user_message

    await db.moderation_warnings.insert_one({
        "warning_id": warning_id,
        "userId": user["user_id"],
        "username": user.get("username"),
        "warningMessage": msg,
        "warningMessageKey": action.user_message_key,
        "reason": action.reason,
        "reasonCode": action.reason_code,
        "severity": action.severity,
        "confidence": action.confidence,
        "language": user_lang,
        "contentType": content_type,
        "contentId": content_id,
        "actorId": actor_id,
        "actorName": actor_name,
        "actorRole": actor["actorRole"],
        "actorType": actor["actorType"],
        "actionSource": actor["actionSource"],
        "createdBy": actor_id,
        "createdByName": actor_name,
        "createdAt": now,
        "readAt": None,
        "status": "active",
    })
    await push_notification(
        db, user["user_id"], "naria_warning",
        get_message("naria.title", user_lang, actor=actor_name),
        msg,
        sound="war", icon="Shield", link="/profile",
        actor_id=actor_id,
        actor_name=actor_name,
        params={
            "warning_id": warning_id,
            "message_key": action.user_message_key,
            "language": user_lang,
            "severity": action.severity,
            "actor_id": actor_id,
            "actor_name": actor_name,
        },
    )
    action.warning_id = warning_id
    return warning_id


async def _apply_action(db, user, analysis, action, content_type, content_id, text) -> None:
    log_id = f"mlog_{uuid.uuid4().hex[:12]}"
    warning_id = None
    now = now_iso()
    user_lang = action.user_language
    actor = await _actor_fields(db, content_type)
    actor_name = actor["actorName"]
    actor_id = actor["actorId"]

    score_update = {
        "username": user.get("username"),
        "preferredLanguage": user_lang,
        "lastDetectedLanguage": action.detected_language,
        "updated_at": now,
    }
    if not action.log_only:
        score_update["score"] = action.total_score
        score_update["last_infraction_at"] = now

    inc = {}
    if action.warn:
        inc["warnings_count"] = 1
    if action.restrict_minutes:
        inc["restrictions_count"] = 1

    await db.moderation_user_scores.update_one(
        {"user_id": user["user_id"]},
        {"$set": score_update, **({"$inc": inc} if inc else {})},
        upsert=True,
    )

    if action.warn:
        await _send_moderation_warning(
            db, user, action, content_type=content_type, content_id=content_id,
        )

    warning_id = action.warning_id

    if action.restrict_minutes and not moderation_restriction_detail(user):
        until = (now_utc() + timedelta(minutes=action.restrict_minutes)).isoformat()
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "moderation_restricted_until": until,
                "moderation_restriction_reason": action.reason[:300],
                "moderation_restriction_by": actor_id,
                "moderation_restriction_by_name": actor_name,
            }},
        )
        await db.moderation_user_scores.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"restricted_until": until}},
        )
    elif action.restrict_minutes and moderation_restriction_detail(user):
        logger.info(
            "Skip duplicate restriction for %s — already restricted",
            user.get("username"),
        )

    if content_id and action.hide:
        await hide_content(db, content_type, content_id, action.reason, user_lang, actor_name=actor_name)

    if action.admin_alert or action.propose_ban:
        await push_staff_alert(
            db, "naria_alert", f"Alerte {actor_name}",
            f"{user.get('username')} [{user_lang}/{action.detected_language}] "
            f"conf={action.confidence:.0%} score={action.total_score} — {action.reason[:100]}",
            sound="war", icon="Shield", link="/admin?tab=moderation",
        )

    if action.auto_ban:
        await apply_naria_ban(db, user, action.reason, hours=24, language=user_lang, actor=actor)

    payload = _log_payload(user, analysis, action, content_type, content_id, text, actor)
    payload.update({
        "log_id": log_id,
        "createdAt": now,
        "reviewedBy": None,
        "reviewedAt": None,
        "status": action.status,
    })
    await db.moderation_logs.insert_one(payload)
    action.log_id = log_id
    action.warning_id = warning_id


def _action_type_label(action: ModerationAction) -> str:
    if action.log_only:
        return "log"
    if action.auto_ban:
        return "ban"
    if action.propose_ban:
        return "ban_proposed"
    if action.restrict_minutes:
        return "restrict"
    if action.hide:
        return "hide"
    if action.warn:
        return "warning"
    if action.block:
        return "block"
    return "log"


async def hide_content(db, content_type: str, content_id: str, reason: str, lang: str = "fr", *, actor_name: str | None = None) -> None:
    by = actor_name or NARIA_ACTOR
    placeholder = hidden_placeholder(lang, actor=by, content_type=content_type)
    hidden_fields = {
        "moderation_hidden": True,
        "moderation_hidden_by": by,
        "moderation_hidden_at": now_iso(),
        "moderation_hidden_reason": (reason or "")[:300],
    }
    if content_type == "forum_thread":
        await db.forum_threads.update_one(
            {"thread_id": content_id},
            {"$set": {**hidden_fields, "content": placeholder, "title": placeholder}},
        )
    elif content_type == "forum_reply":
        await db.forum_replies.update_one(
            {"reply_id": content_id},
            {"$set": {**hidden_fields, "content": placeholder, "content_html": f"<p>{placeholder}</p>"}},
        )
    elif content_type == "nexus_room_chat":
        await db.nexus_room_chat.update_one(
            {"message_id": content_id},
            {"$set": {**hidden_fields, "content": placeholder, "deleted": True,
                      "deleted_by": by, "deleted_at": now_iso()}},
        )
    elif content_type == "feed_post":
        await db.posts.update_one(
            {"post_id": content_id},
            {"$set": {**hidden_fields, "content": placeholder}},
        )
    elif content_type == "feed_comment":
        await db.comments.update_one(
            {"comment_id": content_id},
            {"$set": {**hidden_fields, "content": placeholder}},
        )
    elif content_type == "news_comment":
        await db.news_comments.update_one(
            {"comment_id": content_id},
            {"$set": {**hidden_fields, "content": placeholder}},
        )
    elif content_type == "friend_message":
        await db.friend_messages.update_one(
            {"message_id": content_id},
            {"$set": {**hidden_fields, "text": placeholder}},
        )


async def restore_content(db, content_type: str, content_id: str) -> bool:
    unset = {k: "" for k in (
        "moderation_hidden", "moderation_hidden_by", "moderation_hidden_at", "moderation_hidden_reason",
    )}
    if content_type == "forum_thread":
        r = await db.forum_threads.update_one({"thread_id": content_id}, {"$unset": unset})
        return r.modified_count > 0
    if content_type == "forum_reply":
        r = await db.forum_replies.update_one({"reply_id": content_id}, {"$unset": unset})
        return r.modified_count > 0
    if content_type == "nexus_room_chat":
        r = await db.nexus_room_chat.update_one(
            {"message_id": content_id},
            {"$unset": unset, "$set": {"deleted": False, "deleted_by": None, "deleted_at": None}},
        )
        return r.modified_count > 0
    if content_type == "feed_post":
        r = await db.posts.update_one({"post_id": content_id}, {"$unset": unset})
        return r.modified_count > 0
    if content_type == "feed_comment":
        r = await db.comments.update_one({"comment_id": content_id}, {"$unset": unset})
        return r.modified_count > 0
    if content_type == "news_comment":
        r = await db.news_comments.update_one(
            {"comment_id": content_id},
            {"$unset": unset, "$set": {"hidden": False}},
        )
        return r.modified_count > 0
    if content_type == "friend_message":
        r = await db.friend_messages.update_one({"message_id": content_id}, {"$unset": unset})
        return r.modified_count > 0
    return False


async def apply_naria_ban(db, user: dict, reason: str, hours: int = 24, language: str = "fr", *, actor: dict | None = None) -> bool:
    """Applique un ban site. Retourne False si le héros est déjà banni."""
    import nexus_world
    from moderation_guards import is_site_ban_active

    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "banned_until": 1, "username": 1})
    if fresh and is_site_ban_active(fresh):
        logger.info("Skip auto-ban: %s already banned", fresh.get("username"))
        return False

    if actor is None:
        actor = await _actor_fields(db)

    banned_until = (now_utc() + timedelta(hours=hours)).isoformat()
    user_id = user["user_id"]
    ban_reason = get_message("naria.ban.notice", language, actor=actor.get("actorName") or NARIA_ACTOR)[:300] if reason else reason[:300]
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"banned_until": banned_until, "ban_reason": ban_reason}},
    )
    await db.user_sessions.delete_many({"user_id": user_id})
    try:
        await nexus_world.disconnect_user(user_id)
    except Exception as e:
        logger.warning("nexus disconnect on naria ban failed: %s", e)
    await db.ban_history.insert_one({
        "ban_id": f"ban_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "username": user.get("username"),
        "banned_by": actor["actorId"],
        "banned_by_name": actor["actorName"],
        "duration_hours": hours,
        "banned_until": banned_until,
        "reason": ban_reason,
        "created_at": now_iso(),
        "lifted": False,
        "actor_type": actor.get("actorType", "system"),
        "action_source": actor.get("actionSource", "shumi"),
        "language": language,
    })
    return True


def sanitize_forum_doc(doc: dict, is_staff: bool = False, lang: str = "fr", content_type: str = "forum_reply") -> dict:
    if is_staff or not doc.get("moderation_hidden"):
        return doc
    actor = doc.get("moderation_hidden_by")
    ph = hidden_placeholder(lang, actor=actor, content_type=content_type)
    out = dict(doc)
    out["content"] = ph
    out["content_html"] = f"<p>{ph}</p>"
    if content_type == "forum_thread" and "title" in out:
        out["title"] = ph
    out["moderation_hidden"] = True
    return out


async def log_staff_action(
    db,
    *,
    staff: dict,
    action_type: str,
    reason: str = "",
    target_user_id: str | None = None,
    target_username: str | None = None,
    content_type: str | None = None,
    content_id: str | None = None,
    preview: str = "",
    severity: str = "medium",
    status: str = "applied",
    metadata: dict | None = None,
) -> str:
    """Journalise une action de modération humaine (modérateur / Sage)."""
    log_id = f"mlog_{uuid.uuid4().hex[:12]}"
    now = now_iso()
    staff_role = staff.get("role") or "moderator"
    staff_name = staff.get("username") or "staff"
    doc = {
        "log_id": log_id,
        "actionSource": "staff",
        "actorId": staff.get("user_id"),
        "actorName": staff_name,
        "actorType": staff_role,
        "actorRole": staff_role,
        "actor": staff_name,
        "role": staff_role,
        "user_id": target_user_id,
        "username": target_username,
        "actionType": action_type,
        "action": action_type,
        "reason": reason[:500] if reason else "",
        "severity": severity,
        "contentType": content_type,
        "contentId": content_id,
        "originalTextPreview": preview_text(preview) if preview else "",
        "scoreAdded": 0,
        "totalScore": 0,
        "createdAt": now,
        "metadata": metadata or {},
        "reviewedBy": None,
        "reviewedAt": None,
        "status": status,
    }
    await db.moderation_logs.insert_one(doc)
    return log_id


async def review_log(db, log_id: str, *, status: str, admin_username: str, restore_content_flag: bool = False):
    log = await db.moderation_logs.find_one({"log_id": log_id}, {"_id": 0})
    if not log:
        return None
    await db.moderation_logs.update_one(
        {"log_id": log_id},
        {"$set": {"status": status, "reviewedBy": admin_username, "reviewedAt": now_iso()}},
    )
    if restore_content_flag and log.get("contentId") and log.get("contentType"):
        await restore_content(db, log["contentType"], log["contentId"])
    return log


async def reset_user_score(db, user_id: str) -> None:
    await db.moderation_user_scores.update_one(
        {"user_id": user_id},
        {"$set": {"score": 0, "updated_at": now_iso(), "last_infraction_at": None}},
        upsert=True,
    )


async def reduce_user_score(db, user_id: str, amount: int = 2) -> int:
    doc = await get_user_score_doc(db, user_id)
    new_score = max(0, int(doc.get("score") or 0) - max(1, amount))
    await db.moderation_user_scores.update_one(
        {"user_id": user_id},
        {"$set": {"score": new_score, "updated_at": now_iso()}},
        upsert=True,
    )
    return new_score


async def lift_restriction(db, user_id: str) -> None:
    await db.users.update_one(
        {"user_id": user_id},
        {"$unset": {
            "moderation_restricted_until": "", "moderation_restriction_reason": "",
            "moderation_restriction_by": "",
        }},
    )
    await db.moderation_user_scores.update_one(
        {"user_id": user_id},
        {"$set": {"restricted_until": None, "updated_at": now_iso()}},
    )
