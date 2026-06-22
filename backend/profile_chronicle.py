"""Human-readable chronicle lines for profile edits (staff / admin)."""

from __future__ import annotations

from game_data import CLASSES, TITLES

ROLE_LABELS = {
    "user": "Héros",
    "admin": "Sage",
    "moderator": "Sentinelle",
}

FIELD_LABELS = {
    "username": "Pseudo",
    "email": "Email",
    "display_name": "Nom affiché",
    "role": "Rôle",
    "class_id": "Classe",
    "class_name": "Classe",
    "secondary_class_id": "Classe secondaire",
    "level": "Niveau",
    "xp": "XP",
    "skill_points": "Points de compétence",
    "aether": "Écus",
    "reputation": "Réputation",
    "active_title": "Titre",
    "bio": "Biographie",
    "avatar_url": "Avatar",
    "banner_url": "Bannière",
    "profile_accent": "Couleur d'accent",
    "active_frame": "Cadre",
    "active_banner": "Bannière active",
    "active_aura_sku": "Aura",
    "active_mount": "Monture",
    "story": "Histoire",
    "status_message": "Statut",
    "profile_visibility": "Visibilité du profil",
    "nexus_chat_color": "Couleur de tchat",
    "theme": "Thème",
    "language": "Langue",
    "featured_badge_id": "Badge mis en avant",
}


def _title_name(title_id: str | None) -> str:
    if not title_id:
        return "—"
    doc = next((t for t in TITLES if t["id"] == title_id), None)
    return doc["name"] if doc else str(title_id).replace("_", " ").title()


def _class_name(class_id: str | None) -> str:
    if not class_id:
        return "—"
    return CLASSES.get(class_id, {}).get("name", str(class_id))


def _format_value(field: str, value) -> str:
    if value is None or value == "":
        return "—"
    if field == "role":
        return ROLE_LABELS.get(str(value), str(value))
    if field == "active_title":
        return _title_name(str(value))
    if field in ("class_id", "secondary_class_id"):
        return _class_name(str(value))
    if field in ("avatar_url", "banner_url"):
        return "nouvelle image"
    if field == "profile_visibility":
        vis = {"public": "Public", "friends": "Amis uniquement", "private": "Privé"}
        return vis.get(str(value), str(value))
    if field == "bio":
        text = str(value).strip()
        if not text:
            return "—"
        preview = text[:48] + ("…" if len(text) > 48 else "")
        return f"« {preview} »"
    if field in ("level", "xp", "skill_points", "aether", "reputation"):
        return f"{int(value):,}".replace(",", " ")
    return str(value)


def describe_field_change(field: str, old_value, new_value) -> str | None:
    if field == "class_name":
        return None
    label = FIELD_LABELS.get(field, field.replace("_", " ").title())
    old_s = _format_value(field, old_value)
    new_s = _format_value(field, new_value)
    if old_s == new_s:
        return None
    if field in ("avatar_url", "banner_url"):
        return f"{label} mis à jour"
    if field == "active_frame" and new_value in (None, ""):
        return f"{label} retiré"
    if field == "active_frame" and old_value in (None, "", "—"):
        return f"{label} équipé ({new_s})"
    return f"{label} : {old_s} → {new_s}"


def build_staff_edit_chronicle(
    target: dict,
    update: dict,
    *,
    staff_username: str | None = None,
    clear_ban: bool = False,
    unset_fields: list[str] | None = None,
) -> str | None:
    """Build a detailed French chronicle line for staff-driven profile changes."""
    lines: list[str] = []
    unset_fields = unset_fields or []

    for field, new_value in update.items():
        line = describe_field_change(field, target.get(field), new_value)
        if line:
            lines.append(line)

    for field in unset_fields:
        label = FIELD_LABELS.get(field, field.replace("_", " ").title())
        if target.get(field) not in (None, "", "—"):
            lines.append(f"{label} retiré")

    if clear_ban:
        lines.append("Bannissement levé")

    if not lines:
        return None

    actor = f"Le Conseil ({staff_username})" if staff_username else "Le Conseil"
    detail = " · ".join(lines)
    return f"{actor} a modifié le profil — {detail}"
