"""Shop catalog and boost definitions."""

SHOP_ITEMS = [
    # Cosmetics
    {"sku": "frame_runic", "name": "Cadre Runique", "category": "cosmetic", "price": 500, "icon": "Frame", "rarity": "rare", "description": "Bordure runique animée pour votre avatar"},
    {"sku": "frame_celestial", "name": "Cadre Céleste", "category": "cosmetic", "price": 1500, "icon": "Frame", "rarity": "epic", "description": "Aura céleste autour de votre carte de héros"},
    {"sku": "frame_cosmic", "name": "Cadre Cosmique", "category": "cosmetic", "price": 5000, "icon": "Frame", "rarity": "cosmic", "description": "Bordure cosmique pulsante — exclusivité ultime"},
    {"sku": "banner_dragon", "name": "Bannière du Dragon", "category": "cosmetic", "price": 800, "icon": "Flag", "rarity": "epic", "description": "Étendard ancestral du dragon"},
    {"sku": "banner_phoenix", "name": "Bannière du Phénix", "category": "cosmetic", "price": 1200, "icon": "Flame", "rarity": "epic", "description": "Étendard renaissant du phénix"},

    # Boosts (consumable, time-limited)
    {"sku": "boost_xp_2x_1h", "name": "Élixir d'XP — 1h", "category": "boost", "price": 200, "icon": "Zap", "rarity": "rare", "description": "Double XP pendant 1 heure", "boost_type": "xp_multiplier", "boost_value": 2, "duration_minutes": 60},
    {"sku": "boost_xp_2x_24h", "name": "Élixir d'XP — 24h", "category": "boost", "price": 1500, "icon": "Zap", "rarity": "epic", "description": "Double XP pendant 24 heures", "boost_type": "xp_multiplier", "boost_value": 2, "duration_minutes": 1440},
    {"sku": "boost_aether_2x_1h", "name": "Élixir d'Aether — 1h", "category": "boost", "price": 300, "icon": "Coins", "rarity": "rare", "description": "Double Aether gagné pendant 1 heure", "boost_type": "aether_multiplier", "boost_value": 2, "duration_minutes": 60},
    {"sku": "boost_luck_1h", "name": "Œil de Fortune — 1h", "category": "boost", "price": 400, "icon": "Eye", "rarity": "epic", "description": "Augmente les chances de raretés élevées en coffre", "boost_type": "luck", "boost_value": 1.5, "duration_minutes": 60},

    # Consumables
    {"sku": "scroll_rename", "name": "Parchemin de Renommée", "category": "consumable", "price": 1000, "icon": "Scroll", "rarity": "rare", "description": "Permet de changer votre pseudo une fois"},
    {"sku": "key_chest_cosmic", "name": "Clé Cosmique", "category": "consumable", "price": 800, "icon": "Key", "rarity": "epic", "description": "Coffre garantissant un objet Épique ou supérieur"},
    {"sku": "summon_rift", "name": "Catalyseur de Faille", "category": "consumable", "price": 600, "icon": "Sparkles", "rarity": "rare", "description": "Force l'apparition d'une faille dimensionnelle"},

    # Kingdom upgrades
    {"sku": "kingdom_inventory_slot", "name": "Coffre Étendu", "category": "kingdom", "price": 1000, "icon": "Package", "rarity": "rare", "description": "+10 slots d'inventaire permanents"},
    {"sku": "kingdom_aether_mine", "name": "Mine d'Aether", "category": "kingdom", "price": 3000, "icon": "Pickaxe", "rarity": "legendary", "description": "Génère 50 Aether par jour passivement"},
]


def get_shop_item(sku: str):
    return next((i for i in SHOP_ITEMS if i["sku"] == sku), None)
