"""Empêche les actions de modération staff redondantes (ban déjà actif, etc.)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def parse_until(until_val) -> datetime | None:
    if not until_val:
        return None
    try:
        dt = datetime.fromisoformat(until_val) if isinstance(until_val, str) else until_val
    except (TypeError, ValueError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def is_until_active(until_val) -> bool:
    dt = parse_until(until_val)
    return bool(dt and dt > now_utc())


def is_site_ban_active(user: dict | None) -> bool:
    return is_until_active((user or {}).get("banned_until"))


def is_forum_ban_active(user: dict | None) -> bool:
    return is_until_active((user or {}).get("forum_banned_until"))


def is_forum_mute_active(user: dict | None) -> bool:
    if is_forum_ban_active(user):
        return False
    return is_until_active((user or {}).get("forum_muted_until"))


def is_moderation_restriction_active(user: dict | None) -> bool:
    return is_until_active((user or {}).get("moderation_restricted_until"))


def format_until_fr(until_val) -> str:
    dt = parse_until(until_val)
    if not dt:
        return "—"
    return dt.astimezone(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")


def require_site_not_banned(target: dict) -> None:
    if is_site_ban_active(target):
        until = format_until_fr(target.get("banned_until"))
        raise HTTPException(
            409,
            f"Ce héros est déjà banni du royaume (jusqu'au {until}). "
            "Levez le ban existant avant d'en appliquer un nouveau.",
        )


def require_site_banned(target: dict) -> None:
    if not is_site_ban_active(target):
        raise HTTPException(409, "Ce héros n'est pas banni — aucune levée nécessaire.")


def require_forum_not_banned(target: dict) -> None:
    if is_forum_ban_active(target):
        until = format_until_fr(target.get("forum_banned_until"))
        raise HTTPException(
            409,
            f"Ce héros est déjà exclu de la Tribune (jusqu'au {until}).",
        )


def require_forum_banned(target: dict) -> None:
    if not is_forum_ban_active(target):
        raise HTTPException(409, "Ce héros n'est pas exclu du forum.")


def require_forum_not_muted(target: dict) -> None:
    if is_forum_ban_active(target):
        raise HTTPException(
            409,
            "Ce héros est déjà exclu du forum — le mute n'est pas applicable.",
        )
    if is_forum_mute_active(target):
        until = format_until_fr(target.get("forum_muted_until"))
        raise HTTPException(
            409,
            f"Ce héros est déjà en mute forum (jusqu'au {until}).",
        )


def require_forum_muted(target: dict) -> None:
    if not is_forum_mute_active(target):
        raise HTTPException(409, "Ce héros n'est pas en mute forum.")


def require_restriction_active(target: dict) -> None:
    if not is_moderation_restriction_active(target):
        raise HTTPException(409, "Aucune restriction de modération active sur ce héros.")
