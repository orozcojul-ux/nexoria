"""Guide du Nouveau Héros — onboarding RP guidé par Naria."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Callable, Awaitable, Literal

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

import naria_system

logger = logging.getLogger("nexoria.onboarding")

TUTORIAL_BADGE_ID = "nouveau_heros"
TUTORIAL_XP = 50
TUTORIAL_AETHER = 25

# Ordre canonique des étapes (8 écrans)
TUTORIAL_STEPS = (
    "welcome",
    "profile",
    "class",
    "community",
    "nexus",
    "chat",
    "progression",
    "complete",
)

# Checklist visible (7 items — welcome implicite, complete = terminer la quête)
CHECKLIST_STEPS = (
    "profile",
    "class",
    "community",
    "nexus",
    "chat",
    "progression",
    "complete",
)

STEP_INDEX = {s: i for i, s in enumerate(TUTORIAL_STEPS)}


class OnboardingStartReq(BaseModel):
    replay: bool = False


class OnboardingStepReq(BaseModel):
    step: str = Field(..., min_length=2, max_length=32)
    event: Literal["visit", "acknowledge", "advance"] = "visit"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def is_tutorial_eligible(user: dict | None) -> bool:
    if not user:
        return False
    if naria_system.is_system_user(user):
        return False
    return True


def _default_progress(user_id: str) -> dict:
    now = now_iso()
    return {
        "userId": user_id,
        "currentStep": 0,
        "completedSteps": [],
        "skipped": False,
        "completed": False,
        "rewardsClaimed": False,
        "replayMode": False,
        "createdAt": now,
        "updatedAt": now,
        "tutorialStartedAt": None,
        "tutorialCompletedAt": None,
    }


def _mirror_user_fields(progress: dict) -> dict:
    step_id = TUTORIAL_STEPS[min(progress.get("currentStep", 0), len(TUTORIAL_STEPS) - 1)]
    return {
        "tutorialCompleted": bool(progress.get("completed")),
        "tutorialSkipped": bool(progress.get("skipped")),
        "tutorialRewardsClaimed": bool(progress.get("rewardsClaimed")),
        "tutorialStep": STEP_INDEX.get(step_id, 0),
        "tutorialStartedAt": progress.get("tutorialStartedAt"),
        "tutorialCompletedAt": progress.get("tutorialCompletedAt"),
    }


async def get_or_create_progress(db, user_id: str) -> dict:
    doc = await db.onboarding_progress.find_one({"userId": user_id}, {"_id": 0})
    if doc:
        return doc
    doc = _default_progress(user_id)
    await db.onboarding_progress.insert_one(dict(doc))
    return doc


async def sync_user_tutorial_fields(db, user_id: str, progress: dict) -> None:
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": _mirror_user_fields(progress)},
    )


async def _save_progress(db, user_id: str, progress: dict) -> dict:
    progress["updatedAt"] = now_iso()
    await db.onboarding_progress.update_one(
        {"userId": user_id},
        {"$set": progress},
        upsert=True,
    )
    await sync_user_tutorial_fields(db, user_id, progress)
    return progress


async def _save_progress_for_user(db, user_id: str, user: dict, progress: dict) -> dict:
    """Persiste la progression en appliquant les auto-complétions (ex. classe déjà choisie)."""
    progress = _auto_complete_class(user, progress)
    return await _save_progress(db, user_id, progress)


def _auto_complete_class(user: dict, progress: dict) -> dict:
    if user.get("class_id") and "class" not in progress.get("completedSteps", []):
        steps = list(progress.get("completedSteps") or [])
        steps.append("class")
        progress["completedSteps"] = list(dict.fromkeys(steps))
    return progress


def _effective_completed_steps(user: dict, progress: dict) -> set[str]:
    synced = _auto_complete_class(user, dict(progress))
    return set(synced.get("completedSteps") or [])


def _step_status(progress: dict, step: str, user: dict | None = None) -> str:
    done = _effective_completed_steps(user, progress) if user else set(progress.get("completedSteps") or [])
    if step in done:
        return "done"
    cur = progress.get("currentStep", 0)
    idx = STEP_INDEX.get(step, 0)
    if idx == cur:
        return "current"
    return "pending"


def serialize_state(user: dict, progress: dict) -> dict:
    progress = _auto_complete_class(user, progress)
    checklist = [
        {
            "id": step,
            "status": _step_status(progress, step, user),
            "checklist": True,
        }
        for step in CHECKLIST_STEPS
    ]
    steps = [
        {
            "id": step,
            "index": STEP_INDEX[step],
            "status": _step_status(progress, step, user),
        }
        for step in TUTORIAL_STEPS
    ]
    return {
        "eligible": is_tutorial_eligible(user),
        "questTitleKey": "tutorial.quest.title",
        "guideTitleKey": "tutorial.guide.title",
        "currentStep": progress.get("currentStep", 0),
        "currentStepId": TUTORIAL_STEPS[min(progress.get("currentStep", 0), len(TUTORIAL_STEPS) - 1)],
        "completedSteps": progress.get("completedSteps") or [],
        "skipped": bool(progress.get("skipped")),
        "completed": bool(progress.get("completed")),
        "rewardsClaimed": bool(progress.get("rewardsClaimed")),
        "replayMode": bool(progress.get("replayMode")),
        "tutorialStartedAt": progress.get("tutorialStartedAt"),
        "tutorialCompletedAt": progress.get("tutorialCompletedAt"),
        "steps": steps,
        "checklist": checklist,
        "shouldAutoOpen": (
            is_tutorial_eligible(user)
            and not progress.get("completed")
            and not progress.get("skipped")
            and not progress.get("tutorialStartedAt")
        ),
        "locked": bool(progress.get("completed") or user.get("tutorialCompleted")),
    }


def _mark_step_done(progress: dict, step: str) -> dict:
    if step not in TUTORIAL_STEPS:
        raise HTTPException(400, "Étape invalide")
    steps = list(progress.get("completedSteps") or [])
    if step not in steps:
        steps.append(step)
    progress["completedSteps"] = steps
    idx = STEP_INDEX[step]
    if progress.get("currentStep", 0) <= idx:
        progress["currentStep"] = min(idx + 1, len(TUTORIAL_STEPS) - 1)
    return progress


def _all_required_done(user: dict, progress: dict) -> bool:
    required = set(CHECKLIST_STEPS) - {"complete"}
    done = _effective_completed_steps(user, progress)
    return required.issubset(done)


def _missing_required_steps(user: dict, progress: dict) -> list[str]:
    required = set(CHECKLIST_STEPS) - {"complete"}
    done = _effective_completed_steps(user, progress)
    return sorted(required - done)


async def validate_and_apply_step(
    db,
    user: dict,
    progress: dict,
    step: str,
    event: str,
) -> dict:
    if not is_tutorial_eligible(user):
        raise HTTPException(403, "Didacticiel indisponible pour ce compte")

    if progress.get("completed") and not progress.get("replayMode"):
        raise HTTPException(403, "Quête déjà accomplie — didacticiel terminé définitivement")

    if step not in TUTORIAL_STEPS:
        raise HTTPException(400, "Étape invalide")

    if event not in ("visit", "acknowledge", "advance"):
        raise HTTPException(400, "Événement invalide")

    if step == "welcome":
        if event in ("advance", "acknowledge"):
            progress = _mark_step_done(progress, "welcome")
        return progress

    if step == "profile":
        if event in ("visit", "acknowledge", "advance"):
            progress = _mark_step_done(progress, "profile")
        return progress

    if step == "class":
        if user.get("class_id") or event in ("visit", "acknowledge", "advance"):
            progress = _mark_step_done(progress, "class")
        return progress

    if step == "community":
        if event in ("visit", "acknowledge", "advance"):
            progress = _mark_step_done(progress, "community")
        return progress

    if step == "nexus":
        if event in ("visit", "acknowledge", "advance"):
            progress = _mark_step_done(progress, "nexus")
        return progress

    if step == "chat":
        if event in ("visit", "acknowledge", "advance"):
            progress = _mark_step_done(progress, "chat")
        return progress

    if step == "progression":
        if event in ("visit", "acknowledge", "advance"):
            progress = _mark_step_done(progress, "progression")
        return progress

    if step == "complete":
        progress = _auto_complete_class(user, progress)
        if not _all_required_done(user, progress):
            missing = _missing_required_steps(user, progress)
            raise HTTPException(
                400,
                detail={
                    "message": "Termine d'abord les étapes précédentes",
                    "missing_steps": missing,
                },
            )
        progress = _mark_step_done(progress, "complete")
        progress["completed"] = True
        progress["tutorialCompletedAt"] = now_iso()
        progress["skipped"] = False
        return progress

    return progress


async def grant_tutorial_rewards(
    db,
    user_id: str,
    *,
    grant_xp: Callable[..., Awaitable[Any]],
    grant_aether: Callable[..., Awaitable[Any]],
    grant_badge: Callable[..., Awaitable[Any]],
    add_chronicle: Callable[..., Awaitable[Any]],
) -> dict:
    progress = await get_or_create_progress(db, user_id)
    if progress.get("rewardsClaimed"):
        return {"already_claimed": True, "xp": 0, "aether": 0, "badge": False}

    if not progress.get("completed"):
        raise HTTPException(400, "Didacticiel non terminé")

    await grant_xp(user_id, TUTORIAL_XP, "tutorial_complete")
    await grant_aether(user_id, TUTORIAL_AETHER, "tutorial_complete")
    badge_granted = await grant_badge(user_id, TUTORIAL_BADGE_ID)
    await add_chronicle(
        user_id,
        "A accompli la quête « Premiers pas dans le Nexus »",
        "quest",
        i18n_key="chronicle.tutorial.complete",
    )

    progress["rewardsClaimed"] = True
    await _save_progress(db, user_id, progress)
    return {
        "already_claimed": False,
        "xp": TUTORIAL_XP,
        "aether": TUTORIAL_AETHER,
        "badge": badge_granted,
        "badge_id": TUTORIAL_BADGE_ID,
    }


async def track_nexus_join(db, user_id: str) -> None:
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user or not is_tutorial_eligible(user):
        return
    progress = await get_or_create_progress(db, user_id)
    if progress.get("completed") and not progress.get("replayMode"):
        return
    progress = await validate_and_apply_step(db, user, progress, "nexus", "visit")
    await _save_progress_for_user(db, user_id, user, progress)


async def track_first_message(db, user_id: str) -> None:
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user or not is_tutorial_eligible(user):
        return
    progress = await get_or_create_progress(db, user_id)
    if "chat" in (progress.get("completedSteps") or []):
        return
    if progress.get("completed") and not progress.get("replayMode"):
        return
    progress = await validate_and_apply_step(db, user, progress, "chat", "visit")
    await _save_progress_for_user(db, user_id, user, progress)


async def ensure_indexes(db) -> None:
    await db.onboarding_progress.create_index([("userId", 1)], unique=True)
    await db.onboarding_progress.create_index([("completed", 1)])
    await db.onboarding_progress.create_index([("createdAt", -1)])


def register_onboarding_routes(
    api,
    *,
    db,
    get_user_dep,
    grant_xp,
    grant_aether,
    grant_badge,
    add_chronicle,
):
    """Monte les routes onboarding sur le router API principal."""

    @api.get("/onboarding/me")
    async def onboarding_me(user: dict = Depends(get_user_dep)):
        progress = await get_or_create_progress(db, user["user_id"])
        progress = await _save_progress_for_user(db, user["user_id"], user, progress)
        if progress.get("completed") and not user.get("tutorialCompleted"):
            user = {**user, "tutorialCompleted": True}
        return serialize_state(user, progress)

    @api.post("/onboarding/start")
    async def onboarding_start(body: OnboardingStartReq, user: dict = Depends(get_user_dep)):
        if not is_tutorial_eligible(user):
            raise HTTPException(403, "Didacticiel indisponible")
        progress = await get_or_create_progress(db, user["user_id"])
        if progress.get("completed") or user.get("tutorialCompleted"):
            if body.replay:
                raise HTTPException(403, "Quête déjà accomplie — didacticiel terminé définitivement")
            return serialize_state(user, progress)
        now = now_iso()
        if body.replay:
            progress.update({
                "currentStep": 0,
                "completedSteps": [],
                "skipped": False,
                "completed": False,
                "replayMode": True,
                "tutorialCompletedAt": None,
            })
        if not progress.get("tutorialStartedAt"):
            progress["tutorialStartedAt"] = now
        progress["skipped"] = False
        await _save_progress_for_user(db, user["user_id"], user, progress)
        return serialize_state(user, progress)

    @api.post("/onboarding/step")
    async def onboarding_step(body: OnboardingStepReq, user: dict = Depends(get_user_dep)):
        progress = await get_or_create_progress(db, user["user_id"])
        progress = await validate_and_apply_step(db, user, progress, body.step, body.event)
        progress = await _save_progress_for_user(db, user["user_id"], user, progress)
        state = serialize_state(user, progress)
        if body.step == "complete" and progress.get("completed"):
            try:
                rewards = await grant_tutorial_rewards(
                    db, user["user_id"],
                    grant_xp=grant_xp,
                    grant_aether=grant_aether,
                    grant_badge=grant_badge,
                    add_chronicle=add_chronicle,
                )
                state["rewards"] = rewards
            except HTTPException:
                raise
            except Exception as e:
                logger.warning("tutorial reward failed: %s", e)
        return state

    @api.post("/onboarding/skip")
    async def onboarding_skip(user: dict = Depends(get_user_dep)):
        if not is_tutorial_eligible(user):
            raise HTTPException(403, "Didacticiel indisponible")
        progress = await get_or_create_progress(db, user["user_id"])
        progress["skipped"] = True
        if not progress.get("tutorialStartedAt"):
            progress["tutorialStartedAt"] = now_iso()
        await _save_progress(db, user["user_id"], progress)
        return serialize_state(user, progress)

    @api.post("/onboarding/complete")
    async def onboarding_complete(user: dict = Depends(get_user_dep)):
        progress = await get_or_create_progress(db, user["user_id"])
        if progress.get("completed") or user.get("tutorialCompleted"):
            state = serialize_state(user, progress)
            try:
                rewards = await grant_tutorial_rewards(
                    db, user["user_id"],
                    grant_xp=grant_xp,
                    grant_aether=grant_aether,
                    grant_badge=grant_badge,
                    add_chronicle=add_chronicle,
                )
                state["rewards"] = rewards
            except HTTPException:
                raise
            except Exception as e:
                logger.warning("tutorial reward failed on complete: %s", e)
            return state
        progress = _auto_complete_class(user, progress)
        progress = await validate_and_apply_step(db, user, progress, "complete", "advance")
        progress = await _save_progress_for_user(db, user["user_id"], user, progress)
        state = serialize_state(user, progress)
        try:
            rewards = await grant_tutorial_rewards(
                db, user["user_id"],
                grant_xp=grant_xp,
                grant_aether=grant_aether,
                grant_badge=grant_badge,
                add_chronicle=add_chronicle,
            )
            state["rewards"] = rewards
        except HTTPException:
            raise
        except Exception as e:
            logger.warning("tutorial reward failed on complete: %s", e)
        return state

    @api.post("/onboarding/reward")
    async def onboarding_reward(user: dict = Depends(get_user_dep)):
        rewards = await grant_tutorial_rewards(
            db, user["user_id"],
            grant_xp=grant_xp,
            grant_aether=grant_aether,
            grant_badge=grant_badge,
            add_chronicle=add_chronicle,
        )
        return rewards

    @api.post("/onboarding/replay")
    async def onboarding_replay(user: dict = Depends(get_user_dep)):
        if not is_tutorial_eligible(user):
            raise HTTPException(403, "Didacticiel indisponible")
        progress = await get_or_create_progress(db, user["user_id"])
        if progress.get("completed") or user.get("tutorialCompleted"):
            raise HTTPException(403, "Quête déjà accomplie — didacticiel terminé définitivement")
        progress.update({
            "currentStep": 0,
            "completedSteps": [],
            "skipped": False,
            "completed": False,
            "replayMode": True,
            "tutorialCompletedAt": None,
        })
        if not progress.get("tutorialStartedAt"):
            progress["tutorialStartedAt"] = now_iso()
        await _save_progress(db, user["user_id"], progress)
        return serialize_state(user, progress)

    @api.get("/admin/onboarding/stats")
    async def admin_onboarding_stats(user: dict = Depends(get_user_dep)):
        if user.get("role") not in ("admin", "moderator"):
            raise HTTPException(403, "Accès staff requis")
        started = await db.onboarding_progress.count_documents({"tutorialStartedAt": {"$ne": None}})
        completed = await db.onboarding_progress.count_documents({"completed": True})
        rewards = await db.onboarding_progress.count_documents({"rewardsClaimed": True})
        skipped = await db.onboarding_progress.count_documents({"skipped": True})
        rate = round(completed / started * 100, 1) if started else 0.0
        return {
            "started": started,
            "completed": completed,
            "skipped": skipped,
            "rewards_distributed": rewards,
            "completion_rate_pct": rate,
        }

    return api
