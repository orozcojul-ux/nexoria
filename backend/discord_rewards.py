"""Discord channel announcements for NEXORIA economy (gains & dépenses)."""
from __future__ import annotations

import asyncio
import logging
import os

import discord_sync

logger = logging.getLogger("nexoria.discord_rewards")

DEFAULT_REWARDS_CHANNEL_ID = "1514271132667347055"

ACTION_LABELS = {
    "post": "Publication sur le fil",
    "comment": "Commentaire",
    "react": "Réaction donnée",
    "reaction_received": "Réaction reçue sur un post",
    "customization": "Personnalisation du profil",
    "story_written": "Histoire du personnage rédigée",
    "rift": "Faille dimensionnelle",
    "renamed": "Renommage du héros",
    "news_comment": "Commentaire sur une actualité",
    "forum_thread": "Sujet créé sur la Tribune",
    "forum_reply": "Réponse sur la Tribune",
    "report_validated": "Signalement validé",
    "gain_aether": "Gain d'Aether",
    "gain_reputation": "Gain de réputation",
    "gain_xp": "Gain d'expérience",
    "Inscription via Discord": "Inscription via Discord",
    "Récompense": "Récompense",
    "Aether passif quotidien": "Aether passif quotidien",
    "Don du Conseil": "Don du Conseil",
    "Retrait du Conseil": "Retrait du Conseil",
    "Récompense de saison": "Récompense de saison",
    "Récompense de guilde": "Récompense de guilde",
    "Game Master": "Action Game Master",
    "Badge débloqué": "Badge débloqué",
    "skill_allocate": "Point de compétence dépensé",
    "shop_purchase": "Achat boutique",
    "open_chest": "Ouverture de coffre",
    "kingdom_upgrade": "Amélioration du royaume",
    "guild_create": "Fondation d'un ordre",
    "guild_deposit": "Dépôt au coffre de guilde",
    "chest_refund": "Remboursement coffre",
    "Modification du Conseil": "Modification du Conseil",
}


def rewards_channel_id() -> str:
    return os.environ.get("DISCORD_REWARDS_CHANNEL_ID", DEFAULT_REWARDS_CHANNEL_ID).strip()


def action_label(action: str) -> str:
    if not action:
        return "Action inconnue"
    if action.startswith("quest:"):
        qid = action.split(":", 1)[1]
        return f"Quête accomplie ({qid})"
    if action.startswith("Quête :"):
        return action
    if action.startswith("Achat boutique :"):
        return action
    if action.startswith("Amélioration royaume :"):
        return action
    if action.startswith("Dépôt au coffre —"):
        return action
    if action.startswith("Remboursement boutique :"):
        return action
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
        parts.append(_fmt_delta(aether, "Aether"))
    if reputation != 0:
        parts.append(_fmt_delta(reputation, "Réputation"))
    if skill_points != 0:
        sign = "+" if skill_points > 0 else ""
        parts.append(f"{sign}{skill_points} point(s) de compétence")
    if badge_name:
        parts.append(f"Badge « {badge_name} »")
    if level_up:
        old_lvl = level_up.get("old")
        new_lvl = level_up.get("new")
        rank = level_up.get("rank", "")
        tier = level_up.get("tier")
        chunk = f"Niveau {old_lvl} → {new_lvl}"
        if rank:
            chunk += f" · Rang {rank}"
        if tier:
            chunk += f" · Palier {tier}"
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
    username = (user or {}).get("username") or "Héros"
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
        logger.warning("discord rewards: pas de boucle asyncio active")
