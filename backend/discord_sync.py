"""NEXORIA — Discord role synchronization via Bot API (REST).

Maps NEXORIA classes + progression ranks to Discord role IDs and uses the
Bot Token (server-side ONLY) to apply them to guild members.

CRITICAL RULES enforced here:
- Staff roles (Gardien Suprême, Sage, Sentinelle) are NEVER touched.
- A member has at most ONE class role at a time.
- A member has at most ONE progression role at a time.
- All actions are no-ops if DISCORD_BOT_TOKEN/DISCORD_GUILD_ID are missing
  (degrades gracefully — the rest of NEXORIA keeps working).
- The bot token NEVER leaves the backend.
"""
import os
import logging
import asyncio
import httpx

logger = logging.getLogger("nexoria.discord_sync")

DISCORD_API = "https://discord.com/api/v10"

# class_id (NEXORIA backend) → Discord role ID
CLASS_ROLE_IDS = {
    "mage":          "1515273096767209493",
    "warrior":       "1515273097618391071",  # Guerrier
    "assassin":      "1515273098687942818",
    "paladin":       "1515273099971657899",
    "alchemist":     "1515273100902793217",  # Alchimiste
    "explorer":      "1515273102060163133",  # Explorateur
    "necromancer":   "1515273103155138562",  # Nécromancien
    "architect":     "1515273104417493093",
    "chronomancer":  "1515273105646288942",
    "inventor":      "1515273106619498539",
}
ALL_CLASS_ROLE_IDS = set(CLASS_ROLE_IDS.values())

# Progression tier name → Discord role ID (8 tiers, ordered ascending)
PROGRESSION_ROLE_IDS = {
    "Novice":             "1515273107907284993",
    "Voyageur":           "1515273109215641811",
    "Vétéran":            "1515273110562017371",
    "Maître des Ombres":  "1515273111120117872",
    "Seigneur du Temps":  "1515273112474746980",
    "Roi des Créateurs":  "1515273113560940615",
    "Légende Vivante":    "1515273114244878359",
    "Élu Cosmique":       "1515273115976994826",
}
ALL_PROGRESSION_ROLE_IDS = set(PROGRESSION_ROLE_IDS.values())


def progression_tier_from_level(level: int) -> str:
    """Map a hero level (1-999) to its progression tier name."""
    if level >= 700:
        return "Élu Cosmique"
    if level >= 400:
        return "Légende Vivante"
    if level >= 200:
        return "Roi des Créateurs"
    if level >= 100:
        return "Seigneur du Temps"
    if level >= 50:
        return "Maître des Ombres"
    if level >= 25:
        return "Vétéran"
    if level >= 10:
        return "Voyageur"
    return "Novice"


def _config():
    return {
        "token": os.environ.get("DISCORD_BOT_TOKEN", "").strip(),
        "guild_id": os.environ.get("DISCORD_GUILD_ID", "").strip(),
        "notify_channel_id": os.environ.get("DISCORD_NOTIFY_CHANNEL_ID", "").strip(),
    }


def is_configured() -> bool:
    cfg = _config()
    return bool(cfg["token"] and cfg["guild_id"])


def _headers(token: str) -> dict:
    return {"Authorization": f"Bot {token}", "User-Agent": "Nexoria/1.0"}


async def _fetch_member(client: httpx.AsyncClient, guild_id: str, discord_id: str, token: str):
    r = await client.get(f"{DISCORD_API}/guilds/{guild_id}/members/{discord_id}", headers=_headers(token))
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.json()


async def _modify_member_roles(client: httpx.AsyncClient, guild_id: str, discord_id: str, new_roles: list, token: str, reason: str = "NEXORIA sync"):
    """PATCH the full role list. Discord doesn't have a partial-update endpoint we can rely on
    when reconciling multiple roles atomically."""
    r = await client.patch(
        f"{DISCORD_API}/guilds/{guild_id}/members/{discord_id}",
        headers={**_headers(token), "X-Audit-Log-Reason": reason, "Content-Type": "application/json"},
        json={"roles": list(set(new_roles))},
    )
    if r.status_code not in (200, 204):
        raise RuntimeError(f"Discord PATCH member failed: {r.status_code} {r.text[:200]}")


async def post_notification(content: str, channel_id: str = None) -> bool:
    """Post a message to the configured notification channel. No-op if not configured."""
    cfg = _config()
    chan = channel_id or cfg["notify_channel_id"]
    if not cfg["token"] or not chan:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                f"{DISCORD_API}/channels/{chan}/messages",
                headers={**_headers(cfg["token"]), "Content-Type": "application/json"},
                json={"content": content[:1900]},
            )
            return r.status_code in (200, 201)
    except Exception as e:
        logger.warning(f"discord notify failed: {e}")
        return False


async def sync_discord_roles(db, user_id: str) -> dict:
    """Reconcile a NEXORIA user's class + progression roles on Discord.

    Returns a result dict: {ok, skipped?, applied?, error?, class_role, progression_role}.
    Always safe to call — gracefully no-ops on missing config or missing discord_id.
    """
    cfg = _config()
    if not is_configured():
        return {"ok": False, "skipped": True, "reason": "discord_not_configured"}

    user = await db.users.find_one({"user_id": user_id})
    if not user:
        return {"ok": False, "error": "user_not_found"}
    discord_id = user.get("discord_id")
    if not discord_id:
        return {"ok": False, "skipped": True, "reason": "no_discord_link"}

    class_id = user.get("class_id")
    class_role_id = CLASS_ROLE_IDS.get(class_id) if class_id else None
    progression_name = progression_tier_from_level(user.get("level", 1))
    progression_role_id = PROGRESSION_ROLE_IDS.get(progression_name)

    result = {
        "ok": False,
        "user_id": user_id, "discord_id": discord_id,
        "class_id": class_id, "class_role_id": class_role_id,
        "progression": progression_name, "progression_role_id": progression_role_id,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            member = await _fetch_member(client, cfg["guild_id"], discord_id, cfg["token"])
            if member is None:
                result.update({"error": "not_in_guild"})
                await _log_sync(db, user_id, False, "Discord user not in guild")
                return result

            existing_roles = set(member.get("roles", []))
            # Remove any prior class roles + prior progression roles
            cleaned = existing_roles - ALL_CLASS_ROLE_IDS - ALL_PROGRESSION_ROLE_IDS
            # Add current class + progression
            if class_role_id:
                cleaned.add(class_role_id)
            if progression_role_id:
                cleaned.add(progression_role_id)

            if cleaned == existing_roles:
                result.update({"ok": True, "applied": False, "reason": "no_change"})
                await _log_sync(db, user_id, True, "no_change")
                return result

            await _modify_member_roles(client, cfg["guild_id"], discord_id, list(cleaned), cfg["token"],
                                       reason=f"NEXORIA sync: class={class_id} tier={progression_name}")
            result.update({"ok": True, "applied": True})
            await _log_sync(db, user_id, True, f"class={class_id or '-'}; tier={progression_name}")
            return result
    except Exception as e:
        result.update({"error": str(e)[:300]})
        await _log_sync(db, user_id, False, str(e)[:300])
        return result


async def _log_sync(db, user_id: str, success: bool, message: str):
    """Persist a discord_sync_log row + mark user."""
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        await db.discord_sync_log.insert_one({
            "user_id": user_id, "success": success, "message": message, "created_at": now_iso,
        })
        if success:
            await db.users.update_one({"user_id": user_id},
                                       {"$set": {"discord_roles_synced_at": now_iso}})
    except Exception as e:
        logger.warning(f"discord sync log write failed: {e}")


def schedule_sync(db, user_id: str):
    """Fire-and-forget background sync. Use this from hot paths so the user
    request isn't slowed down. Errors are swallowed (logged to DB)."""
    if not is_configured():
        return
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(sync_discord_roles(db, user_id))
    except RuntimeError:
        # No running loop (e.g., from a sync context) — fall through
        pass
