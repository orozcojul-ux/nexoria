"""Shop catalog and boost definitions.

Each item may declare `unlock_level` — the minimum hero level required to PURCHASE it.
Defaults to 1 when omitted.
"""

SHOP_ITEMS = [
    # ---------- Cosmetics ----------
    {"sku": "frame_runic", "name": "Cadre Runique", "category": "cosmetic", "price": 500, "icon": "Frame", "rarity": "rare", "description": "Bordure runique animée pour votre avatar", "unlock_level": 5},
    {"sku": "frame_celestial", "name": "Cadre Céleste", "category": "cosmetic", "price": 1500, "icon": "Frame", "rarity": "epic", "description": "Aura céleste autour de votre carte de héros", "unlock_level": 20},
    {"sku": "frame_cosmic", "name": "Cadre Cosmique", "category": "cosmetic", "price": 5000, "icon": "Frame", "rarity": "cosmic", "description": "Bordure cosmique pulsante — exclusivité ultime", "unlock_level": 50},
    {"sku": "banner_dragon", "name": "Bannière du Dragon", "category": "cosmetic", "price": 800, "icon": "Flag", "rarity": "epic", "description": "Étendard ancestral du dragon", "unlock_level": 10},
    {"sku": "banner_phoenix", "name": "Bannière du Phénix", "category": "cosmetic", "price": 1200, "icon": "Flame", "rarity": "epic", "description": "Étendard renaissant du phénix", "unlock_level": 15},

    # ---------- Boosts (time-limited) ----------
    {"sku": "boost_xp_2x_1h", "name": "Élixir d'XP — 1h", "category": "boost", "price": 200, "icon": "Zap", "rarity": "rare", "description": "Double XP pendant 1 heure", "boost_type": "xp_multiplier", "boost_value": 2, "duration_minutes": 60, "unlock_level": 1},
    {"sku": "boost_xp_2x_24h", "name": "Élixir d'XP — 24h", "category": "boost", "price": 1500, "icon": "Zap", "rarity": "epic", "description": "Double XP pendant 24 heures", "boost_type": "xp_multiplier", "boost_value": 2, "duration_minutes": 1440, "unlock_level": 15},
    {"sku": "boost_aether_2x_1h", "name": "Élixir d'Aether — 1h", "category": "boost", "price": 300, "icon": "Coins", "rarity": "rare", "description": "Double Aether gagné pendant 1 heure", "boost_type": "aether_multiplier", "boost_value": 2, "duration_minutes": 60, "unlock_level": 5},
    {"sku": "boost_luck_1h", "name": "Œil de Fortune — 1h", "category": "boost", "price": 400, "icon": "Eye", "rarity": "epic", "description": "Augmente les chances de raretés élevées en coffre", "boost_type": "luck", "boost_value": 1.5, "duration_minutes": 60, "unlock_level": 10},

    # ---------- Consumables ----------
    {"sku": "scroll_rename", "name": "Parchemin de Renommée", "category": "consumable", "price": 1000, "icon": "Scroll", "rarity": "rare", "description": "Permet de changer votre pseudo une fois", "unlock_level": 1},
    {"sku": "key_chest_cosmic", "name": "Clé Cosmique", "category": "consumable", "price": 800, "icon": "Key", "rarity": "epic", "description": "Coffre garantissant un objet Épique ou supérieur", "unlock_level": 12},
    {"sku": "summon_rift", "name": "Catalyseur de Faille", "category": "consumable", "price": 600, "icon": "Sparkles", "rarity": "rare", "description": "Force l'apparition d'une faille dimensionnelle", "unlock_level": 8},

    # ---------- Kingdom (permanent perks) ----------
    {"sku": "kingdom_inventory_slot", "name": "Coffre Étendu", "category": "kingdom", "price": 1000, "icon": "Package", "rarity": "rare", "description": "+10 slots d'inventaire permanents", "unlock_level": 5},
    {"sku": "kingdom_aether_mine", "name": "Mine d'Aether", "category": "kingdom", "price": 3000, "icon": "Pickaxe", "rarity": "legendary", "description": "Génère 50 Aether par jour passivement", "unlock_level": 20},
    {"sku": "kingdom_ban_archive", "name": "Archives du Conseil", "category": "kingdom", "price": 4000, "icon": "ScrollText", "rarity": "epic", "description": "Accès permanent aux Archives de Bannissements du royaume", "unlock_level": 25, "perk": "ban_history"},
    {"sku": "kingdom_oracle_link", "name": "Lien à l'Oracle", "category": "kingdom", "price": 5000, "icon": "Eye", "rarity": "legendary", "description": "Consultation illimitée du Sanctuaire — accès au Présage quotidien", "unlock_level": 30, "perk": "oracle_unlimited"},
    {"sku": "kingdom_chronicle_vault", "name": "Voûte des Chroniques", "category": "kingdom", "price": 6000, "icon": "BookOpen", "rarity": "legendary", "description": "Accès aux Chroniques complètes du royaume (toutes époques)", "unlock_level": 35, "perk": "chronicle_full"},
    {"sku": "kingdom_throne_room", "name": "Salle du Trône", "category": "kingdom", "price": 12000, "icon": "Crown", "rarity": "mythic", "description": "Trône personnel affiché sur votre profil, badge royal exclusif", "unlock_level": 50, "perk": "throne"},
    {"sku": "kingdom_treasury", "name": "Trésorerie Royale", "category": "kingdom", "price": 18000, "icon": "Coins", "rarity": "mythic", "description": "Génère 200 Aether par jour passivement (cumulable avec Mine)", "unlock_level": 60, "perk": "treasury"},
    {"sku": "kingdom_constellation", "name": "Constellation Personnelle", "category": "kingdom", "price": 25000, "icon": "Sparkles", "rarity": "divine", "description": "Constellation unique tracée dans le ciel de NEXORIA portant votre nom", "unlock_level": 80, "perk": "constellation"},
]


def get_shop_item(sku: str):
    return next((i for i in SHOP_ITEMS if i["sku"] == sku), None)
