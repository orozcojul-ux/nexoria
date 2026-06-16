"""Discord OAuth integration helpers.

Requires env vars:
    DISCORD_CLIENT_ID
    DISCORD_CLIENT_SECRET
    DISCORD_REDIRECT_URI  (e.g. http://localhost:3000/auth/discord/callback)

Frontend flow:
    1. User clicks "Connexion avec Discord" → redirected to authorize URL
    2. Discord redirects back to /auth/discord/callback?code=...
    3. Frontend POSTs the code to /api/auth/discord/exchange
    4. Backend exchanges code for token, fetches user info, creates NEXORIA session
"""
from __future__ import annotations

import os
from urllib.parse import quote

import httpx

DISCORD_API = "https://discord.com/api"
OAUTH_SCOPES = "identify email"


class DiscordAuthError(Exception):
    """Structured OAuth error for HTTP mapping."""

    def __init__(self, code: str, message: str, status: int = 401):
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def is_configured() -> bool:
    return all(os.environ.get(k) for k in ("DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "DISCORD_REDIRECT_URI"))


def build_avatar_url(discord_user: dict, size: int = 256) -> str | None:
    uid = discord_user.get("id")
    avatar_hash = discord_user.get("avatar")
    if not uid or not avatar_hash:
        return None
    ext = "gif" if str(avatar_hash).startswith("a_") else "png"
    return f"https://cdn.discordapp.com/avatars/{uid}/{avatar_hash}.{ext}?size={size}"


def build_authorize_url() -> str:
    """Construct the URL the user should be redirected to."""
    client_id = os.environ.get("DISCORD_CLIENT_ID", "")
    redirect = quote(os.environ.get("DISCORD_REDIRECT_URI", ""), safe="")
    scope = quote(OAUTH_SCOPES, safe="")
    return (
        f"{DISCORD_API}/oauth2/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect}"
        f"&response_type=code"
        f"&scope={scope}"
    )


def _parse_discord_user(user: dict) -> dict:
    discord_username = user.get("username") or ""
    discord_global_name = user.get("global_name") or None
    display = discord_global_name or discord_username or f"Discord{user['id'][:6]}"
    email = user.get("email") or f"discord_{user['id']}@nexoria.local"
    avatar_url = build_avatar_url(user)

    return {
        "discord_id": str(user["id"]),
        "discord_username": discord_username,
        "discord_global_name": discord_global_name,
        "email": email.lower(),
        "username": display.replace(" ", "") or f"Heros{user['id'][:6]}",
        "avatar_url": avatar_url,
        "discord_avatar_url": avatar_url,
    }


async def exchange_code(code: str) -> dict:
    """Exchange authorization code for Discord profile fields."""
    if not is_configured():
        raise DiscordAuthError("not_configured", "Discord OAuth non configuré côté serveur", 503)

    code = (code or "").strip()
    if not code:
        raise DiscordAuthError("missing_code", "Code d'autorisation manquant", 400)

    async with httpx.AsyncClient(timeout=15) as client:
        token_res = await client.post(
            f"{DISCORD_API}/oauth2/token",
            data={
                "client_id": os.environ["DISCORD_CLIENT_ID"],
                "client_secret": os.environ["DISCORD_CLIENT_SECRET"],
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": os.environ["DISCORD_REDIRECT_URI"],
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            detail = token_res.text[:200]
            raise DiscordAuthError("token_exchange_failed", f"Échange de token Discord échoué: {detail}", 401)

        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise DiscordAuthError("token_missing", "Token Discord absent dans la réponse", 401)

        user_res = await client.get(
            f"{DISCORD_API}/users/@me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_res.status_code != 200:
            raise DiscordAuthError("user_fetch_failed", "Impossible de récupérer le profil Discord", 401)

        user = user_res.json()
        if not user.get("id"):
            raise DiscordAuthError("user_invalid", "Profil Discord invalide", 401)

    return _parse_discord_user(user)
