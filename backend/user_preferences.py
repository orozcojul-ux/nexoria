"""User language/country preferences — MongoDB + Discord role sync."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import discord_international as di

VALID_UI_LANGUAGES = frozenset(spec["code"] for spec in di.LANGUAGE_SPECS)
VALID_UI_COUNTRIES = frozenset(spec["code"] for spec in di.COUNTRY_SPECS if spec["code"] != "other")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_preferred_language(raw: str | None) -> str | None:
    if raw is None:
        return None
    code = str(raw).strip().lower().replace("_", "-")
    if code in ("pt-br", "pt_br"):
        code = "pt"
    if code in VALID_UI_LANGUAGES:
        return code
    return None


def normalize_country(raw: str | None) -> str | None:
    if raw is None:
        return None
    code = str(raw).strip().lower()
    if not code:
        return ""
    if code in VALID_UI_COUNTRIES:
        return code
    return None


def build_preferences_patch(
    *,
    language: str | None = None,
    preferred_language: str | None = None,
    country: str | None = None,
    country_code: str | None = None,
    country_provided: bool = False,
) -> tuple[dict[str, Any], list[str], dict[str, Any]]:
    """Build MongoDB $set / $unset for language/country only."""
    update: dict[str, Any] = {}
    unset: list[str] = []
    meta: dict[str, Any] = {"language_provided": False, "country_provided": False}

    lang_raw = language if language is not None else preferred_language
    if lang_raw is not None:
        normalized = normalize_preferred_language(lang_raw)
        if normalized is None:
            raise ValueError("invalid_language")
        update["language"] = normalized
        meta["language_provided"] = True

    country_raw = country if country_provided or country is not None else country_code
    if country_provided or country is not None or country_code is not None:
        meta["country_provided"] = True
        if country_raw is None and not country_provided:
            pass
        else:
            normalized_country = normalize_country(country_raw if country_raw is not None else "")
            if normalized_country is None:
                raise ValueError("invalid_country")
            if not normalized_country:
                for field in ("country_code", "country_source", "country_synced_at"):
                    unset.append(field)
            else:
                update["country_code"] = normalized_country
                update["country_source"] = "manual"
                update["country_synced_at"] = now_iso()

    return update, unset, meta


async def save_user_preferences(
    db,
    user: dict,
    *,
    language: str | None = None,
    preferred_language: str | None = None,
    country: str | None = None,
    country_code: str | None = None,
    country_provided: bool = False,
    sync_discord: bool = True,
) -> dict[str, Any]:
    """Persist preferences and optionally sync Discord roles."""
    old_language = (user.get("language") or "").strip().lower() or None
    old_country = (user.get("country_code") or "").strip().lower() or None

    try:
        update, unset, meta = build_preferences_patch(
            language=language,
            preferred_language=preferred_language,
            country=country,
            country_code=country_code,
            country_provided=country_provided,
        )
    except ValueError as exc:
        code = str(exc)
        if code == "invalid_language":
            raise PreferencesValidationError("Langue invalide") from exc
        raise PreferencesValidationError("Pays invalide") from exc

    if not update and not unset:
        raise PreferencesValidationError("Aucune modification")

    ops: dict[str, Any] = {}
    if update:
        ops["$set"] = update
    if unset:
        ops["$unset"] = {field: "" for field in unset}
    await db.users.update_one({"user_id": user["user_id"]}, ops)

    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0}) or {**user, **update}
    for field in unset:
        fresh.pop(field, None)

    discord_result: dict[str, Any] | None = None
    if sync_discord and (meta.get("language_provided") or meta.get("country_provided")):
        discord_result = await di.sync_discord_language_country_roles(
            db,
            fresh,
            old_language=old_language,
            old_country=old_country,
        )

    return {
        "language": fresh.get("language"),
        "preferredLanguage": fresh.get("language"),
        "country": fresh.get("country_code"),
        "country_code": fresh.get("country_code"),
        "discordSync": discord_result,
        "discordSyncStatus": (discord_result or {}).get("discordSyncStatus"),
    }


class PreferencesValidationError(ValueError):
    pass
