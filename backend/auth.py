"""Unified auth helpers - JWT for email/password + Emergent Google session tokens.
Both auth methods produce a session_token cookie verified via the user_sessions collection.
"""
import os
import uuid
import bcrypt
import jwt
import secrets
import asyncio
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request

JWT_ALGORITHM = "HS256"

# Inactivité : une session sans heartbeat depuis SESSION_IDLE_MINUTES est fermée.
SESSION_IDLE_MINUTES = int(os.environ.get("SESSION_IDLE_MINUTES", "15"))
# Grace après fermeture d'onglet (F5 refresh annule via /auth/tab-reactivate).
TAB_CLOSE_GRACE_SECONDS = int(os.environ.get("TAB_CLOSE_GRACE_SECONDS", "3"))


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


def session_idle_cutoff_iso() -> str:
    """Sessions without heartbeat since this instant are considered idle/offline."""
    return (datetime.now(timezone.utc) - timedelta(minutes=SESSION_IDLE_MINUTES)).isoformat()


def session_is_idle(session: dict) -> bool:
    """True when the session has no recent heartbeat (or legacy activity fallback)."""
    if not session or SESSION_IDLE_MINUTES <= 0:
        return False
    idle_ref = session.get("last_heartbeat_at") or session.get("last_activity_at")
    if not idle_ref:
        return False
    try:
        ref_dt = datetime.fromisoformat(idle_ref) if isinstance(idle_ref, str) else idle_ref
        if ref_dt.tzinfo is None:
            ref_dt = ref_dt.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - ref_dt).total_seconds() > SESSION_IDLE_MINUTES * 60
    except Exception:
        return False


async def record_user_connection(db, user_id: str) -> None:
    """Horodate une nouvelle connexion (ouverture de session uniquement)."""
    if not user_id:
        return
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"last_seen": datetime.now(timezone.utc).isoformat()}},
    )


async def finalize_last_seen_on_session_end(db, user_id: str, session: dict | None) -> None:
    """À la fermeture propre de session, fige la dernière connexion sur l'heure d'ouverture."""
    if not user_id or not session:
        return
    connected_at = session.get("created_at")
    if not connected_at:
        return
    ts = connected_at if isinstance(connected_at, str) else connected_at.isoformat()
    await db.users.update_one({"user_id": user_id}, {"$set": {"last_seen": ts}})


async def terminate_session(db, token: str) -> str | None:
    """Delete a session row. Returns user_id if a session was removed."""
    session = await db.user_sessions.find_one({"session_token": token}, {"user_id": 1})
    if not session:
        return None
    user_id = session.get("user_id")
    await db.user_sessions.delete_one({"session_token": token})
    return user_id


async def end_session_with_side_effects(db, token: str) -> str | None:
    """Termine une session, fige last_seen, puis déclenche les effets de déconnexion."""
    session = await db.user_sessions.find_one(
        {"session_token": token},
        {"user_id": 1, "created_at": 1},
    )
    user_id = await terminate_session(db, token)
    if not user_id:
        return None
    await finalize_last_seen_on_session_end(db, user_id, session)
    await run_session_end_side_effects(db, user_id)
    return user_id


_session_end_extra = None


def register_session_end_extra(callback):
    """Optional hook (e.g. friend presence) when any session ends."""
    global _session_end_extra
    _session_end_extra = callback


async def run_session_end_side_effects(db, user_id: str):
    """Disconnect realtime layers after any session termination (best-effort)."""
    if not user_id:
        return
    try:
        import nexus_world
        await nexus_world.disconnect_user(user_id)
    except Exception:
        pass
    try:
        import discord_auth_forum
        user = await db.users.find_one({"user_id": user_id}, {"username": 1})
        if user:
            discord_auth_forum.schedule_auth_event("logout", user)
    except Exception:
        pass
    if _session_end_extra:
        try:
            result = _session_end_extra(user_id)
            if asyncio.iscoroutine(result):
                await result
        except Exception:
            pass


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

    # Idle timeout driven by heartbeat (not background API polls).
    idle_ref = session.get("last_heartbeat_at") or session.get("last_activity_at")
    if idle_ref and SESSION_IDLE_MINUTES > 0:
        try:
            ref_dt = datetime.fromisoformat(idle_ref) if isinstance(idle_ref, str) else idle_ref
            if ref_dt.tzinfo is None:
                ref_dt = ref_dt.replace(tzinfo=timezone.utc)
            idle_seconds = (datetime.now(timezone.utc) - ref_dt).total_seconds()
            if idle_seconds > SESSION_IDLE_MINUTES * 60:
                user_id = session.get("user_id")
                await finalize_last_seen_on_session_end(db, user_id, session)
                await db.user_sessions.delete_one({"session_token": token})
                if user_id:
                    await run_session_end_side_effects(db, user_id)
                raise HTTPException(status_code=401, detail="Session expirée (inactivité)")
        except HTTPException:
            raise
        except Exception:
            pass

    # Tab close: grace window lets F5 refresh call /auth/tab-reactivate.
    tab_closed_at = session.get("tab_closed_at")
    if tab_closed_at:
        try:
            closed_dt = datetime.fromisoformat(tab_closed_at) if isinstance(tab_closed_at, str) else tab_closed_at
            if closed_dt.tzinfo is None:
                closed_dt = closed_dt.replace(tzinfo=timezone.utc)
            if (datetime.now(timezone.utc) - closed_dt).total_seconds() > TAB_CLOSE_GRACE_SECONDS:
                user_id = session.get("user_id")
                await finalize_last_seen_on_session_end(db, user_id, session)
                await db.user_sessions.delete_one({"session_token": token})
                if user_id:
                    await run_session_end_side_effects(db, user_id)
                raise HTTPException(status_code=401, detail="Session fermée")
        except HTTPException:
            raise
        except Exception:
            pass

    # Throttled activity ping (max once per 60s) — legacy presence fallback only.
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
