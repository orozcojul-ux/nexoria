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


async def get_current_user(request: Request, db) -> dict:
    """Resolve user via session_token cookie or Authorization header."""
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
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


def generate_user_id() -> str:
    return f"user_{uuid.uuid4().hex[:12]}"
