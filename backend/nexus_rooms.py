"""NEXORIA — Nexus Online ROOMS DATA

Each room has a rich "decor manifest" rendered procedurally on the frontend:
- palette       : floor base / edge / accent colors
- particles     : kind/count/color/speed
- landmarks     : list of objects (fountain, statue, portal, crystal, altar,
                  cauldron, clock, gravestone, machine, bookshelf, bench,
                  banner, throne) with grid coordinates
- npcs          : decorative NPCs (name, class_id, role optional, tx, ty, line)
- portals_to    : list of room_id reachable from this room (interactive portals)
- music         : track key (frontend may swap ambient track)
- access        : optional role/rank restriction
- group         : nexus zone grouping (center/social/combat/knowledge/mystic/restricted)
"""

# --- Helpers ---
def _center(x, y): return {"tx": x, "ty": y}


def _vip_active(user: dict) -> bool:
    """VIP from vip_until (same rule as nexus_world — never is_vip alone)."""
    if not user:
        return False
    vu = user.get("vip_until")
    if not vu:
        return False
    try:
        from datetime import datetime, timezone
        dt = datetime.fromisoformat(vu) if isinstance(vu, str) else vu
    except (ValueError, TypeError):
        return False
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    from datetime import datetime, timezone
    return dt > datetime.now(timezone.utc)


ROOMS = {
    # ============== CENTER ==============
    "place_centrale": {
        "id": "place_centrale", "group": "center", "icon": "🏰",
        "name": "Place Centrale",
        "description": "Le cœur cosmique de NEXORIA — point de rendez-vous de tous les héros.",
        "tiles_x": 26, "tiles_y": 26,
        "spawn": _center(13, 10),
        "theme": "cosmic",
        "max_players": 80,
        "palette": {"base": "#1A0F2E", "edge": "#4C1D95", "accent": "#9D4CDD",
                    "particle": "#CFA8FF", "ambient": "#0A0613"},
        "music": "cosmic_majestic",
        "landmarks": [
            {"kind": "fountain", "tx": 13, "ty": 13, "scale": 1.6, "color": "#9D4CDD"},
            {"kind": "crystal", "tx": 13, "ty": 13, "color": "#CFA8FF", "scale": 1.4},
            {"kind": "banner", "tx": 4, "ty": 4, "color": "#9D4CDD", "label": "NEXORIA"},
            {"kind": "banner", "tx": 22, "ty": 22, "color": "#00E5FF", "label": "NEXORIA"},
            {"kind": "torch", "tx": 6, "ty": 13}, {"kind": "torch", "tx": 20, "ty": 13},
        ],
        "particles": {"kind": "stars", "count": 30, "color": "#FFFFFF"},
        "portals_to": ["arene", "quartier_guildes", "salon_vip"],
        "npcs": [
            {"name": "Crieur du Conseil", "class_id": "explorer", "tx": 8, "ty": 8,
             "line": "Bienvenue, voyageur, dans le cœur de NEXORIA."},
        ],
    },

    "quartier_guildes": {
        "id": "quartier_guildes", "group": "social", "icon": "🛡",
        "name": "Quartier des Guildes",
        "description": "Bâtiments des guildes — tableaux de recrutement, zone sociale.",
        "tiles_x": 24, "tiles_y": 22,
        "spawn": _center(12, 8),
        "theme": "guilds",
        "max_players": 50,
        "palette": {"base": "#1F1B47", "edge": "#312E81", "accent": "#10B981",
                    "particle": "#34D399", "ambient": "#0A0820"},
        "music": "guild_anthem",
        "access": {"requires_guild": True},
        "landmarks": [
            {"kind": "building", "tx": 4, "ty": 5, "color": "#10B981", "label": "Aurea"},
            {"kind": "building", "tx": 12, "ty": 5, "color": "#9D4CDD", "label": "Ordre"},
            {"kind": "building", "tx": 20, "ty": 5, "color": "#EF4444", "label": "Flamme"},
            {"kind": "building", "tx": 4, "ty": 17, "color": "#00E5FF", "label": "Glace"},
            {"kind": "building", "tx": 12, "ty": 17, "color": "#FCD34D", "label": "Couronne"},
            {"kind": "building", "tx": 20, "ty": 17, "color": "#7928CA", "label": "Voile"},
            {"kind": "noticeboard", "tx": 12, "ty": 11, "color": "#10B981"},
        ],
        "particles": {"kind": "leaves", "count": 15, "color": "#34D399"},
        "portals_to": ["place_centrale", "arene"],
        "npcs": [
            {"name": "Héraut des Guildes", "class_id": "paladin", "tx": 12, "ty": 9,
             "line": "Les guildes accueillent toujours les héros vaillants."},
        ],
    },

    # ============== COMBAT ==============
    "arene": {
        "id": "arene", "group": "combat", "icon": "⚔️",
        "name": "Arène du Nexus",
        "description": "Zone d'entraînement au combat — affrontez les créatures du Nexus.",
        "tiles_x": 30, "tiles_y": 30,
        "spawn": _center(15, 15),
        "theme": "arena",
        "max_players": 120,
        "palette": {"base": "#0F172A", "edge": "#1E3A8A", "accent": "#00E5FF",
                    "particle": "#7DD3FC", "ambient": "#020617"},
        "music": "arena_epic",
        "landmarks": [
            {"kind": "portal", "tx": 15, "ty": 5, "color": "#EF4444", "label": "Duel"},
            {"kind": "portal", "tx": 15, "ty": 25, "color": "#00E5FF", "label": "Tournoi"},
            {"kind": "banner", "tx": 5, "ty": 5, "color": "#EF4444"},
            {"kind": "banner", "tx": 25, "ty": 5, "color": "#00E5FF"},
            {"kind": "banner", "tx": 5, "ty": 25, "color": "#FCD34D"},
            {"kind": "banner", "tx": 25, "ty": 25, "color": "#9D4CDD"},
            {"kind": "stands", "tx": 5, "ty": 15}, {"kind": "stands", "tx": 25, "ty": 15},
            {"kind": "torch", "tx": 8, "ty": 15}, {"kind": "torch", "tx": 22, "ty": 15},
        ],
        "particles": {"kind": "sparks", "count": 22, "color": "#00E5FF"},
        "portals_to": ["place_centrale", "quartier_guildes"],
        "npcs": [
            {"name": "Annonceur Vex", "class_id": "warrior", "role": "moderator", "tx": 15, "ty": 14,
             "line": "Que les meilleurs s'élèvent !"},
        ],
    },

    # ============== RESTRICTED ==============
    "salle_conseil": {
        "id": "salle_conseil", "group": "restricted", "icon": "👑",
        "name": "Salle du Conseil",
        "description": "Réservée au Gardien Suprême, aux Sages et Sentinelles.",
        "tiles_x": 18, "tiles_y": 14,
        "spawn": _center(9, 10),
        "theme": "council",
        "max_players": 12,
        "palette": {"base": "#0F0A1F", "edge": "#B45309", "accent": "#FCD34D",
                    "particle": "#FFD700", "ambient": "#020108"},
        "music": "council_solemn",
        "access": {"required_roles": ["admin", "moderator"]},
        "landmarks": [
            {"kind": "throne", "tx": 9, "ty": 3, "color": "#FCD34D", "scale": 1.6},
            {"kind": "table", "tx": 9, "ty": 7, "color": "#B45309"},
            {"kind": "banner", "tx": 4, "ty": 7, "color": "#FCD34D", "label": "CONSEIL"},
            {"kind": "banner", "tx": 14, "ty": 7, "color": "#FCD34D", "label": "CONSEIL"},
            {"kind": "torch", "tx": 4, "ty": 3}, {"kind": "torch", "tx": 14, "ty": 3},
            {"kind": "torch", "tx": 4, "ty": 11}, {"kind": "torch", "tx": 14, "ty": 11},
        ],
        "particles": {"kind": "gold_motes", "count": 18, "color": "#FFD700"},
        "portals_to": ["place_centrale"],
        "npcs": [],
    },

    "salon_vip": {
        "id": "salon_vip", "group": "restricted", "icon": "💎",
        "name": "Salon des Ascendants",
        "description": "Sanctuaire exclusif — réservé aux détenteurs du Pass Ascendant.",
        "tiles_x": 20, "tiles_y": 16,
        "spawn": _center(10, 12),
        "theme": "vip",
        "max_players": 30,
        "palette": {"base": "#1A1028", "edge": "#B45309", "accent": "#FBBF24",
                    "particle": "#FFD700", "ambient": "#0A0610"},
        "music": "vip_lounge",
        "access": {"requires_vip": True, "staff_bypass": True},
        "landmarks": [
            {"kind": "throne", "tx": 10, "ty": 4, "color": "#FBBF24", "scale": 1.3},
            {"kind": "fountain", "tx": 10, "ty": 10, "color": "#FCD34D", "scale": 1.2},
            {"kind": "crystal", "tx": 5, "ty": 8, "color": "#FFD700"},
            {"kind": "crystal", "tx": 15, "ty": 8, "color": "#FFD700"},
            {"kind": "banner", "tx": 4, "ty": 4, "color": "#FBBF24", "label": "VIP"},
            {"kind": "banner", "tx": 16, "ty": 4, "color": "#FBBF24", "label": "VIP"},
            {"kind": "torch", "tx": 4, "ty": 12}, {"kind": "torch", "tx": 16, "ty": 12},
        ],
        "particles": {"kind": "gold_motes", "count": 24, "color": "#FFD700"},
        "portals_to": ["place_centrale"],
        "npcs": [
            {"name": "Hôte d'Or", "class_id": "chronomancer", "tx": 10, "ty": 6,
             "line": "Bienvenue, Ascendant — ce sanctuaire est le vôtre."},
        ],
    },
}


def get_room_ids():
    return list(ROOMS.keys())


def get_room_scene(room_id: str) -> dict:
    """Return the static art scene + thumbnail URL for a room.

    Each room has a pre-composed 1280x720 scene built from the Fantasy House
    asset pack (see /app/backend/scripts/compose_world_scenes.py).
    """
    return {
        "scene_url": f"/world/rooms/{room_id}.png",
        "thumb_url": f"/world/thumbs/{room_id}.jpg",
    }


def get_portal_links(room_id: str) -> list:
    """Resolved portal targets with display metadata for the isometric client."""
    room = ROOMS.get(room_id)
    if not room:
        return []
    links = []
    for tid in room.get("portals_to", []):
        target = ROOMS.get(tid)
        if not target:
            continue
        links.append({
            "target": tid,
            "name": target.get("name", tid),
            "icon": target.get("icon", "🌀"),
        })
    return links


def get_room_public(room_id: str) -> dict:
    """Return a lightweight public-safe room descriptor (with art URLs)."""
    r = ROOMS.get(room_id)
    if not r:
        return {}
    return {
        "id": room_id,
        "name": r.get("name"),
        "icon": r.get("icon"),
        "group": r.get("group"),
        "description": r.get("description"),
        "theme": r.get("theme"),
        "max_players": r.get("max_players"),
        "portals_to": r.get("portals_to", []),
        **get_room_scene(room_id),
    }


def can_access(user: dict, room_id: str) -> tuple[bool, str]:
    """Returns (allowed, reason). Staff bypass when staff_bypass=True."""
    room = ROOMS.get(room_id)
    if not room:
        return False, "Salle inconnue"
    access = room.get("access")
    if not access:
        return True, ""
    role = user.get("role", "user")
    if access.get("staff_bypass") and role in ("admin", "moderator"):
        return True, ""
    if access.get("requires_guild") and not user.get("guild_id"):
        return False, "Cette salle est réservée aux membres d'un Ordre."
    if access.get("requires_vip") and not _vip_active(user):
        return False, "Cette salle est réservée aux détenteurs du Pass Ascendant."
    required_roles = access.get("required_roles")
    if required_roles:
        if role in required_roles:
            return True, ""
        return False, "Cette salle est réservée au Conseil."
    titles = access.get("min_rank_titles")
    if titles:
        if user.get("active_title") in titles:
            return True, ""
        return False, "Cette salle est réservée aux Élus Cosmiques."
    return True, ""
