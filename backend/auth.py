"""Unified auth helpers - JWT for email/password + Emergent Google session tokens.
Both auth methods produce a session_token cookie verified via the user_sessions collection.
"""
import os
import uuid
import bcrypt
import jwt
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request

JWT_ALGORITHM = "HS256"

# Inactivité : une session sans activité depuis SESSION_IDLE_MINUTES est fermée.
# Couvre à la fois l'inactivité (onglet ouvert mais aucune interaction) et la
# fermeture du navigateur (les heartbeats cessent) — fiable sur iPad, mobile et PC.
SESSION_IDLE_MINUTES = int(os.environ.get("SESSION_IDLE_MINUTES", "30"))


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_session_token() -> str:
    """Random opaque session token (used both for JWT-auth users and Google-auth users)."""
    return secrets.token_urlsafe(48)


def session_expiry(days: int = 7) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)


def set_session_cookie(response, token: str, max_age: int = 7 * 24 * 3600):
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=max_age,
        path="/",
    )


def clear_session_cookie(response):
    response.delete_cookie(key="session_token", path="/")


def _extract_session_token(request: Request) -> str | None:
    """Prefer explicit Bearer token (per-tab sessionStorage) over httponly cookie."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        bearer = auth_header[7:].strip()
        if bearer:
            return bearer
    cookie = request.cookies.get("session_token")
    return cookie or None


async def get_current_user(request: Request, db) -> dict:
    """Resolve user via Authorization header (preferred) or session_token cookie."""
    token = _extract_session_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    # Idle timeout: kill the session if there has been no *interaction* for too long.
    # We use `last_heartbeat_at` (set ONLY by /auth/heartbeat, which the client fires
    # solely while the user is genuinely active) — NOT `last_activity_at`, which any
    # background poll would refresh, defeating the timeout. Falls back to
    # last_activity_at for legacy sessions that predate the heartbeat field.
    idle_ref = session.get("last_heartbeat_at") or session.get("last_activity_at")
    if idle_ref and SESSION_IDLE_MINUTES > 0:
        try:
            ref_dt = datetime.fromisoformat(idle_ref) if isinstance(idle_ref, str) else idle_ref
            if ref_dt.tzinfo is None:
                ref_dt = ref_dt.replace(tzinfo=timezone.utc)
            idle_seconds = (datetime.now(timezone.utc) - ref_dt).total_seconds()
            if idle_seconds > SESSION_IDLE_MINUTES * 60:
                await db.user_sessions.delete_one({"session_token": token})
                raise HTTPException(status_code=401, detail="Session expirée (inactivité)")
        except HTTPException:
            raise
        except Exception:
            pass

    # Tab-close detection: reject sessions flagged as closed more than 5 seconds ago.
    # This is set by `beforeunload` + sendBeacon; the flag is removed if the user
    # merely refreshed the page (/auth/tab-reactivate called within ~2 s).
    tab_closed_at = session.get("tab_closed_at")
    if tab_closed_at:
        try:
            closed_dt = datetime.fromisoformat(tab_closed_at) if isinstance(tab_closed_at, str) else tab_closed_at
            if closed_dt.tzinfo is None:
                closed_dt = closed_dt.replace(tzinfo=timezone.utc)
            if (datetime.now(timezone.utc) - closed_dt).total_seconds() > 5:
                # More than 5 seconds since the close event — not a refresh.
                # Delete the session so the next request starts fresh.
                await db.user_sessions.delete_one({"session_token": token})
                raise HTTPException(status_code=401, detail="Session closed (navigateur fermé)")
        except HTTPException:
            raise
        except Exception:
            pass  # If parsing fails, allow the session through

    # Throttled activity ping (max once per 60s) — drives site_online accuracy
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    last_act = session.get("last_activity_at")
    should_touch = True
    if last_act:
        try:
            last_dt = datetime.fromisoformat(last_act) if isinstance(last_act, str) else last_act
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            should_touch = (now - last_dt).total_seconds() >= 60
        except Exception:
            should_touch = True
    if should_touch:
        await db.user_sessions.update_one(
            {"session_token": token},
            {"$set": {"last_activity_at": now_iso}},
        )

    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Check ban
    banned_until = user.get("banned_until")
    if banned_until:
        if isinstance(banned_until, str):
            banned_until = datetime.fromisoformat(banned_until)
        if banned_until.tzinfo is None:
            banned_until = banned_until.replace(tzinfo=timezone.utc)
        if banned_until > datetime.now(timezone.utc):
            reason = user.get("ban_reason", "Violation des règles")
            raise HTTPException(
                status_code=403,
                detail={
                    "banned": True,
                    "reason": reason,
                    "until": banned_until.isoformat(),
                },
            )
        else:
            # Ban expired — auto-unban
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$unset": {"banned_until": "", "ban_reason": ""}},
            )
            user.pop("banned_until", None)
            user.pop("ban_reason", None)

    return user


async def get_user_by_token(token: str, db) -> dict:
    """Helper for non-HTTP contexts (e.g., Socket.IO handshake). Returns user dict or None."""
    if not token:
        return None
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None
    return await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})




def generate_user_id() -> str:
    return f"user_{uuid.uuid4().hex[:12]}"
