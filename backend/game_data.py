"""NEXORIA RPG game data definitions: classes, badges, skills, quests, items."""

# 10 RPG Classes
CLASSES = {
    "mage": {"id": "mage", "name": "Mage", "icon": "Sparkles", "color": "#9D4CDD", "tagline": "Maître des arcanes et des éléments", "stat_bonus": {"creativity": 3, "expertise": 2}},
    "warrior": {"id": "warrior", "name": "Guerrier", "icon": "Swords", "color": "#EF4444", "tagline": "Force brute et honneur du combat", "stat_bonus": {"persistence": 3, "leadership": 2}},
    "assassin": {"id": "assassin", "name": "Assassin", "icon": "Skull", "color": "#71717A", "tagline": "Ombre silencieuse, lame précise", "stat_bonus": {"curiosity": 3, "ambition": 2}},
    "paladin": {"id": "paladin", "name": "Paladin", "icon": "Shield", "color": "#EAB308", "tagline": "Gardien de la lumière et de la justice", "stat_bonus": {"leadership": 3, "sociability": 2}},
    "alchemist": {"id": "alchemist", "name": "Alchimiste", "icon": "FlaskConical", "color": "#10B981", "tagline": "Transmuteur des éléments oubliés", "stat_bonus": {"creativity": 2, "expertise": 3}},
    "explorer": {"id": "explorer", "name": "Explorateur", "icon": "Compass", "color": "#00BFFF", "tagline": "Cartographe des mondes inconnus", "stat_bonus": {"curiosity": 3, "discovery": 2}},
    "necromancer": {"id": "necromancer", "name": "Nécromancien", "icon": "Ghost", "color": "#7928CA", "tagline": "Maître des âmes et des cycles", "stat_bonus": {"expertise": 2, "ambition": 3}},
    "architect": {"id": "architect", "name": "Architecte", "icon": "Building2", "color": "#A855F7", "tagline": "Bâtisseur des cités éternelles", "stat_bonus": {"creativity": 3, "persistence": 2}},
    "chronomancer": {"id": "chronomancer", "name": "Chronomancien", "icon": "Clock", "color": "#00E5FF", "tagline": "Tisseur du temps et des destinées", "stat_bonus": {"expertise": 3, "curiosity": 2}},
    "inventor": {"id": "inventor", "name": "Inventeur", "icon": "Cog", "color": "#FFD700", "tagline": "Génie des engrenages et des merveilles", "stat_bonus": {"creativity": 3, "ambition": 2}},
}

# 8 Skills (Path of Exile style)
SKILLS = [
    {"id": "creativity", "name": "Créativité", "icon": "Palette", "color": "#A855F7", "description": "Augmente l'XP gagnée par publication"},
    {"id": "influence", "name": "Influence", "icon": "Megaphone", "color": "#EF4444", "description": "Multiplie la réputation reçue"},
    {"id": "popularity", "name": "Popularité", "icon": "Heart", "color": "#EC4899", "description": "Plus de réactions sur vos posts"},
    {"id": "expertise", "name": "Expertise", "icon": "BookOpen", "color": "#3B82F6", "description": "Débloque des objets rares"},
    {"id": "construction", "name": "Construction", "icon": "Hammer", "color": "#F59E0B", "description": "Améliore votre royaume plus vite"},
    {"id": "collection", "name": "Collection", "icon": "Gem", "color": "#00E5FF", "description": "Augmente le taux de drop"},
    {"id": "leadership", "name": "Leadership", "icon": "Crown", "color": "#FFD700", "description": "Bonus en guilde et événements"},
    {"id": "discovery", "name": "Découverte", "icon": "Telescope", "color": "#10B981", "description": "Révèle les failles dimensionnelles"},
]

# 6 Kingdom buildings
KINGDOM_BUILDINGS = [
    {"id": "castle", "name": "Château", "icon": "Castle", "description": "Le coeur de votre royaume", "unlock_level": 1},
    {"id": "village", "name": "Village", "icon": "Home", "description": "Vos sujets prospèrent ici", "unlock_level": 5},
    {"id": "library", "name": "Bibliothèque", "icon": "Library", "description": "Sagesse et connaissances anciennes", "unlock_level": 10},
    {"id": "forge", "name": "Forge", "icon": "Anvil", "description": "Forgez votre destin", "unlock_level": 15},
    {"id": "trophy_tower", "name": "Tour des Trophées", "icon": "Trophy", "description": "Exposez vos exploits", "unlock_level": 20},
    {"id": "sanctuary", "name": "Sanctuaire", "icon": "Flame", "description": "Lieu sacré de méditation", "unlock_level": 30},
]

# 7 Rarities
RARITIES = {
    "common": {"id": "common", "name": "Commun", "color": "#9CA3AF", "weight": 70},
    "rare": {"id": "rare", "name": "Rare", "color": "#3B82F6", "weight": 22},
    "epic": {"id": "epic", "name": "Épique", "color": "#A855F7", "weight": 6},
    "legendary": {"id": "legendary", "name": "Légendaire", "color": "#EAB308", "weight": 1.5},
    "mythic": {"id": "mythic", "name": "Mythique", "color": "#EF4444", "weight": 0.35},
    "divine": {"id": "divine", "name": "Divin", "color": "#00E5FF", "weight": 0.10},
    "cosmic": {"id": "cosmic", "name": "Cosmique", "color": "#FF0080", "weight": 0.02},
}

# Titles
TITLES = [
    {"id": "novice", "name": "Novice", "unlock_level": 1},
    {"id": "voyageur", "name": "Voyageur", "unlock_level": 5},
    {"id": "veteran", "name": "Vétéran", "unlock_level": 20},
    {"id": "maitre_ombres", "name": "Maître des Ombres", "unlock_level": 50},
    {"id": "seigneur_temps", "name": "Seigneur du Temps", "unlock_level": 100},
    {"id": "roi_createurs", "name": "Roi des Créateurs", "unlock_level": 200},
    {"id": "legende_vivante", "name": "Légende Vivante", "unlock_level": 500},
    {"id": "elu_cosmique", "name": "Élu Cosmique", "unlock_level": 999},
]

# 30 Badges (categories: participation, social, creation, collection, secrets)
BADGES = [
    # Participation
    {"id": "first_step", "name": "Premier Pas", "category": "participation", "icon": "Footprints", "rarity": "common", "description": "Premier post publié", "color": "#9CA3AF"},
    {"id": "chatter_100", "name": "Bavard", "category": "participation", "icon": "MessageCircle", "rarity": "rare", "description": "100 messages écrits", "color": "#3B82F6"},
    {"id": "chatter_1000", "name": "Orateur", "category": "participation", "icon": "MessagesSquare", "rarity": "epic", "description": "1000 messages écrits", "color": "#A855F7"},
    {"id": "chatter_10000", "name": "Conteur Éternel", "category": "participation", "icon": "ScrollText", "rarity": "legendary", "description": "10000 messages écrits", "color": "#EAB308"},
    {"id": "daily_streak_7", "name": "Habitué", "category": "participation", "icon": "Calendar", "rarity": "rare", "description": "7 jours consécutifs", "color": "#3B82F6"},
    {"id": "daily_streak_30", "name": "Pilier", "category": "participation", "icon": "CalendarCheck", "rarity": "epic", "description": "30 jours consécutifs", "color": "#A855F7"},
    # Social
    {"id": "loyal_friend", "name": "Ami Fidèle", "category": "social", "icon": "Users", "rarity": "rare", "description": "10 abonnements", "color": "#3B82F6"},
    {"id": "mentor", "name": "Mentor", "category": "social", "icon": "GraduationCap", "rarity": "epic", "description": "100 abonnés", "color": "#A855F7"},
    {"id": "influencer", "name": "Influenceur", "category": "social", "icon": "TrendingUp", "rarity": "legendary", "description": "1000 abonnés", "color": "#EAB308"},
    {"id": "social_butterfly", "name": "Papillon Social", "category": "social", "icon": "Sparkle", "rarity": "rare", "description": "50 réactions données", "color": "#3B82F6"},
    {"id": "legend_status", "name": "Statut Légende", "category": "social", "icon": "Star", "rarity": "mythic", "description": "10000 abonnés", "color": "#EF4444"},
    # Création
    {"id": "creator", "name": "Créateur", "category": "creation", "icon": "Lightbulb", "rarity": "rare", "description": "10 publications", "color": "#3B82F6"},
    {"id": "innovator", "name": "Innovateur", "category": "creation", "icon": "Rocket", "rarity": "epic", "description": "100 publications", "color": "#A855F7"},
    {"id": "architect_master", "name": "Architecte", "category": "creation", "icon": "Building", "rarity": "legendary", "description": "Royaume niveau 5", "color": "#EAB308"},
    {"id": "viral_post", "name": "Post Viral", "category": "creation", "icon": "Zap", "rarity": "epic", "description": "100 réactions sur un post", "color": "#A855F7"},
    # Collection
    {"id": "relic_hunter", "name": "Chasseur de Reliques", "category": "collection", "icon": "Gem", "rarity": "rare", "description": "10 objets rares collectés", "color": "#3B82F6"},
    {"id": "ultimate_collector", "name": "Collectionneur Ultime", "category": "collection", "icon": "Trophy", "rarity": "legendary", "description": "100 objets collectés", "color": "#EAB308"},
    {"id": "mythic_owner", "name": "Possesseur Mythique", "category": "collection", "icon": "Crown", "rarity": "mythic", "description": "Posséder un objet mythique", "color": "#EF4444"},
    {"id": "divine_keeper", "name": "Gardien Divin", "category": "collection", "icon": "ShieldCheck", "rarity": "divine", "description": "Posséder un objet divin", "color": "#00E5FF"},
    {"id": "cosmic_chosen", "name": "Élu Cosmique", "category": "collection", "icon": "Atom", "rarity": "cosmic", "description": "Posséder un objet cosmique", "color": "#FF0080"},
    # Class
    {"id": "shapeshifter", "name": "Métamorphe", "category": "creation", "icon": "Repeat", "rarity": "rare", "description": "A modifié son apparence (avatar/bannière)", "color": "#3B82F6"},
    {"id": "renamed", "name": "Renaissance", "category": "creation", "icon": "Sparkle", "rarity": "epic", "description": "A changé de pseudo via un Parchemin de Renommée", "color": "#A855F7"},
    {"id": "storyteller", "name": "Conteur", "category": "creation", "icon": "ScrollText", "rarity": "rare", "description": "A écrit l'histoire de son personnage", "color": "#3B82F6"},
    {"id": "polyglot", "name": "Polyglotte", "category": "secrets", "icon": "Globe", "rarity": "rare", "description": "A exploré le royaume en plusieurs langues", "color": "#3B82F6"},
    {"id": "merchant", "name": "Marchand Avisé", "category": "collection", "icon": "ShoppingBag", "rarity": "rare", "description": "Premier achat à la Boutique d'Aether", "color": "#3B82F6"},
    {"id": "big_spender", "name": "Mécène", "category": "collection", "icon": "Coins", "rarity": "epic", "description": "5000 Aether dépensés à la Boutique", "color": "#A855F7"},
    {"id": "class_master", "name": "Maître de Classe", "category": "creation", "icon": "Award", "rarity": "epic", "description": "Atteindre niveau 50 dans votre classe", "color": "#A855F7"},
    {"id": "skill_tree_5", "name": "Apprenti", "category": "creation", "icon": "Sprout", "rarity": "common", "description": "5 points de compétence dépensés", "color": "#9CA3AF"},
    {"id": "skill_tree_50", "name": "Spécialiste", "category": "creation", "icon": "Network", "rarity": "epic", "description": "50 points de compétence dépensés", "color": "#A855F7"},
    # Quests
    {"id": "quest_finisher", "name": "Finisseur", "category": "participation", "icon": "CheckCircle2", "rarity": "rare", "description": "10 quêtes accomplies", "color": "#3B82F6"},
    {"id": "quest_champion", "name": "Champion des Quêtes", "category": "participation", "icon": "Medal", "rarity": "legendary", "description": "100 quêtes accomplies", "color": "#EAB308"},
    # Guilds & Forum & Seasons
    {"id": "founder_guild", "name": "Fondateur d'Ordre", "category": "social", "icon": "Castle", "rarity": "epic", "description": "Fondateur d'un Ordre mystique", "color": "#A855F7"},
    {"id": "scholar", "name": "Érudit", "category": "creation", "icon": "BookOpen", "rarity": "rare", "description": "Premier sujet ouvert sur la Tribune", "color": "#3B82F6"},
    {"id": "season_champion", "name": "Champion de la Saison", "category": "secrets", "icon": "Trophy", "rarity": "mythic", "description": "1ᵉʳ d'une saison clôturée", "color": "#EF4444"},
    {"id": "season_elite", "name": "Élite de la Saison", "category": "secrets", "icon": "Star", "rarity": "legendary", "description": "Top 10 d'une saison clôturée", "color": "#EAB308"},
    # Secrets / Events
    {"id": "founder", "name": "Fondateur", "category": "secrets", "icon": "Diamond", "rarity": "mythic", "description": "Compte créé durant la bêta", "color": "#EF4444"},
    {"id": "rift_walker", "name": "Marcheur des Failles", "category": "secrets", "icon": "Aperture", "rarity": "divine", "description": "Survécu à une faille dimensionnelle", "color": "#00E5FF"},
    {"id": "oracle_blessed", "name": "Béni de l'Oracle", "category": "secrets", "icon": "Eye", "rarity": "epic", "description": "Consulté l'Oracle 10 fois", "color": "#A855F7"},
    {"id": "hall_of_legends", "name": "Hall of Legends", "category": "secrets", "icon": "Flame", "rarity": "cosmic", "description": "Atteindre le top 10 mondial", "color": "#FF0080"},
    {"id": "boss_slayer", "name": "Tueur de Boss", "category": "secrets", "icon": "Target", "rarity": "legendary", "description": "Participé à la défaite d'un boss mondial", "color": "#EAB308"},
]

# Quest templates
QUEST_TEMPLATES = [
    {"id": "daily_post", "type": "daily", "name": "Voix du Royaume", "description": "Publier 1 message", "target": 1, "action": "post", "xp": 50, "aether": 20},
    {"id": "daily_react", "type": "daily", "name": "Encourager les Héros", "description": "Donner 5 réactions", "target": 5, "action": "react", "xp": 30, "aether": 15},
    {"id": "daily_comment", "type": "daily", "name": "Conseil Sage", "description": "Commenter 3 publications", "target": 3, "action": "comment", "xp": 40, "aether": 20},
    {"id": "daily_login", "type": "daily", "name": "Présence Quotidienne", "description": "Se connecter aujourd'hui", "target": 1, "action": "login", "xp": 25, "aether": 10},
    {"id": "weekly_posts", "type": "weekly", "name": "Plume Active", "description": "Publier 10 messages cette semaine", "target": 10, "action": "post", "xp": 300, "aether": 150},
    {"id": "weekly_react", "type": "weekly", "name": "Soutien Fervent", "description": "Donner 50 réactions cette semaine", "target": 50, "action": "react", "xp": 200, "aether": 100},
    {"id": "weekly_oracle", "type": "weekly", "name": "Sagesse de l'Oracle", "description": "Consulter l'Oracle 3 fois", "target": 3, "action": "oracle", "xp": 250, "aether": 120},
    {"id": "monthly_grind", "type": "monthly", "name": "Marathonien", "description": "Gagner 5000 XP ce mois", "target": 5000, "action": "xp", "xp": 1500, "aether": 800},
]

# Inventory item templates
ITEM_TEMPLATES = [
    {"id": "rusty_blade", "name": "Lame Rouillée", "rarity": "common", "type": "weapon", "icon": "Sword"},
    {"id": "iron_helm", "name": "Heaume de Fer", "rarity": "common", "type": "armor", "icon": "HardHat"},
    {"id": "minor_potion", "name": "Potion Mineure", "rarity": "common", "type": "consumable", "icon": "FlaskConical"},
    {"id": "silver_amulet", "name": "Amulette d'Argent", "rarity": "rare", "type": "accessory", "icon": "Gem"},
    {"id": "elven_bow", "name": "Arc Elfique", "rarity": "rare", "type": "weapon", "icon": "Crosshair"},
    {"id": "frost_staff", "name": "Bâton de Givre", "rarity": "epic", "type": "weapon", "icon": "Wand"},
    {"id": "shadow_cloak", "name": "Cape des Ombres", "rarity": "epic", "type": "armor", "icon": "Shirt"},
    {"id": "dragon_scale", "name": "Écaille de Dragon", "rarity": "legendary", "type": "material", "icon": "Shell"},
    {"id": "phoenix_feather", "name": "Plume de Phénix", "rarity": "legendary", "type": "material", "icon": "Feather"},
    {"id": "mythic_orb", "name": "Orbe Mythique", "rarity": "mythic", "type": "relic", "icon": "CircleDot"},
    {"id": "divine_crown", "name": "Couronne Divine", "rarity": "divine", "type": "relic", "icon": "Crown"},
    {"id": "cosmic_shard", "name": "Éclat Cosmique", "rarity": "cosmic", "type": "relic", "icon": "Sparkles"},
]


def xp_for_level(level: int) -> int:
    """XP required to reach level N (cumulative)."""
    return int(100 * (level ** 1.5))


def level_from_xp(xp: int) -> int:
    """Compute level from cumulative XP. Max 999."""
    level = 1
    while level < 999 and xp >= xp_for_level(level + 1):
        level += 1
    return level


def rank_from_level(level: int) -> str:
    if level >= 900:
        return "Cosmique"
    if level >= 700:
        return "Divin"
    if level >= 500:
        return "Mythique"
    if level >= 300:
        return "Légendaire"
    if level >= 150:
        return "Épique"
    if level >= 50:
        return "Rare"
    if level >= 10:
        return "Initié"
    return "Novice"
