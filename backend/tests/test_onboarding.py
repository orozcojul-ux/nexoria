"""Tests Guide du Nouveau Héros (onboarding)."""
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException

import onboarding as ob


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.onboarding_progress = MagicMock()
    db.users = MagicMock()
    db.onboarding_progress.find_one = AsyncMock(return_value=None)
    db.onboarding_progress.insert_one = AsyncMock()
    db.onboarding_progress.update_one = AsyncMock()
    db.users.update_one = AsyncMock()
    db.users.find_one = AsyncMock(return_value={"user_id": "u1", "username": "Hero", "class_id": "mage"})
    return db


def test_is_tutorial_eligible_regular_user():
    assert ob.is_tutorial_eligible({"user_id": "u1", "username": "Hero"}) is True


def test_is_tutorial_eligible_system_user():
    assert ob.is_tutorial_eligible({"user_id": "naria", "is_system": True}) is False


@pytest.mark.anyio
async def test_mark_profile_step(mock_db):
    user = {"user_id": "u1", "username": "Hero", "class_id": "mage"}
    progress = ob._default_progress("u1")
    updated = await ob.validate_and_apply_step(mock_db, user, progress, "profile", "visit")
    assert "profile" in updated["completedSteps"]


def test_auto_class_when_user_has_class():
    user = {"user_id": "u1", "class_id": "warrior"}
    progress = ob._default_progress("u1")
    progress = ob._auto_complete_class(user, progress)
    assert "class" in progress["completedSteps"]


@pytest.mark.anyio
async def test_complete_requires_prior_steps(mock_db):
    user = {"user_id": "u1", "username": "Hero", "class_id": "mage"}
    progress = ob._default_progress("u1")
    with pytest.raises(HTTPException):
        await ob.validate_and_apply_step(mock_db, user, progress, "complete", "advance")


@pytest.mark.anyio
async def test_grant_rewards_once(mock_db):
    progress = ob._default_progress("u1")
    progress["completed"] = True
    progress["rewardsClaimed"] = True
    mock_db.onboarding_progress.find_one = AsyncMock(return_value=progress)

    grant_xp = AsyncMock()
    grant_aether = AsyncMock()
    grant_badge = AsyncMock()
    add_chronicle = AsyncMock()

    result = await ob.grant_tutorial_rewards(
        mock_db, "u1",
        grant_xp=grant_xp,
        grant_aether=grant_aether,
        grant_badge=grant_badge,
        add_chronicle=add_chronicle,
    )
    assert result["already_claimed"] is True
    grant_xp.assert_not_called()


@pytest.mark.anyio
async def test_grant_rewards_first_time(mock_db):
    progress = ob._default_progress("u1")
    progress["completed"] = True
    mock_db.onboarding_progress.find_one = AsyncMock(return_value=progress)

    grant_xp = AsyncMock()
    grant_aether = AsyncMock()
    grant_badge = AsyncMock(return_value=True)
    add_chronicle = AsyncMock()

    result = await ob.grant_tutorial_rewards(
        mock_db, "u1",
        grant_xp=grant_xp,
        grant_aether=grant_aether,
        grant_badge=grant_badge,
        add_chronicle=add_chronicle,
    )
    assert result["already_claimed"] is False
    assert result["xp"] == 50
    assert result["aether"] == 25
    grant_xp.assert_called_once()
    grant_aether.assert_called_once()
    grant_badge.assert_called_once_with("u1", "nouveau_heros")


@pytest.mark.anyio
async def test_mark_class_step_on_visit(mock_db):
    user = {"user_id": "u1", "username": "Hero"}
    progress = ob._default_progress("u1")
    updated = await ob.validate_and_apply_step(mock_db, user, progress, "class", "visit")
    assert "class" in updated["completedSteps"]


@pytest.mark.anyio
async def test_complete_with_class_id_auto_sync(mock_db):
    user = {"user_id": "u1", "username": "Hero", "class_id": "mage"}
    progress = ob._default_progress("u1")
    for s in ["welcome", "profile", "community", "nexus", "chat", "progression"]:
        progress["completedSteps"].append(s)
    updated = await ob.validate_and_apply_step(mock_db, user, progress, "complete", "advance")
    assert updated["completed"] is True
    assert "class" in updated["completedSteps"]


@pytest.mark.anyio
async def test_step_blocked_when_completed(mock_db):
    user = {"user_id": "u1", "username": "Hero", "class_id": "mage"}
    progress = ob._default_progress("u1")
    progress["completed"] = True
    with pytest.raises(HTTPException) as exc:
        await ob.validate_and_apply_step(mock_db, user, progress, "profile", "visit")
    assert exc.value.status_code == 403


def test_replay_blocked_when_completed(mock_db):
    user = {"user_id": "u1", "username": "Hero", "tutorialCompleted": True}
    progress = ob._default_progress("u1")
    progress["completed"] = True
    mock_db.onboarding_progress.find_one = AsyncMock(return_value=progress)

    from fastapi import FastAPI, APIRouter
    from fastapi.testclient import TestClient

    app = FastAPI()
    api = APIRouter(prefix="/api")
    db = mock_db

    async def noop(*_a, **_k):
        return True

    async def get_user():
        return user

    ob.register_onboarding_routes(
        api,
        db=db,
        get_user_dep=get_user,
        grant_xp=noop,
        grant_aether=noop,
        grant_badge=AsyncMock(return_value=True),
        add_chronicle=noop,
    )
    app.include_router(api)
    client = TestClient(app)

    res = client.post("/api/onboarding/replay", json={})
    assert res.status_code == 403


def test_onboarding_step_route_accepts_json_body():
    """Les modèles Pydantic doivent être au niveau module (sinon FastAPI exige req en query)."""
    from fastapi import FastAPI, APIRouter
    from fastapi.testclient import TestClient

    app = FastAPI()
    api = APIRouter(prefix="/api")
    db = MagicMock()
    db.onboarding_progress.find_one = AsyncMock(return_value=ob._default_progress("u1"))
    db.onboarding_progress.insert_one = AsyncMock()
    db.onboarding_progress.update_one = AsyncMock()
    db.users.update_one = AsyncMock()

    async def noop(*_a, **_k):
        return True

    async def get_user():
        return {"user_id": "u1", "username": "Hero", "class_id": "mage"}

    ob.register_onboarding_routes(
        api,
        db=db,
        get_user_dep=get_user,
        grant_xp=noop,
        grant_aether=noop,
        grant_badge=AsyncMock(return_value=True),
        add_chronicle=noop,
    )
    app.include_router(api)
    client = TestClient(app)

    res = client.post("/api/onboarding/step", json={"step": "profile", "event": "visit"})
    assert res.status_code == 200
    assert "profile" in res.json()["completedSteps"]
