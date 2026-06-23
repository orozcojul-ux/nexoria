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

import discord_translate
import discord_international

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


def _audit_reason(text: str) -> str:
    """Discord audit-log reasons travel in HTTP headers — must stay ASCII."""
    return text.encode("ascii", errors="replace").decode("ascii")


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
        headers={**_headers(token), "X-Audit-Log-Reason": _audit_reason(reason), "Content-Type": "application/json"},
        json={"roles": list(set(new_roles))},
    )
    if r.status_code not in (200, 204):
        raise RuntimeError(f"Discord PATCH member failed: {r.status_code} {r.text[:200]}")


async def post_notification(
    content: str,
    channel_id: str = None,
    *,
    translatable: bool = True,
    source_lang: str = "fr",
) -> bool:
    """Post a message to the configured notification channel. No-op if not configured."""
    cfg = _config()
    chan = channel_id or cfg["notify_channel_id"]
    if not cfg["token"] or not chan:
        return False
    payload: dict = {"content": content[:1900]}
    if translatable and content.strip():
        payload = discord_translate.attach_translate_components(payload)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                f"{DISCORD_API}/channels/{chan}/messages",
                headers={**_headers(cfg["token"]), "Content-Type": "application/json"},
                json=payload,
            )
            if r.status_code in (200, 201):
                if translatable and content.strip():
                    await discord_translate.after_post(chan, r.json(), source_lang=source_lang)
                return True
            return False
    except Exception as e:
        logger.warning(f"discord notify failed: {e}")
        return False


async def post_channel_message(
    channel_id: str,
    *,
    content: str = "",
    embeds: list | None = None,
    translatable: bool = True,
    source_lang: str = "fr",
) -> bool:
    """Post content and/or embeds with optional translation select menu."""
    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    if not token or not channel_id:
        return False
    message: dict = {}
    if content:
        message["content"] = content[:1900]
    if embeds:
        message["embeds"] = embeds
    if not message:
        return False
    if translatable:
        message = discord_translate.attach_translate_components(message)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                f"{DISCORD_API}/channels/{channel_id}/messages",
                headers={**_headers(token), "Content-Type": "application/json"},
                json=message,
            )
            if r.status_code in (200, 201):
                if translatable:
                    await discord_translate.after_post(channel_id, r.json(), source_lang=source_lang)
                return True
            logger.warning("discord post_channel_message failed: %s %s", r.status_code, r.text[:300])
            return False
    except Exception as e:
        logger.warning("discord post_channel_message failed: %s", e)
        return False


_channel_meta_cache: dict[str, dict] = {}


async def _fetch_channel_meta(client: httpx.AsyncClient, channel_id: str, token: str) -> dict | None:
    cached = _channel_meta_cache.get(channel_id)
    if cached:
        return cached
    r = await client.get(f"{DISCORD_API}/channels/{channel_id}", headers=_headers(token))
    if r.status_code != 200:
        logger.warning(f"discord channel lookup failed: {r.status_code} {r.text[:200]}")
        return None
    data = r.json()
    meta = {
        "type": data.get("type"),
        "tags": data.get("available_tags") or [],
    }
    _channel_meta_cache[channel_id] = meta
    return meta


async def create_forum_thread(
    channel_id: str,
    name: str,
    *,
    embeds: list | None = None,
    content: str = "",
    auto_archive_duration: int = 4320,
) -> bool:
    """Create a thread in a Discord forum or text channel."""
    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    if not token or not channel_id:
        return False
    message: dict = {}
    if content:
        message["content"] = content[:1900]
    if embeds:
        message["embeds"] = embeds
    if not message:
        return False
    payload = {
        "name": (name or "Announcement")[:100],
        "auto_archive_duration": auto_archive_duration,
        "message": message,
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            meta = await _fetch_channel_meta(client, channel_id, token)
            if meta:
                ch_type = meta.get("type")
                if ch_type == 0:
                    # Text channel — public thread required (not a GUILD_FORUM).
                    payload["type"] = 11
                elif ch_type == 15:
                    tag_ids = [
                        t.get("id") for t in meta.get("tags", []) if t.get("id")
                    ]
                    if tag_ids:
                        payload["applied_tags"] = [tag_ids[0]]

            r = await client.post(
                f"{DISCORD_API}/channels/{channel_id}/threads",
                headers={**_headers(token), "Content-Type": "application/json"},
                json=payload,
            )
            if r.status_code in (200, 201):
                body = r.json()
                thread_id = str(body.get("id") or "")
                starter = body.get("message") or {}
                starter_id = str(starter.get("id") or thread_id)
                if thread_id and starter_id:
                    asyncio.create_task(
                        discord_translate.maybe_post_forum_translate_hint(
                            channel_id,
                            thread_id,
                            starter_id,
                        )
                    )
                return True

            logger.warning(f"discord thread failed: {r.status_code} {r.text[:300]}")

            # Fallback: post embed directly in the channel (text/announcement).
            if meta and meta.get("type") in (0, 5):
                fallback = discord_translate.attach_translate_components(dict(message))
                r2 = await client.post(
                    f"{DISCORD_API}/channels/{channel_id}/messages",
                    headers={**_headers(token), "Content-Type": "application/json"},
                    json=fallback,
                )
                if r2.status_code in (200, 201):
                    await discord_translate.after_post(
                        channel_id, r2.json(), source_lang="fr",
                    )
                    return True
                logger.warning(f"discord message fallback failed: {r2.status_code} {r2.text[:300]}")
            return False
    except Exception as e:
        logger.warning(f"discord thread failed: {e}")
        return False


def _build_avatar_url(discord_user: dict, size: int = 256) -> str | None:
    uid = discord_user.get("id")
    avatar_hash = discord_user.get("avatar")
    if not uid or not avatar_hash:
        return None
    ext = "gif" if str(avatar_hash).startswith("a_") else "png"
    return f"https://cdn.discordapp.com/avatars/{uid}/{avatar_hash}.{ext}?size={size}"


def _avatar_should_sync_from_discord(user: dict, discord_avatar_url: str | None) -> bool:
    current = user.get("avatar_url") or ""
    if not discord_avatar_url:
        return False
    if not current:
        return True
    if current == user.get("discord_avatar_url"):
        return True
    return "cdn.discordapp.com/avatars/" in current


def _discord_display_name(member: dict) -> str:
    du = member.get("user") or {}
    return member.get("nick") or du.get("global_name") or du.get("username") or ""


async def _apply_discord_profile(db, user_id: str, user: dict, member: dict) -> dict:
    """Refresh Discord username, global name, guild nick and avatar on the NEXORIA profile."""
    from datetime import datetime, timezone

    du = member.get("user") or {}
    avatar_url = _build_avatar_url(du)
    patch = {
        "discord_username": du.get("username"),
        "discord_global_name": du.get("global_name"),
        "discord_guild_nick": member.get("nick"),
        "discord_avatar_url": avatar_url,
        "discord_profile_synced_at": datetime.now(timezone.utc).isoformat(),
    }
    if _avatar_should_sync_from_discord(user, avatar_url):
        patch["avatar_url"] = avatar_url

    changed_fields = [
        k for k, v in patch.items()
        if k != "discord_profile_synced_at" and user.get(k) != v
    ]
    await db.users.update_one({"user_id": user_id}, {"$set": patch})
    return {
        "profile_updated": bool(changed_fields),
        "discord_display_name": _discord_display_name(member),
        "changed_fields": changed_fields,
    }


async def sync_discord_roles(db, user_id: str) -> dict:
    """Reconcile Discord profile + guild roles for a linked NEXORIA user."""
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

            profile_result = await _apply_discord_profile(db, user_id, user, member)
            result.update(profile_result)

            existing_roles = set(member.get("roles", []))
            cleaned = existing_roles - ALL_CLASS_ROLE_IDS - ALL_PROGRESSION_ROLE_IDS
            if class_role_id:
                cleaned.add(class_role_id)
            if progression_role_id:
                cleaned.add(progression_role_id)

            if cleaned == existing_roles:
                msg = "no_change"
                if profile_result.get("profile_updated"):
                    msg = f"profile_updated; {profile_result.get('discord_display_name', '')}"
                result.update({"ok": True, "applied": False, "reason": "no_change"})
                await _log_sync(db, user_id, True, msg)
                await discord_international.sync_language_role_if_missing(db, user_id, member, user)
                return result

            await _modify_member_roles(
                client, cfg["guild_id"], discord_id, list(cleaned), cfg["token"],
                reason=f"NEXORIA sync class={class_id or '-'} tier_id={progression_role_id or '-'}",
            )
            result.update({"ok": True, "applied": True})
            await _log_sync(
                db, user_id, True,
                f"class={class_id or '-'}; tier={progression_name}; discord={profile_result.get('discord_display_name', '')}",
            )
            await discord_international.sync_language_role_if_missing(db, user_id, member, user)
            return result
    except Exception as e:
        result.update({"error": str(e)[:300]})
        await _log_sync(db, user_id, False, str(e)[:300])
        return result


async def sync_discord_user(db, user_id: str) -> dict:
    """Alias — profile + roles."""
    return await sync_discord_roles(db, user_id)


async def grant_extra_role(db, user_id: str, role_id: str, reason: str = "NEXORIA reward") -> bool:
    """Add a single Discord role to a linked member (additive, non-destructive).
    Used for reward roles like the referral 'Ambassadeur'. No-op if not configured."""
    cfg = _config()
    role_id = (role_id or "").strip()
    if not is_configured() or not role_id:
        return False
    user = await db.users.find_one({"user_id": user_id}, {"discord_id": 1, "_id": 0})
    discord_id = (user or {}).get("discord_id")
    if not discord_id:
        return False
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.put(
                f"{DISCORD_API}/guilds/{cfg['guild_id']}/members/{discord_id}/roles/{role_id}",
                headers={**_headers(cfg["token"]), "X-Audit-Log-Reason": _audit_reason(reason)},
            )
            if r.status_code in (200, 204):
                return True
            logger.warning("grant_extra_role failed: %s %s", r.status_code, r.text[:200])
            return False
    except Exception as e:  # noqa: BLE001
        logger.warning("grant_extra_role error: %s", e)
        return False


def schedule_extra_role(db, user_id: str, role_id: str, reason: str = "NEXORIA reward"):
    """Fire-and-forget additive role grant."""
    if not is_configured() or not (role_id or "").strip():
        return
    try:
        loop = asyncio.get_event_loop()
        task = loop.create_task(grant_extra_role(db, user_id, role_id, reason))
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)
    except RuntimeError:
        pass


async def remove_extra_role(db, user_id: str, role_id: str, reason: str = "NEXORIA reward expired") -> bool:
    """Remove a single Discord role from a linked member. No-op if not configured."""
    cfg = _config()
    role_id = (role_id or "").strip()
    if not is_configured() or not role_id:
        return False
    user = await db.users.find_one({"user_id": user_id}, {"discord_id": 1, "_id": 0})
    discord_id = (user or {}).get("discord_id")
    if not discord_id:
        return False
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.delete(
                f"{DISCORD_API}/guilds/{cfg['guild_id']}/members/{discord_id}/roles/{role_id}",
                headers={**_headers(cfg["token"]), "X-Audit-Log-Reason": _audit_reason(reason)},
            )
            if r.status_code in (200, 204):
                return True
            logger.warning("remove_extra_role failed: %s %s", r.status_code, r.text[:200])
            return False
    except Exception as e:  # noqa: BLE001
        logger.warning("remove_extra_role error: %s", e)
        return False


def schedule_remove_role(db, user_id: str, role_id: str, reason: str = "NEXORIA reward expired"):
    """Fire-and-forget additive role removal."""
    if not is_configured() or not (role_id or "").strip():
        return
    try:
        loop = asyncio.get_event_loop()
        task = loop.create_task(remove_extra_role(db, user_id, role_id, reason))
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)
    except RuntimeError:
        pass


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


# Strong refs so fire-and-forget tasks aren't garbage-collected mid-flight.
_background_tasks: set = set()


def schedule_sync(db, user_id: str):
    """Fire-and-forget background sync. Use this from hot paths so the user
    request isn't slowed down. Errors are swallowed (logged to DB)."""
    if not is_configured():
        return
    try:
        loop = asyncio.get_event_loop()
        task = loop.create_task(sync_discord_user(db, user_id))
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)
    except RuntimeError:
        # No running loop (e.g., from a sync context) — fall through
        pass


# ---------------------------------------------------------------------------
# Periodic auto-sync — reconciles linked members on a rotating schedule so
# ranks/classes stay in sync even without an explicit trigger.
# ---------------------------------------------------------------------------
_periodic_task: "asyncio.Task | None" = None


async def _periodic_loop(db, interval: int, batch: int):
    logger.info("Discord periodic sync loop running (every %ss, batch %s)", interval, batch)
    while True:
        try:
            if is_configured():
                from datetime import datetime, timezone
                # Least-recently-attempted linked members first (missing field sorts
                # first), so every member is reconciled in turn — including those that
                # fail (e.g. left the guild) without blocking the rotation.
                users = await db.users.find(
                    {"discord_id": {"$exists": True, "$nin": [None, ""]}},
                    {"user_id": 1, "_id": 0},
                ).sort("discord_sync_attempted_at", 1).limit(batch).to_list(batch)
                for u in users:
                    # Mark the attempt up-front so failures still rotate out.
                    await db.users.update_one(
                        {"user_id": u["user_id"]},
                        {"$set": {"discord_sync_attempted_at": datetime.now(timezone.utc).isoformat()}},
                    )
                    try:
                        await sync_discord_roles(db, u["user_id"])
                    except Exception as e:  # noqa: BLE001
                        logger.warning("periodic sync for %s failed: %s", u.get("user_id"), e)
                    # Gentle pacing between members to respect Discord rate limits.
                    await asyncio.sleep(0.4)
        except asyncio.CancelledError:
            logger.info("Discord periodic sync loop cancelled")
            raise
        except Exception as e:  # noqa: BLE001
            logger.warning("Discord periodic sync cycle error: %s", e)
        await asyncio.sleep(interval)


def start_periodic_sync(db, interval: int = 30, batch: int = 8):
    """Start the background reconciliation loop. Idempotent / graceful no-op
    when Discord isn't configured."""
    global _periodic_task
    if _periodic_task and not _periodic_task.done():
        return _periodic_task
    if not is_configured():
        logger.info("Discord periodic sync disabled (DISCORD_BOT_TOKEN/GUILD_ID missing)")
        return None
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        return None
    _periodic_task = loop.create_task(_periodic_loop(db, interval, batch))
    logger.info("Discord periodic sync scheduled (every %ss)", interval)
    return _periodic_task


def stop_periodic_sync():
    global _periodic_task
    if _periodic_task and not _periodic_task.done():
        _periodic_task.cancel()
    _periodic_task = None
