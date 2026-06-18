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
    {"sku": "banner_nebula", "name": "Bannière Nébuleuse", "category": "cosmetic", "price": 900, "icon": "Sparkles", "rarity": "epic", "description": "Volutes cosmiques violettes", "unlock_level": 12},
    {"sku": "banner_aurora", "name": "Bannière Aurore", "category": "cosmetic", "price": 950, "icon": "Zap", "rarity": "epic", "description": "Lueurs boréales cyan", "unlock_level": 14},
    {"sku": "banner_void", "name": "Bannière du Vide", "category": "cosmetic", "price": 1400, "icon": "Moon", "rarity": "legendary", "description": "Abîme stellaire profond", "unlock_level": 22},
    {"sku": "banner_gold", "name": "Bannière Royale", "category": "cosmetic", "price": 2000, "icon": "Crown", "rarity": "legendary", "description": "Or impérial du royaume", "unlock_level": 28},
    {"sku": "banner_frost", "name": "Bannière de Givre", "category": "cosmetic", "price": 1100, "icon": "Snowflake", "rarity": "epic", "description": "Glace éternelle des sommets", "unlock_level": 16},
    {"sku": "banner_blood", "name": "Bannière Sanglante", "category": "cosmetic", "price": 1300, "icon": "Droplet", "rarity": "legendary", "description": "Pour les guerriers impitoyables", "unlock_level": 20},
    {"sku": "banner_emerald", "name": "Bannière Émeraude", "category": "cosmetic", "price": 1000, "icon": "Leaf", "rarity": "epic", "description": "Verdure des forêts anciennes", "unlock_level": 13},

    # ---------- Boosts (time-limited) ----------
    {"sku": "boost_xp_2x_1h", "name": "Élixir d'XP — 1h", "category": "boost", "price": 200, "icon": "Zap", "rarity": "rare", "description": "Double XP pendant 1 heure", "boost_type": "xp_multiplier", "boost_value": 2, "duration_minutes": 60, "unlock_level": 1},
    {"sku": "boost_xp_2x_24h", "name": "Élixir d'XP — 24h", "category": "boost", "price": 1500, "icon": "Zap", "rarity": "epic", "description": "Double XP pendant 24 heures", "boost_type": "xp_multiplier", "boost_value": 2, "duration_minutes": 1440, "unlock_level": 15},
    {"sku": "boost_aether_2x_1h", "name": "Élixir d'Écus — 1h", "category": "boost", "price": 300, "icon": "Coins", "rarity": "rare", "description": "Double les Écus gagnés pendant 1 heure", "boost_type": "aether_multiplier", "boost_value": 2, "duration_minutes": 60, "unlock_level": 5},
    {"sku": "boost_luck_1h", "name": "Œil de Fortune — 1h", "category": "boost", "price": 400, "icon": "Eye", "rarity": "epic", "description": "Augmente les chances de raretés élevées en coffre", "boost_type": "luck", "boost_value": 1.5, "duration_minutes": 60, "unlock_level": 10},

    # ---------- Consumables ----------
    {"sku": "scroll_class_change", "name": "Parchemin de Mutation", "category": "consumable", "price": 1200, "icon": "Repeat", "rarity": "epic", "description": "Permet de changer de classe 3 fois (le premier changement est gratuit pour tous)", "unlock_level": 1},
    {"sku": "key_chest_cosmic", "name": "Clé Cosmique", "category": "consumable", "price": 800, "icon": "Key", "rarity": "epic", "description": "Coffre garantissant un objet Épique ou supérieur", "unlock_level": 12},
    {"sku": "summon_rift", "name": "Catalyseur de Faille", "category": "consumable", "price": 600, "icon": "Sparkles", "rarity": "rare", "description": "Force l'apparition d'une faille dimensionnelle", "unlock_level": 8},

    # ---------- Kingdom (permanent perks) ----------
    {"sku": "kingdom_inventory_slot", "name": "Coffre Étendu", "category": "kingdom", "price": 1000, "icon": "Package", "rarity": "rare", "description": "+10 slots d'inventaire permanents", "unlock_level": 5},
    {"sku": "kingdom_aether_mine", "name": "Mine d'Écus", "category": "kingdom", "price": 3000, "icon": "Pickaxe", "rarity": "legendary", "description": "Génère 50 Écus par jour passivement", "unlock_level": 20},
    {"sku": "kingdom_ban_archive", "name": "Archives du Conseil", "category": "kingdom", "price": 4000, "icon": "ScrollText", "rarity": "epic", "description": "Accès permanent aux Archives de Bannissements du royaume", "unlock_level": 25, "perk": "ban_history"},
    {"sku": "kingdom_oracle_link", "name": "Lien à l'Oracle", "category": "kingdom", "price": 5000, "icon": "Eye", "rarity": "legendary", "description": "Consultation illimitée du Sanctuaire — accès au Présage quotidien", "unlock_level": 30, "perk": "oracle_unlimited"},
    {"sku": "kingdom_chronicle_vault", "name": "Voûte des Chroniques", "category": "kingdom", "price": 6000, "icon": "BookOpen", "rarity": "legendary", "description": "Accès aux Chroniques complètes du royaume (toutes époques)", "unlock_level": 35, "perk": "chronicle_full"},
    {"sku": "kingdom_throne_room", "name": "Salle du Trône", "category": "kingdom", "price": 12000, "icon": "Crown", "rarity": "mythic", "description": "Trône personnel affiché sur votre profil, badge royal exclusif", "unlock_level": 50, "perk": "throne"},
    {"sku": "kingdom_treasury", "name": "Trésorerie Royale", "category": "kingdom", "price": 18000, "icon": "Coins", "rarity": "mythic", "description": "Génère 200 Écus par jour passivement (cumulable avec Mine)", "unlock_level": 60, "perk": "treasury"},
    {"sku": "kingdom_constellation", "name": "Constellation Personnelle", "category": "kingdom", "price": 25000, "icon": "Sparkles", "rarity": "divine", "description": "Constellation unique tracée dans le ciel de NEXORIA portant votre nom", "unlock_level": 80, "perk": "constellation"},

    # ---------- Chests (instant relic open) ----------
    {"sku": "chest_ancient", "name": "Coffre Ancien", "category": "chest", "price": 100, "icon": "Gift", "rarity": "rare", "description": "Ouvre immédiatement un coffre de reliques", "unlock_level": 1},
    {"sku": "chest_royal", "name": "Coffre Royal", "category": "chest", "price": 250, "icon": "Gift", "rarity": "epic", "description": "Coffre royal — meilleures chances d'Épique", "unlock_level": 10, "popularity": 3},
    {"sku": "chest_divine", "name": "Coffre Divin", "category": "chest", "price": 500, "icon": "Gift", "rarity": "legendary", "description": "Coffre divin — reliques rares garanties", "unlock_level": 25, "popularity": 5},

    # ---------- Mounts ----------
    {"sku": "mount_stellar_wolf", "name": "Loup Stellaire", "category": "mount", "price": 2200, "icon": "Dog", "rarity": "epic", "description": "Compagnon lupin des brumes stellaires", "unlock_level": 18},
    {"sku": "mount_phoenix_wing", "name": "Ailes du Phénix", "category": "mount", "price": 4500, "icon": "Bird", "rarity": "legendary", "description": "Monture ailée renaissante", "unlock_level": 35, "popularity": 4},

    # ---------- Shop Titles ----------
    {"sku": "title_starforged", "name": "Titre : Forgé des Étoiles", "category": "title", "price": 1800, "icon": "Star", "rarity": "epic", "description": "Titre exclusif boutique", "unlock_level": 15, "title_id": "starforged"},
    {"sku": "title_void_walker", "name": "Titre : Marcheur du Vide", "category": "title", "price": 3500, "icon": "Moon", "rarity": "legendary", "description": "Titre légendaire du néant", "unlock_level": 40, "title_id": "void_walker"},

    # ---------- Auras ----------
    {"sku": "aura_crimson", "name": "Aura Cramoisie", "category": "aura", "price": 1200, "icon": "Flame", "rarity": "epic", "description": "Aura de flammes sombres autour de votre avatar", "unlock_level": 12, "aura_kind": "shadow"},
    {"sku": "aura_aurora", "name": "Aura Boréale", "category": "aura", "price": 2000, "icon": "Sparkles", "rarity": "legendary", "description": "Aura cyan pulsante visible dans le Nexus", "unlock_level": 22, "aura_kind": "cyan", "popularity": 2},

    # ---------- Season Pass ----------
    {"sku": "pass_season_1", "name": "Passe Saison I", "category": "pass", "price": 8000, "icon": "Ticket", "rarity": "mythic", "description": "Accès premium aux récompenses de la saison en cours", "unlock_level": 10, "season_id": "season_1"},

    # ============================================================
    # BOUTIQUE VIP — objets inédits réservés au Pass Ascendant
    # (vip_only: True → achat refusé si le héros n'est pas VIP)
    # ============================================================
    # --- Cosmétiques exclusifs VIP ---
    {"sku": "vip_frame_ascendant", "name": "Cadre de l'Ascendant", "category": "cosmetic", "price": 3000, "icon": "Frame", "rarity": "divine", "description": "Cadre divin animé réservé aux Ascendants — exclusivité VIP", "unlock_level": 1, "vip_only": True},
    {"sku": "vip_banner_celestial", "name": "Bannière Céleste VIP", "category": "cosmetic", "price": 3000, "icon": "Sparkles", "rarity": "divine", "description": "Étendard cosmique scintillant réservé aux VIP", "unlock_level": 1, "vip_only": True},
    {"sku": "vip_aura_ascendant", "name": "Aura de l'Ascendant", "category": "aura", "price": 4000, "icon": "Flame", "rarity": "divine", "description": "Aura divine pulsante visible dans le Nexus — exclusivité VIP", "unlock_level": 1, "vip_only": True, "aura_kind": "divine"},
    {"sku": "vip_mount_celestial_drake", "name": "Drake Céleste", "category": "mount", "price": 6000, "icon": "Bird", "rarity": "divine", "description": "Monture draconique céleste réservée aux Ascendants", "unlock_level": 1, "vip_only": True},
    {"sku": "vip_title_sovereign", "name": "Titre : Souverain du Nexus", "category": "title", "price": 5000, "icon": "Crown", "rarity": "divine", "description": "Titre divin exclusif aux détenteurs du Pass Ascendant", "unlock_level": 1, "vip_only": True, "title_id": "sovereign_nexus"},

    # --- Boosts premium VIP (durée 7 jours, valeurs renforcées) ---
    {"sku": "vip_boost_xp_3x_7d", "name": "Élixir Ascendant d'XP — 7j", "category": "boost", "price": 3500, "icon": "Zap", "rarity": "mythic", "description": "Triple l'XP pendant 7 jours — exclusivité VIP", "boost_type": "xp_multiplier", "boost_value": 3, "duration_minutes": 10080, "unlock_level": 1, "vip_only": True},
    {"sku": "vip_boost_aether_3x_7d", "name": "Élixir Ascendant d'Écus — 7j", "category": "boost", "price": 3500, "icon": "Coins", "rarity": "mythic", "description": "Triple les Écus gagnés pendant 7 jours — exclusivité VIP", "boost_type": "aether_multiplier", "boost_value": 3, "duration_minutes": 10080, "unlock_level": 1, "vip_only": True},
    {"sku": "vip_boost_luck_7d", "name": "Fortune de l'Ascendant — 7j", "category": "boost", "price": 3000, "icon": "Eye", "rarity": "mythic", "description": "Chances de raretés élevées fortement accrues pendant 7 jours — VIP", "boost_type": "luck", "boost_value": 2.5, "duration_minutes": 10080, "unlock_level": 1, "vip_only": True},

    # --- Coffres premium VIP ---
    {"sku": "vip_chest_ascendant", "name": "Coffre de l'Ascendant", "category": "chest", "price": 1200, "icon": "Gift", "rarity": "divine", "description": "Coffre divin garantissant une relique Légendaire ou supérieure — VIP", "unlock_level": 1, "vip_only": True, "min_rarity": "legendary", "luck_boost": 3.0},

    # --- Consommables exclusifs VIP (nombreux) ---
    {"sku": "vip_key_divine", "name": "Clé Divine", "category": "consumable", "price": 1500, "icon": "Key", "rarity": "mythic", "description": "Ouvre un coffre garantissant une relique Légendaire+ — VIP", "unlock_level": 1, "vip_only": True, "min_rarity": "legendary"},
    {"sku": "vip_relic_box", "name": "Boîte à Reliques VIP", "category": "consumable", "price": 1000, "icon": "Package", "rarity": "epic", "description": "Ouvre un coffre garantissant une relique Épique+ — VIP", "unlock_level": 1, "vip_only": True, "min_rarity": "epic"},
    {"sku": "vip_rift_catalyst", "name": "Catalyseur de Faille Majeur", "category": "consumable", "price": 900, "icon": "Sparkles", "rarity": "epic", "description": "Force l'apparition d'une faille de trésor — VIP", "unlock_level": 1, "vip_only": True, "rift_force": "chest"},
    {"sku": "vip_scroll_mutation", "name": "Grand Parchemin de Mutation", "category": "consumable", "price": 2000, "icon": "Repeat", "rarity": "legendary", "description": "Crédite 5 changements de classe — exclusivité VIP", "unlock_level": 1, "vip_only": True, "class_changes": 5},
    {"sku": "vip_tome_knowledge", "name": "Tome de Connaissance", "category": "consumable", "price": 2500, "icon": "BookOpen", "rarity": "legendary", "description": "Octroie instantanément 5000 XP — exclusivité VIP", "unlock_level": 1, "vip_only": True, "grant_xp": 5000},
    {"sku": "vip_emblem_renown", "name": "Emblème de Renom", "category": "consumable", "price": 1800, "icon": "Award", "rarity": "epic", "description": "Octroie instantanément 800 points de réputation — VIP", "unlock_level": 1, "vip_only": True, "grant_reputation": 800},
    {"sku": "vip_skill_codex", "name": "Codex des Talents", "category": "consumable", "price": 2200, "icon": "Sprout", "rarity": "legendary", "description": "Octroie 3 points de compétence — exclusivité VIP", "unlock_level": 1, "vip_only": True, "grant_skill_points": 3},
    {"sku": "vip_scroll_rename", "name": "Parchemin de Renommée Doré", "category": "consumable", "price": 800, "icon": "Scroll", "rarity": "epic", "description": "Permet de changer votre pseudo (variante VIP)", "unlock_level": 1, "vip_only": True, "rename_grant": True},
]


def get_shop_item(sku: str):
    return next((i for i in SHOP_ITEMS if i["sku"] == sku), None)


# ---------- Écus packs (real-money top-up via Stripe) ----------
# `price_eur` is the charge; `ecus` is the base amount; `bonus` is extra écus
# granted on top (marketing). Total credited = ecus + bonus. Prices in EUR cents
# are derived at checkout (price_eur * 100).
ECU_PACKS = [
    {"id": "ecus_1000",  "ecus": 1000,  "bonus": 0,    "price_eur": 4.99,  "label": "Petite bourse"},
    {"id": "ecus_2500",  "ecus": 2500,  "bonus": 250,  "price_eur": 9.99,  "label": "Bourse du marchand", "popular": True},
    {"id": "ecus_6000",  "ecus": 6000,  "bonus": 900,  "price_eur": 19.99, "label": "Coffre royal"},
    {"id": "ecus_15000", "ecus": 15000, "bonus": 3000, "price_eur": 44.99, "label": "Trésor cosmique", "best_value": True},
]


def get_ecu_pack(pack_id: str):
    return next((p for p in ECU_PACKS if p["id"] == pack_id), None)
