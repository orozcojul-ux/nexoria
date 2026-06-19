"""Discord channel announcements for NEXORIA economy (gains & spends)."""
from __future__ import annotations

import asyncio
import logging
import os

import discord_sync

logger = logging.getLogger("nexoria.discord_rewards")

DEFAULT_REWARDS_CHANNEL_ID = "1514271132667347055"
DEFAULT_LEVELUP_CHANNEL_ID = "1514271122412146739"

# English labels for Discord. Keys include legacy French action codes from server.py.
ACTION_LABELS = {
    "post": "Feed post",
    "comment": "Comment",
    "react": "Reaction given",
    "reaction_received": "Reaction received on a post",
    "customization": "Profile customization",
    "story_written": "Character story written",
    "rift": "Dimensional rift",
    "renamed": "Hero renamed",
    "news_comment": "News comment",
    "forum_thread": "Forum thread created",
    "forum_reply": "Forum reply",
    "report_validated": "Report validated",
    "gain_aether": "Ecus gained",
    "gain_reputation": "Reputation gained",
    "gain_xp": "XP gained",
    "Inscription via Discord": "Discord signup",
    "Récompense": "Reward",
    "Écus passifs quotidiens": "Daily passive Ecus",
    "Don du Conseil": "Council grant",
    "Retrait du Conseil": "Council withdrawal",
    "Récompense de saison": "Season reward",
    "Récompense de guilde": "Guild reward",
    "Game Master": "Game Master action",
    "Badge débloqué": "Badge unlocked",
    "skill_allocate": "Skill point spent",
    "shop_purchase": "Shop purchase",
    "open_chest": "Chest opened",
    "kingdom_upgrade": "Kingdom upgrade",
    "guild_create": "Guild founded",
    "guild_deposit": "Guild vault deposit",
    "chest_refund": "Chest refund",
    "Modification du Conseil": "Council edit",
    "Dépense": "Purchase",
    "Remboursement": "Refund",
}


def rewards_channel_id() -> str:
    return os.environ.get("DISCORD_REWARDS_CHANNEL_ID", DEFAULT_REWARDS_CHANNEL_ID).strip()


def levelup_channel_id() -> str:
    return os.environ.get("DISCORD_LEVELUP_CHANNEL_ID", DEFAULT_LEVELUP_CHANNEL_ID).strip()


def action_label(action: str) -> str:
    if not action:
        return "Unknown action"
    if action.startswith("quest:"):
        qid = action.split(":", 1)[1]
        return f"Quest completed ({qid})"
    if action.startswith("Quête :") or action.startswith("Quest:"):
        name = action.split(":", 1)[1].strip()
        return f"Quest completed ({name})"
    if action.startswith("Achat boutique :") or action.startswith("Shop purchase:"):
        name = action.split(":", 1)[1].strip()
        return f"Shop purchase ({name})"
    if action.startswith("Amélioration royaume :") or action.startswith("Kingdom upgrade:"):
        detail = action.split(":", 1)[1].strip()
        return f"Kingdom upgrade ({detail})"
    if action.startswith("Dépôt au coffre —") or action.startswith("Guild vault deposit —"):
        detail = action.split("—", 1)[1].strip() if "—" in action else action.split("-", 1)[-1].strip()
        return f"Guild vault deposit ({detail})"
    if action.startswith("Remboursement boutique :") or action.startswith("Shop refund:"):
        name = action.split(":", 1)[1].strip()
        return f"Shop refund ({name})"
    if action.startswith("Don du Conseil —") or action.startswith("Council grant —"):
        detail = action.split("—", 1)[1].strip() if "—" in action else action.split("-", 1)[-1].strip()
        return f"Council grant ({detail})"
    if action.startswith("Récompense de guilde —") or action.startswith("Guild reward —"):
        detail = action.split("—", 1)[1].strip() if "—" in action else action.split("-", 1)[-1].strip()
        return f"Guild reward ({detail})"
    if action.startswith("Récompense de saison") or action.startswith("Season reward"):
        return "Season reward"
    if action.startswith("Achat d'Écus") or action.startswith("Ecus purchase"):
        return action.replace("Achat d'Écus", "Ecus purchase").replace("recharge", "top-up")
    if action.startswith("Remboursement coffre"):
        return "Chest refund (duplicate relic)"
    return ACTION_LABELS.get(action, action.replace("_", " ").strip().capitalize())


def _fmt_delta(value: int, unit: str) -> str:
    return f"{value:+d} {unit}".replace(",", " ")


def _format_deltas(
    *,
    xp: int = 0,
    aether: int = 0,
    reputation: int = 0,
    badge_name: str | None = None,
    skill_points: int = 0,
    level_up: dict | None = None,
    extra: list[str] | None = None,
) -> list[str]:
    parts: list[str] = []
    if xp != 0:
        parts.append(_fmt_delta(xp, "XP"))
    if aether != 0:
        parts.append(_fmt_delta(aether, "Ecus"))
    if reputation != 0:
        parts.append(_fmt_delta(reputation, "Reputation"))
    if skill_points != 0:
        sign = "+" if skill_points > 0 else ""
        parts.append(f"{sign}{skill_points} skill point(s)")
    if badge_name:
        parts.append(f"Badge « {badge_name} »")
    if level_up:
        old_lvl = level_up.get("old")
        new_lvl = level_up.get("new")
        rank = level_up.get("rank", "")
        tier = level_up.get("tier")
        chunk = f"Level {old_lvl} → {new_lvl}"
        if rank:
            chunk += f" · Rank {rank}"
        if tier:
            chunk += f" · Tier {tier}"
        parts.append(chunk)
    if extra:
        parts.extend(extra)
    return parts


def _pick_emoji(*, xp=0, aether=0, reputation=0, skill_points=0, badge_name=None, level_up=None) -> str:
    gains = sum(1 for v in (xp, aether, reputation, skill_points) if v > 0)
    gains += bool(badge_name) + bool(level_up)
    spends = sum(1 for v in (xp, aether, reputation, skill_points) if v < 0)
    if spends and not gains:
        return "💸"
    if gains and not spends:
        return "🎮"
    return "📊"


async def notify_reward(
    db,
    user_id: str,
    action: str,
    *,
    xp: int = 0,
    aether: int = 0,
    reputation: int = 0,
    badge_name: str | None = None,
    skill_points: int = 0,
    level_up: dict | None = None,
    extra: list[str] | None = None,
) -> None:
    """Post a gain or spend line to the configured Discord rewards channel."""
    channel = rewards_channel_id()
    if not channel or not os.environ.get("DISCORD_BOT_TOKEN", "").strip():
        return

    deltas = _format_deltas(
        xp=xp,
        aether=aether,
        reputation=reputation,
        badge_name=badge_name,
        skill_points=skill_points,
        level_up=level_up,
        extra=extra,
    )
    if not deltas:
        return

    user = await db.users.find_one({"user_id": user_id}, {"username": 1})
    username = (user or {}).get("username") or "Hero"
    label = action_label(action)
    emoji = _pick_emoji(
        xp=xp, aether=aether, reputation=reputation,
        skill_points=skill_points, badge_name=badge_name, level_up=level_up,
    )
    message = f"{emoji} **{username}** · {label} → {' · '.join(deltas)}"
    await discord_sync.post_notification(message, channel_id=channel)


def schedule_reward_notify(db, user_id: str, action: str, **kwargs) -> None:
    """Fire-and-forget Discord economy announcement."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(notify_reward(db, user_id, action, **kwargs))
    except RuntimeError:
        logger.warning("discord rewards: no active asyncio loop")


_custom_tasks: set = set()
_levelup_tasks: set = set()


async def notify_levelup(db, user_id: str, new_level: int, rank: str | None = None) -> None:
    """Announce a hero's level-up in the dedicated level-up channel."""
    channel = levelup_channel_id()
    if not channel or not os.environ.get("DISCORD_BOT_TOKEN", "").strip():
        return
    user = await db.users.find_one({"user_id": user_id}, {"username": 1})
    username = (user or {}).get("username") or "A hero"
    rank_part = f" — Rank {rank}" if rank else ""
    message = f"⬆️ **{username}** just reached **level {new_level}**{rank_part}! 🎉"
    ok = await discord_sync.post_notification(message, channel_id=channel)
    if ok:
        logger.info("discord level-up message sent for %s (lvl %s)", username, new_level)
    else:
        logger.warning("discord level-up message failed for %s", username)


def schedule_levelup(db, user_id: str, new_level: int, rank: str | None = None) -> None:
    """Fire-and-forget level-up announcement."""
    try:
        loop = asyncio.get_running_loop()
        task = loop.create_task(notify_levelup(db, user_id, new_level, rank))
        _levelup_tasks.add(task)
        task.add_done_callback(_levelup_tasks.discard)
    except RuntimeError:
        logger.warning("discord rewards: no active asyncio loop")


async def notify_custom(message: str) -> None:
    """Post a raw message to the rewards channel (e.g. VIP activation)."""
    channel = rewards_channel_id()
    if not channel or not os.environ.get("DISCORD_BOT_TOKEN", "").strip():
        return
    ok = await discord_sync.post_notification(message, channel_id=channel)
    if ok:
        logger.info("discord rewards custom message sent")
    else:
        logger.warning("discord rewards custom message failed")


def schedule_custom(message: str) -> None:
    """Fire-and-forget raw rewards-channel announcement."""
    try:
        loop = asyncio.get_running_loop()
        task = loop.create_task(notify_custom(message))
        _custom_tasks.add(task)
        task.add_done_callback(_custom_tasks.discard)
    except RuntimeError:
        logger.warning("discord rewards: no active asyncio loop")


async def notify_to_channel(message: str, channel_id: str) -> None:
    """Post a raw message to an arbitrary Discord channel."""
    if not channel_id or not os.environ.get("DISCORD_BOT_TOKEN", "").strip():
        return
    try:
        ok = await discord_sync.post_notification(message, channel_id=channel_id)
        if ok:
            logger.info("discord message sent to channel %s", channel_id)
        else:
            logger.warning("discord message refused by Discord (channel %s)", channel_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("discord channel message failed (%s): %s", channel_id, exc)


def schedule_to_channel(message: str, channel_id: str) -> None:
    """Fire-and-forget announcement to a specific Discord channel."""
    try:
        loop = asyncio.get_running_loop()
        task = loop.create_task(notify_to_channel(message, channel_id))
        _custom_tasks.add(task)
        task.add_done_callback(_custom_tasks.discard)
    except RuntimeError:
        logger.warning("discord rewards: no active asyncio loop")
