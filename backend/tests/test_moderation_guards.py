"""Tests for moderation duplicate-action guards."""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from moderation_guards import (
    is_forum_ban_active,
    is_forum_mute_active,
    is_site_ban_active,
    require_forum_banned,
    require_forum_not_banned,
    require_forum_not_muted,
    require_site_banned,
    require_site_not_banned,
)


def _future_iso(hours: int = 24) -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


def _past_iso(hours: int = 1) -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()


def test_site_ban_active():
    assert is_site_ban_active({"banned_until": _future_iso()})
    assert not is_site_ban_active({"banned_until": _past_iso()})
    assert not is_site_ban_active({})


def test_require_site_not_banned_raises_when_active():
    with pytest.raises(HTTPException) as exc:
        require_site_not_banned({"banned_until": _future_iso()})
    assert exc.value.status_code == 409
    assert "déjà banni" in exc.value.detail


def test_require_site_banned_raises_when_not_active():
    with pytest.raises(HTTPException) as exc:
        require_site_banned({"banned_until": None})
    assert exc.value.status_code == 409


def test_forum_ban_and_mute_guards():
    user = {"forum_banned_until": _future_iso(), "forum_muted_until": _future_iso()}
    assert is_forum_ban_active(user)
    assert not is_forum_mute_active(user)

    with pytest.raises(HTTPException):
        require_forum_not_banned(user)

    muted = {"forum_muted_until": _future_iso()}
    assert is_forum_mute_active(muted)
    with pytest.raises(HTTPException):
        require_forum_not_muted(muted)

    with pytest.raises(HTTPException):
        require_forum_banned(muted)
