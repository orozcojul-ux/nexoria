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


ROOMS = {
    # ============== CENTER ==============
    "place_centrale": {
        "id": "place_centrale", "group": "center", "icon": "🏰",
        "name": "Place Centrale",
        "description": "Le cœur cosmique de NEXORIA — point de rendez-vous de tous les héros.",
        "tiles_x": 26, "tiles_y": 26,
        "spawn": _center(13, 13),
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
        "portals_to": ["taverne_etoilee", "hall_legendes", "sanctuaire_oracle",
                        "arene", "marche_astral", "sanctuaire_failles"],
        "npcs": [
            {"name": "Crieur du Conseil", "class_id": "explorer", "tx": 8, "ty": 8,
             "line": "Bienvenue, voyageur, dans le cœur de NEXORIA."},
        ],
    },

    # ============== SOCIAL ==============
    "taverne_etoilee": {
        "id": "taverne_etoilee", "group": "social", "icon": "🍺",
        "name": "Taverne Étoilée",
        "description": "Là où les héros se reposent entre deux quêtes.",
        "tiles_x": 22, "tiles_y": 18,
        "spawn": _center(11, 9),
        "theme": "tavern",
        "max_players": 40,
        "palette": {"base": "#3D2817", "edge": "#78350F", "accent": "#EAB308",
                    "particle": "#FCD34D", "ambient": "#1A0F0A"},
        "music": "tavern_warm",
        "landmarks": [
            {"kind": "fireplace", "tx": 11, "ty": 4, "color": "#F97316"},
            {"kind": "bench", "tx": 5, "ty": 9},  {"kind": "bench", "tx": 17, "ty": 9},
            {"kind": "bench", "tx": 5, "ty": 13}, {"kind": "bench", "tx": 17, "ty": 13},
            {"kind": "table", "tx": 8, "ty": 11}, {"kind": "table", "tx": 14, "ty": 11},
            {"kind": "barrel", "tx": 2, "ty": 2}, {"kind": "barrel", "tx": 19, "ty": 2},
            {"kind": "torch", "tx": 4, "ty": 6}, {"kind": "torch", "tx": 18, "ty": 6},
        ],
        "particles": {"kind": "embers", "count": 18, "color": "#F97316"},
        "portals_to": ["place_centrale", "marche_astral", "camp_aventuriers"],
        "npcs": [
            {"name": "Maître Brundir", "class_id": "alchemist", "tx": 11, "ty": 7,
             "line": "Une chope d'Aether pour le voyageur ?"},
            {"name": "Barde Selenya", "class_id": "mage", "tx": 14, "ty": 13,
             "line": "Écoutez la complainte des étoiles..."},
        ],
    },

    "marche_astral": {
        "id": "marche_astral", "group": "social", "icon": "💎",
        "name": "Marché Astral",
        "description": "Commerce entre héros — étals, boutiques, échanges.",
        "tiles_x": 26, "tiles_y": 20,
        "spawn": _center(13, 10),
        "theme": "market",
        "max_players": 60,
        "palette": {"base": "#2D1B47", "edge": "#7C3AED", "accent": "#FCD34D",
                    "particle": "#FFD700", "ambient": "#0F0A1F"},
        "music": "market_bustle",
        "landmarks": [
            {"kind": "stall", "tx": 4, "ty": 5, "color": "#9D4CDD"},
            {"kind": "stall", "tx": 8, "ty": 5, "color": "#00E5FF"},
            {"kind": "stall", "tx": 12, "ty": 5, "color": "#10B981"},
            {"kind": "stall", "tx": 16, "ty": 5, "color": "#EF4444"},
            {"kind": "stall", "tx": 20, "ty": 5, "color": "#FCD34D"},
            {"kind": "stall", "tx": 4, "ty": 15, "color": "#A855F7"},
            {"kind": "stall", "tx": 12, "ty": 15, "color": "#F97316"},
            {"kind": "stall", "tx": 20, "ty": 15, "color": "#06B6D4"},
            {"kind": "crystal", "tx": 13, "ty": 10, "color": "#FFD700"},
            {"kind": "torch", "tx": 2, "ty": 10}, {"kind": "torch", "tx": 23, "ty": 10},
        ],
        "particles": {"kind": "gold_motes", "count": 25, "color": "#FFD700"},
        "portals_to": ["place_centrale", "taverne_etoilee", "atelier_inventeurs"],
        "npcs": [
            {"name": "Marchande Xilia", "class_id": "explorer", "tx": 8, "ty": 7,
             "line": "Reliques rares à prix d'éclat d'Aether !"},
            {"name": "Forgeron Korn", "class_id": "warrior", "tx": 16, "ty": 7,
             "line": "Armes forgées dans les étoiles, héros."},
        ],
    },

    "quartier_guildes": {
        "id": "quartier_guildes", "group": "social", "icon": "🛡",
        "name": "Quartier des Guildes",
        "description": "Bâtiments des guildes — tableaux de recrutement, zone sociale.",
        "tiles_x": 24, "tiles_y": 22,
        "spawn": _center(12, 11),
        "theme": "guilds",
        "max_players": 50,
        "palette": {"base": "#1F1B47", "edge": "#312E81", "accent": "#10B981",
                    "particle": "#34D399", "ambient": "#0A0820"},
        "music": "guild_anthem",
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
        "portals_to": ["place_centrale", "arene", "camp_aventuriers"],
        "npcs": [
            {"name": "Héraut des Guildes", "class_id": "paladin", "tx": 12, "ty": 9,
             "line": "Les guildes accueillent toujours les héros vaillants."},
        ],
    },

    # ============== COMBAT ==============
    "arene": {
        "id": "arene", "group": "combat", "icon": "⚔️",
        "name": "Arène Cosmique",
        "description": "Stade des duels et des événements live.",
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
        "portals_to": ["place_centrale", "quartier_guildes", "vallee_boss"],
        "npcs": [
            {"name": "Annonceur Vex", "class_id": "warrior", "role": "moderator", "tx": 15, "ty": 14,
             "line": "Que les meilleurs s'élèvent !"},
        ],
    },

    "vallee_boss": {
        "id": "vallee_boss", "group": "combat", "icon": "🐉",
        "name": "Vallée des Boss",
        "description": "Zone d'apparition des Boss Mondiaux. Atmosphère menaçante.",
        "tiles_x": 32, "tiles_y": 24,
        "spawn": _center(16, 12),
        "theme": "boss_valley",
        "max_players": 80,
        "palette": {"base": "#2A0A0A", "edge": "#7F1D1D", "accent": "#EF4444",
                    "particle": "#FCA5A5", "ambient": "#0F0303"},
        "music": "boss_drums",
        "landmarks": [
            {"kind": "altar", "tx": 16, "ty": 12, "color": "#EF4444", "scale": 1.8},
            {"kind": "rock", "tx": 5, "ty": 6},  {"kind": "rock", "tx": 27, "ty": 6},
            {"kind": "rock", "tx": 5, "ty": 18}, {"kind": "rock", "tx": 27, "ty": 18},
            {"kind": "bones", "tx": 10, "ty": 16}, {"kind": "bones", "tx": 22, "ty": 8},
            {"kind": "torch", "tx": 12, "ty": 12}, {"kind": "torch", "tx": 20, "ty": 12},
        ],
        "particles": {"kind": "ash", "count": 30, "color": "#7F1D1D"},
        "portals_to": ["arene", "sanctuaire_failles"],
        "npcs": [],
    },

    # ============== KNOWLEDGE ==============
    "hall_legendes": {
        "id": "hall_legendes", "group": "knowledge", "icon": "👑",
        "name": "Hall des Légendes",
        "description": "Statues des héros, portraits, classements gravés.",
        "tiles_x": 24, "tiles_y": 24,
        "spawn": _center(12, 12),
        "theme": "hall",
        "max_players": 50,
        "palette": {"base": "#1F1730", "edge": "#5B21B6", "accent": "#FCD34D",
                    "particle": "#FFD700", "ambient": "#0A0613"},
        "music": "hall_choir",
        "landmarks": [
            {"kind": "statue", "tx": 4, "ty": 4, "color": "#FCD34D"},
            {"kind": "statue", "tx": 12, "ty": 4, "color": "#9D4CDD"},
            {"kind": "statue", "tx": 20, "ty": 4, "color": "#00E5FF"},
            {"kind": "statue", "tx": 4, "ty": 20, "color": "#EF4444"},
            {"kind": "statue", "tx": 12, "ty": 20, "color": "#10B981"},
            {"kind": "statue", "tx": 20, "ty": 20, "color": "#A855F7"},
            {"kind": "throne", "tx": 12, "ty": 12, "color": "#FCD34D"},
            {"kind": "banner", "tx": 7, "ty": 12, "color": "#FCD34D", "label": "TOP 5"},
            {"kind": "banner", "tx": 17, "ty": 12, "color": "#9D4CDD", "label": "ÉLUS"},
        ],
        "particles": {"kind": "gold_motes", "count": 28, "color": "#FFD700"},
        "portals_to": ["place_centrale", "pantheon", "archives"],
        "npcs": [
            {"name": "Gardien des Mémoires", "class_id": "necromancer", "tx": 12, "ty": 10,
             "line": "Que les légendes ne s'éteignent jamais."},
        ],
    },

    "bibliotheque_infinie": {
        "id": "bibliotheque_infinie", "group": "knowledge", "icon": "📚",
        "name": "Bibliothèque Infinie",
        "description": "Lore du monde, livres flottants, archives du Nexus.",
        "tiles_x": 26, "tiles_y": 22,
        "spawn": _center(13, 11),
        "theme": "library",
        "max_players": 35,
        "palette": {"base": "#1A1230", "edge": "#4C1D95", "accent": "#A78BFA",
                    "particle": "#DDD6FE", "ambient": "#0A0820"},
        "music": "library_silence",
        "landmarks": [
            {"kind": "bookshelf", "tx": 3, "ty": 4}, {"kind": "bookshelf", "tx": 3, "ty": 8},
            {"kind": "bookshelf", "tx": 3, "ty": 12}, {"kind": "bookshelf", "tx": 3, "ty": 16},
            {"kind": "bookshelf", "tx": 22, "ty": 4}, {"kind": "bookshelf", "tx": 22, "ty": 8},
            {"kind": "bookshelf", "tx": 22, "ty": 12}, {"kind": "bookshelf", "tx": 22, "ty": 16},
            {"kind": "scroll", "tx": 8, "ty": 6}, {"kind": "scroll", "tx": 17, "ty": 14},
            {"kind": "table", "tx": 13, "ty": 11},
            {"kind": "torch", "tx": 7, "ty": 11}, {"kind": "torch", "tx": 19, "ty": 11},
        ],
        "particles": {"kind": "books", "count": 14, "color": "#A78BFA"},
        "portals_to": ["place_centrale", "archives", "observatoire"],
        "npcs": [
            {"name": "Archiviste Velos", "class_id": "architect", "tx": 13, "ty": 9,
             "line": "Chaque ligne renferme un secret. Lisez avec patience."},
        ],
    },

    "archives": {
        "id": "archives", "group": "knowledge", "icon": "🏛",
        "name": "Archives du Nexus",
        "description": "Historique des événements, chroniques majeures gravées dans la pierre.",
        "tiles_x": 22, "tiles_y": 18,
        "spawn": _center(11, 9),
        "theme": "archives",
        "max_players": 30,
        "palette": {"base": "#171429", "edge": "#312E81", "accent": "#60A5FA",
                    "particle": "#93C5FD", "ambient": "#070514"},
        "music": "archives_drone",
        "landmarks": [
            {"kind": "obelisk", "tx": 5, "ty": 9, "color": "#60A5FA"},
            {"kind": "obelisk", "tx": 11, "ty": 9, "color": "#9D4CDD"},
            {"kind": "obelisk", "tx": 17, "ty": 9, "color": "#FCD34D"},
            {"kind": "scroll", "tx": 8, "ty": 4}, {"kind": "scroll", "tx": 14, "ty": 4},
            {"kind": "scroll", "tx": 8, "ty": 14}, {"kind": "scroll", "tx": 14, "ty": 14},
        ],
        "particles": {"kind": "dust", "count": 18, "color": "#60A5FA"},
        "portals_to": ["bibliotheque_infinie", "hall_legendes"],
        "npcs": [
            {"name": "Scribe Anorial", "class_id": "chronomancer", "tx": 11, "ty": 7,
             "line": "Le temps grave ses cicatrices ici."},
        ],
    },

    # ============== MYSTIC ==============
    "sanctuaire_oracle": {
        "id": "sanctuaire_oracle", "group": "mystic", "icon": "🧙",
        "name": "Sanctuaire de l'Oracle",
        "description": "Temple mystérieux — cristaux flottants, prophéties animées.",
        "tiles_x": 22, "tiles_y": 22,
        "spawn": _center(11, 11),
        "theme": "oracle",
        "max_players": 40,
        "palette": {"base": "#2B0F47", "edge": "#7C3AED", "accent": "#E879F9",
                    "particle": "#F0ABFC", "ambient": "#0A0613"},
        "music": "oracle_whisper",
        "landmarks": [
            {"kind": "crystal", "tx": 11, "ty": 11, "color": "#E879F9", "scale": 2.0},
            {"kind": "crystal", "tx": 5, "ty": 5, "color": "#A855F7", "scale": 1.0},
            {"kind": "crystal", "tx": 17, "ty": 5, "color": "#A855F7", "scale": 1.0},
            {"kind": "crystal", "tx": 5, "ty": 17, "color": "#A855F7", "scale": 1.0},
            {"kind": "crystal", "tx": 17, "ty": 17, "color": "#A855F7", "scale": 1.0},
            {"kind": "altar", "tx": 11, "ty": 16, "color": "#E879F9"},
            {"kind": "torch", "tx": 8, "ty": 11}, {"kind": "torch", "tx": 14, "ty": 11},
        ],
        "particles": {"kind": "runes", "count": 20, "color": "#E879F9"},
        "portals_to": ["place_centrale", "temple_temps", "necropole"],
        "npcs": [
            {"name": "Voile de l'Oracle", "class_id": "mage", "tx": 11, "ty": 14,
             "line": "Pose ta question, héros. Mais sois prêt à la réponse."},
        ],
    },

    "sanctuaire_failles": {
        "id": "sanctuaire_failles", "group": "mystic", "icon": "🌀",
        "name": "Sanctuaire des Failles",
        "description": "Portails dimensionnels — départ des événements spéciaux.",
        "tiles_x": 24, "tiles_y": 24,
        "spawn": _center(12, 12),
        "theme": "rift",
        "max_players": 50,
        "palette": {"base": "#0A0613", "edge": "#7928CA", "accent": "#00E5FF",
                    "particle": "#00E5FF", "ambient": "#000000"},
        "music": "rift_pulse",
        "landmarks": [
            {"kind": "portal", "tx": 6, "ty": 6, "color": "#7928CA", "label": "FAILLE"},
            {"kind": "portal", "tx": 18, "ty": 6, "color": "#00E5FF", "label": "FAILLE"},
            {"kind": "portal", "tx": 6, "ty": 18, "color": "#EF4444", "label": "FAILLE"},
            {"kind": "portal", "tx": 18, "ty": 18, "color": "#FCD34D", "label": "FAILLE"},
            {"kind": "portal", "tx": 12, "ty": 12, "color": "#FFFFFF", "label": "CENTRE"},
            {"kind": "obelisk", "tx": 4, "ty": 12, "color": "#9D4CDD"},
            {"kind": "obelisk", "tx": 20, "ty": 12, "color": "#9D4CDD"},
        ],
        "particles": {"kind": "rift_swirl", "count": 35, "color": "#00E5FF"},
        "portals_to": ["place_centrale", "vallee_boss", "nexus_cosmique",
                        "chambre_reliques"],
        "npcs": [
            {"name": "Veilleur des Failles", "class_id": "chronomancer", "tx": 12, "ty": 10,
             "line": "Les dimensions vacillent ce soir..."},
        ],
    },

    "laboratoire_alchimistes": {
        "id": "laboratoire_alchimistes", "group": "mystic", "icon": "⚗️",
        "name": "Laboratoire des Alchimistes",
        "description": "Potions, chaudrons, vapeurs colorées et effets magiques.",
        "tiles_x": 22, "tiles_y": 20,
        "spawn": _center(11, 10),
        "theme": "alchemy",
        "max_players": 30,
        "palette": {"base": "#0F2A1F", "edge": "#065F46", "accent": "#34D399",
                    "particle": "#10B981", "ambient": "#03100B"},
        "music": "alchemy_bubble",
        "landmarks": [
            {"kind": "cauldron", "tx": 5, "ty": 5, "color": "#10B981"},
            {"kind": "cauldron", "tx": 17, "ty": 5, "color": "#A855F7"},
            {"kind": "cauldron", "tx": 5, "ty": 15, "color": "#F97316"},
            {"kind": "cauldron", "tx": 17, "ty": 15, "color": "#00E5FF"},
            {"kind": "cauldron", "tx": 11, "ty": 10, "color": "#FCD34D", "scale": 1.5},
            {"kind": "table", "tx": 8, "ty": 10}, {"kind": "table", "tx": 14, "ty": 10},
            {"kind": "torch", "tx": 11, "ty": 4}, {"kind": "torch", "tx": 11, "ty": 16},
        ],
        "particles": {"kind": "bubbles", "count": 28, "color": "#10B981"},
        "portals_to": ["place_centrale", "marche_astral", "jardin_songes"],
        "npcs": [
            {"name": "Alchimiste Thalis", "class_id": "alchemist", "tx": 11, "ty": 12,
             "line": "Un éclat d'éther et la matière trembelait."},
        ],
    },

    "atelier_inventeurs": {
        "id": "atelier_inventeurs", "group": "mystic", "icon": "🛠",
        "name": "Atelier des Inventeurs",
        "description": "Machines, engrenages géants, créations rares en action.",
        "tiles_x": 24, "tiles_y": 20,
        "spawn": _center(12, 10),
        "theme": "workshop",
        "max_players": 30,
        "palette": {"base": "#221A0F", "edge": "#92400E", "accent": "#FBBF24",
                    "particle": "#FCD34D", "ambient": "#0F0904"},
        "music": "workshop_steam",
        "landmarks": [
            {"kind": "gear", "tx": 4, "ty": 5, "color": "#FBBF24", "scale": 1.2},
            {"kind": "gear", "tx": 20, "ty": 5, "color": "#9CA3AF", "scale": 0.8},
            {"kind": "gear", "tx": 4, "ty": 15, "color": "#9CA3AF", "scale": 0.8},
            {"kind": "gear", "tx": 20, "ty": 15, "color": "#FBBF24", "scale": 1.2},
            {"kind": "machine", "tx": 12, "ty": 5, "color": "#A1A1AA"},
            {"kind": "machine", "tx": 12, "ty": 15, "color": "#A1A1AA"},
            {"kind": "anvil", "tx": 12, "ty": 10},
            {"kind": "torch", "tx": 7, "ty": 10}, {"kind": "torch", "tx": 17, "ty": 10},
        ],
        "particles": {"kind": "steam", "count": 22, "color": "#9CA3AF"},
        "portals_to": ["place_centrale", "marche_astral"],
        "npcs": [
            {"name": "Maître Cogwell", "class_id": "inventor", "tx": 12, "ty": 8,
             "line": "L'éther et la mécanique : la danse parfaite."},
        ],
    },

    "temple_temps": {
        "id": "temple_temps", "group": "mystic", "icon": "🧿",
        "name": "Temple du Temps",
        "description": "Horloges géantes, effets temporels, échos d'éternité.",
        "tiles_x": 22, "tiles_y": 22,
        "spawn": _center(11, 11),
        "theme": "time_temple",
        "max_players": 35,
        "palette": {"base": "#0A1A2A", "edge": "#0E7490", "accent": "#22D3EE",
                    "particle": "#67E8F9", "ambient": "#020A14"},
        "music": "time_ticking",
        "landmarks": [
            {"kind": "clock", "tx": 11, "ty": 11, "color": "#22D3EE", "scale": 1.8},
            {"kind": "clock", "tx": 5, "ty": 5, "color": "#0E7490"},
            {"kind": "clock", "tx": 17, "ty": 5, "color": "#0E7490"},
            {"kind": "clock", "tx": 5, "ty": 17, "color": "#0E7490"},
            {"kind": "clock", "tx": 17, "ty": 17, "color": "#0E7490"},
            {"kind": "obelisk", "tx": 11, "ty": 6, "color": "#22D3EE"},
            {"kind": "obelisk", "tx": 11, "ty": 16, "color": "#22D3EE"},
        ],
        "particles": {"kind": "time_dust", "count": 24, "color": "#22D3EE"},
        "portals_to": ["sanctuaire_oracle", "observatoire"],
        "npcs": [
            {"name": "Gardien du Temps", "class_id": "chronomancer", "tx": 11, "ty": 9,
             "line": "Hier était demain. Demain était hier."},
        ],
    },

    "necropole": {
        "id": "necropole", "group": "mystic", "icon": "👻",
        "name": "Nécropole Éternelle",
        "description": "Cimetière baigné d'âmes — ambiance Nécromancien.",
        "tiles_x": 24, "tiles_y": 22,
        "spawn": _center(12, 11),
        "theme": "necropolis",
        "max_players": 35,
        "palette": {"base": "#0F0820", "edge": "#312E81", "accent": "#9D4CDD",
                    "particle": "#A78BFA", "ambient": "#040210"},
        "music": "necropolis_choir",
        "landmarks": [
            {"kind": "gravestone", "tx": 4, "ty": 6}, {"kind": "gravestone", "tx": 8, "ty": 6},
            {"kind": "gravestone", "tx": 16, "ty": 6}, {"kind": "gravestone", "tx": 20, "ty": 6},
            {"kind": "gravestone", "tx": 4, "ty": 16}, {"kind": "gravestone", "tx": 8, "ty": 16},
            {"kind": "gravestone", "tx": 16, "ty": 16}, {"kind": "gravestone", "tx": 20, "ty": 16},
            {"kind": "crypt", "tx": 12, "ty": 11, "color": "#9D4CDD"},
            {"kind": "bones", "tx": 12, "ty": 5}, {"kind": "bones", "tx": 12, "ty": 17},
            {"kind": "torch", "tx": 6, "ty": 11}, {"kind": "torch", "tx": 18, "ty": 11},
        ],
        "particles": {"kind": "souls", "count": 22, "color": "#A78BFA"},
        "portals_to": ["sanctuaire_oracle", "vallee_boss"],
        "npcs": [
            {"name": "Nécromant Vorel", "class_id": "necromancer", "tx": 12, "ty": 9,
             "line": "Les âmes attendent toujours quelqu'un..."},
        ],
    },

    "jardin_songes": {
        "id": "jardin_songes", "group": "mystic", "icon": "🌙",
        "name": "Jardin des Songes",
        "description": "Zone calme — fleurs lumineuses, ambiance reposante.",
        "tiles_x": 22, "tiles_y": 18,
        "spawn": _center(11, 9),
        "theme": "dream_garden",
        "max_players": 25,
        "palette": {"base": "#0A1F1F", "edge": "#0F766E", "accent": "#5EEAD4",
                    "particle": "#A7F3D0", "ambient": "#020A0A"},
        "music": "garden_calm",
        "landmarks": [
            {"kind": "flower", "tx": 4, "ty": 4, "color": "#A7F3D0"},
            {"kind": "flower", "tx": 8, "ty": 4, "color": "#F0ABFC"},
            {"kind": "flower", "tx": 14, "ty": 4, "color": "#FCD34D"},
            {"kind": "flower", "tx": 18, "ty": 4, "color": "#67E8F9"},
            {"kind": "flower", "tx": 4, "ty": 14, "color": "#FCA5A5"},
            {"kind": "flower", "tx": 18, "ty": 14, "color": "#A78BFA"},
            {"kind": "tree", "tx": 11, "ty": 6, "color": "#10B981"},
            {"kind": "tree", "tx": 5, "ty": 11, "color": "#10B981"},
            {"kind": "tree", "tx": 17, "ty": 11, "color": "#10B981"},
            {"kind": "fountain", "tx": 11, "ty": 11, "color": "#5EEAD4"},
        ],
        "particles": {"kind": "fireflies", "count": 30, "color": "#A7F3D0"},
        "portals_to": ["place_centrale", "laboratoire_alchimistes", "observatoire"],
        "npcs": [
            {"name": "Onirium", "class_id": "alchemist", "tx": 11, "ty": 13,
             "line": "Ferme les yeux. Écoute le jardin respirer."},
        ],
    },

    "observatoire": {
        "id": "observatoire", "group": "mystic", "icon": "☄️",
        "name": "Observatoire Stellaire",
        "description": "Coupole ouverte sur le cosmos — étoiles, constellations animées.",
        "tiles_x": 20, "tiles_y": 20,
        "spawn": _center(10, 10),
        "theme": "observatory",
        "max_players": 30,
        "palette": {"base": "#020617", "edge": "#1E3A8A", "accent": "#60A5FA",
                    "particle": "#FFFFFF", "ambient": "#000000"},
        "music": "stars_drone",
        "landmarks": [
            {"kind": "telescope", "tx": 10, "ty": 10, "color": "#60A5FA", "scale": 1.6},
            {"kind": "obelisk", "tx": 4, "ty": 4, "color": "#60A5FA"},
            {"kind": "obelisk", "tx": 16, "ty": 4, "color": "#60A5FA"},
            {"kind": "obelisk", "tx": 4, "ty": 16, "color": "#60A5FA"},
            {"kind": "obelisk", "tx": 16, "ty": 16, "color": "#60A5FA"},
            {"kind": "crystal", "tx": 10, "ty": 5, "color": "#FFFFFF"},
            {"kind": "crystal", "tx": 10, "ty": 15, "color": "#FFFFFF"},
        ],
        "particles": {"kind": "shooting_stars", "count": 24, "color": "#FFFFFF"},
        "portals_to": ["bibliotheque_infinie", "temple_temps", "jardin_songes",
                        "chambre_reliques"],
        "npcs": [
            {"name": "Astronomine Lyrith", "class_id": "mage", "tx": 10, "ty": 8,
             "line": "Une étoile vient de s'éteindre... ou de naître ?"},
        ],
    },

    # ============== ADVENTURE ==============
    "camp_aventuriers": {
        "id": "camp_aventuriers", "group": "adventure", "icon": "🏹",
        "name": "Camp des Aventuriers",
        "description": "Préparation aux quêtes — tentes, feux de camp, tableaux de missions.",
        "tiles_x": 24, "tiles_y": 20,
        "spawn": _center(12, 10),
        "theme": "camp",
        "max_players": 40,
        "palette": {"base": "#1F1810", "edge": "#78350F", "accent": "#FB923C",
                    "particle": "#FDBA74", "ambient": "#0A0703"},
        "music": "camp_drums",
        "landmarks": [
            {"kind": "fireplace", "tx": 12, "ty": 10, "color": "#FB923C"},
            {"kind": "tent", "tx": 5, "ty": 5, "color": "#10B981"},
            {"kind": "tent", "tx": 19, "ty": 5, "color": "#9D4CDD"},
            {"kind": "tent", "tx": 5, "ty": 15, "color": "#00E5FF"},
            {"kind": "tent", "tx": 19, "ty": 15, "color": "#FCD34D"},
            {"kind": "noticeboard", "tx": 8, "ty": 10, "color": "#FB923C"},
            {"kind": "barrel", "tx": 16, "ty": 10},
            {"kind": "torch", "tx": 12, "ty": 4}, {"kind": "torch", "tx": 12, "ty": 16},
        ],
        "particles": {"kind": "embers", "count": 25, "color": "#FB923C"},
        "portals_to": ["place_centrale", "taverne_etoilee", "quartier_guildes"],
        "npcs": [
            {"name": "Guide Maelis", "class_id": "explorer", "tx": 8, "ty": 8,
             "line": "Une nouvelle aventure attend. Voici les missions du jour."},
            {"name": "Capitaine Roen", "class_id": "warrior", "tx": 16, "ty": 12,
             "line": "Préparez vos armes, héros. Le danger nous appelle."},
        ],
    },

    "chambre_reliques": {
        "id": "chambre_reliques", "group": "mystic", "icon": "🌠",
        "name": "Chambre des Reliques",
        "description": "Présentation des objets légendaires — vitrines de cristal.",
        "tiles_x": 22, "tiles_y": 18,
        "spawn": _center(11, 9),
        "theme": "relics",
        "max_players": 30,
        "palette": {"base": "#1F1730", "edge": "#7C3AED", "accent": "#FCD34D",
                    "particle": "#FFD700", "ambient": "#0A0613"},
        "music": "relic_hum",
        "landmarks": [
            {"kind": "pedestal", "tx": 4, "ty": 5, "color": "#FCD34D"},
            {"kind": "pedestal", "tx": 8, "ty": 5, "color": "#9D4CDD"},
            {"kind": "pedestal", "tx": 14, "ty": 5, "color": "#00E5FF"},
            {"kind": "pedestal", "tx": 18, "ty": 5, "color": "#EF4444"},
            {"kind": "pedestal", "tx": 4, "ty": 13, "color": "#10B981"},
            {"kind": "pedestal", "tx": 8, "ty": 13, "color": "#A855F7"},
            {"kind": "pedestal", "tx": 14, "ty": 13, "color": "#F97316"},
            {"kind": "pedestal", "tx": 18, "ty": 13, "color": "#FFFFFF"},
            {"kind": "crystal", "tx": 11, "ty": 9, "color": "#FFD700", "scale": 1.6},
        ],
        "particles": {"kind": "gold_motes", "count": 30, "color": "#FFD700"},
        "portals_to": ["observatoire", "sanctuaire_failles", "hall_legendes"],
        "npcs": [
            {"name": "Conservateur Ezran", "class_id": "architect", "tx": 11, "ty": 7,
             "line": "Chaque relique a vu mille destins."},
        ],
    },

    "pantheon": {
        "id": "pantheon", "group": "knowledge", "icon": "🏛",
        "name": "Panthéon des Anciens",
        "description": "Statues des héros disparus — mémoire éternelle.",
        "tiles_x": 22, "tiles_y": 22,
        "spawn": _center(11, 11),
        "theme": "pantheon",
        "max_players": 25,
        "palette": {"base": "#161429", "edge": "#4338CA", "accent": "#FCD34D",
                    "particle": "#FFD700", "ambient": "#070514"},
        "music": "pantheon_choir",
        "landmarks": [
            {"kind": "statue", "tx": 5, "ty": 5, "color": "#FCD34D", "scale": 1.4},
            {"kind": "statue", "tx": 11, "ty": 4, "color": "#9D4CDD", "scale": 1.6},
            {"kind": "statue", "tx": 17, "ty": 5, "color": "#00E5FF", "scale": 1.4},
            {"kind": "statue", "tx": 5, "ty": 17, "color": "#EF4444", "scale": 1.4},
            {"kind": "statue", "tx": 11, "ty": 18, "color": "#10B981", "scale": 1.6},
            {"kind": "statue", "tx": 17, "ty": 17, "color": "#A855F7", "scale": 1.4},
            {"kind": "altar", "tx": 11, "ty": 11, "color": "#FCD34D"},
        ],
        "particles": {"kind": "gold_motes", "count": 22, "color": "#FFD700"},
        "portals_to": ["hall_legendes", "archives"],
        "npcs": [],
    },

    # ============== RESTRICTED ==============
    "nexus_cosmique": {
        "id": "nexus_cosmique", "group": "restricted", "icon": "🌌",
        "name": "Nexus Cosmique",
        "description": "Zone réservée aux hauts rangs — Élus Cosmiques uniquement.",
        "tiles_x": 26, "tiles_y": 26,
        "spawn": _center(13, 13),
        "theme": "cosmic_elite",
        "max_players": 30,
        "palette": {"base": "#000000", "edge": "#7928CA", "accent": "#FFFFFF",
                    "particle": "#FFFFFF", "ambient": "#000000"},
        "music": "cosmic_elite",
        "access": {"min_rank_titles": ["elu_cosmique", "legende_vivante",
                                        "maitre_des_ombres", "roi_des_createurs",
                                        "seigneur_du_temps"],
                   "staff_bypass": True},
        "landmarks": [
            {"kind": "throne", "tx": 13, "ty": 13, "color": "#FFD700", "scale": 1.8},
            {"kind": "crystal", "tx": 13, "ty": 8, "color": "#FFFFFF", "scale": 1.6},
            {"kind": "crystal", "tx": 8, "ty": 13, "color": "#FFFFFF", "scale": 1.6},
            {"kind": "crystal", "tx": 18, "ty": 13, "color": "#FFFFFF", "scale": 1.6},
            {"kind": "crystal", "tx": 13, "ty": 18, "color": "#FFFFFF", "scale": 1.6},
            {"kind": "portal", "tx": 4, "ty": 4, "color": "#FFFFFF"},
            {"kind": "portal", "tx": 22, "ty": 22, "color": "#FFFFFF"},
        ],
        "particles": {"kind": "cosmic_swirl", "count": 50, "color": "#FFFFFF"},
        "portals_to": ["sanctuaire_failles", "salle_conseil"],
        "npcs": [],
    },

    "salle_conseil": {
        "id": "salle_conseil", "group": "restricted", "icon": "👑",
        "name": "Salle du Conseil",
        "description": "Réservée au Gardien Suprême, aux Sages et Sentinelles.",
        "tiles_x": 18, "tiles_y": 14,
        "spawn": _center(9, 7),
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
        "portals_to": ["nexus_cosmique", "place_centrale"],
        "npcs": [],
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
    title = user.get("active_title")
    required_roles = access.get("required_roles")
    if required_roles and role in required_roles:
        return True, ""
    if access.get("staff_bypass") and role in ("admin", "moderator"):
        return True, ""
    if required_roles:
        return False, "Cette salle est réservée au Conseil."
    titles = access.get("min_rank_titles")
    if titles and title in titles:
        return True, ""
    if titles:
        return False, "Cette salle est réservée aux Élus Cosmiques."
    return True, ""
