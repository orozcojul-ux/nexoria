"""Discord OAuth integration helpers.

Requires env vars:
    DISCORD_CLIENT_ID
    DISCORD_CLIENT_SECRET
    DISCORD_REDIRECT_URI  (e.g., https://nexoria-hero.preview.emergentagent.com/auth/discord/callback)

Frontend flow:
    1. User clicks "Continuer avec Discord" → redirected to authorize URL
    2. Discord redirects back to /auth/discord/callback?code=...
    3. Frontend POSTs the code to /api/auth/discord/exchange
    4. Backend exchanges code for token, fetches user info, creates session
"""
import os
import httpx

DISCORD_API = "https://discord.com/api"


def is_configured() -> bool:
    return all(os.environ.get(k) for k in ("DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "DISCORD_REDIRECT_URI"))


def build_authorize_url() -> str:
    """Construct the URL the user should be redirected to."""
    client_id = os.environ.get("DISCORD_CLIENT_ID", "")
    redirect = os.environ.get("DISCORD_REDIRECT_URI", "")
    scope = "identify email"
    return f"{DISCORD_API}/oauth2/authorize?client_id={client_id}&redirect_uri={redirect}&response_type=code&scope={scope}"


async def exchange_code(code: str) -> dict:
    """Exchange authorization code for an access_token + user profile."""
    if not is_configured():
        raise RuntimeError("Discord OAuth non configuré côté serveur")

    async with httpx.AsyncClient(timeout=15) as client:
        # Step 1: exchange code for token
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
            raise RuntimeError(f"Discord token exchange failed: {token_res.text}")
        token_data = token_res.json()
        access_token = token_data["access_token"]

        # Step 2: fetch user info
        user_res = await client.get(
            f"{DISCORD_API}/users/@me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_res.status_code != 200:
            raise RuntimeError("Discord user fetch failed")
        user = user_res.json()

    avatar_url = None
    if user.get("avatar"):
        avatar_url = f"https://cdn.discordapp.com/avatars/{user['id']}/{user['avatar']}.png"

    return {
        "discord_id": user["id"],
        "email": user.get("email") or f"discord_{user['id']}@nexoria.local",
        "username": user.get("global_name") or user.get("username") or f"Discord{user['id'][:6]}",
        "avatar_url": avatar_url,
    }
