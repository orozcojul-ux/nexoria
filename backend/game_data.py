"""NEXORIA RPG game data definitions: classes, badges, skills, quests, items."""

# 10 RPG Classes
CLASSES = {
    "mage": {
        "id": "mage", "name": "Mage", "icon": "Sparkles", "color": "#9D4CDD",
        "tagline": "Maître des arcanes et des éléments",
        "stat_bonus": {"creativity": 3, "expertise": 2},
        "powers": [
            {"id": "arcane_surge",    "name": "Surtension Arcane",    "icon": "Zap",        "description": "+25% XP gagné depuis l'Oracle des Quêtes"},
            {"id": "spell_mastery",   "name": "Maîtrise des Sorts",   "icon": "BookOpen",   "description": "Double XP sur toutes les quêtes de type oracle_log"},
            {"id": "mana_resonance",  "name": "Résonance Mana",       "icon": "Sparkles",   "description": "+10 DNA Créativité bonus à chaque niveau"},
        ],
    },
    "warrior": {
        "id": "warrior", "name": "Guerrier", "icon": "Swords", "color": "#EF4444",
        "tagline": "Force brute et honneur du combat",
        "stat_bonus": {"persistence": 3, "leadership": 2},
        "powers": [
            {"id": "iron_will",       "name": "Volonté de Fer",       "icon": "Shield",     "description": "+15% XP gagné depuis les quêtes forum_thread"},
            {"id": "rally_cry",       "name": "Cri de Ralliement",    "icon": "Megaphone",  "description": "+2 Réputation pour chaque membre invité en guilde"},
            {"id": "unbreakable",     "name": "Inébranlable",         "icon": "Swords",     "description": "+10 DNA Persévérance bonus à chaque niveau"},
        ],
    },
    "assassin": {
        "id": "assassin", "name": "Assassin", "icon": "Skull", "color": "#71717A",
        "tagline": "Ombre silencieuse, lame précise",
        "stat_bonus": {"curiosity": 3, "ambition": 2},
        "powers": [
            {"id": "shadow_step",     "name": "Pas de l'Ombre",       "icon": "EyeOff",     "description": "Détecte les failles dimensionnelles avec 2× plus de chances"},
            {"id": "precision",       "name": "Précision",            "icon": "Target",     "description": "+20% Écus gagnés lors de l'exploration du Nexus"},
            {"id": "vanish",          "name": "Disparition",          "icon": "Ghost",      "description": "+10 DNA Curiosité bonus à chaque niveau"},
        ],
    },
    "paladin": {
        "id": "paladin", "name": "Paladin", "icon": "Shield", "color": "#EAB308",
        "tagline": "Gardien de la lumière et de la justice",
        "stat_bonus": {"leadership": 3, "sociability": 2},
        "powers": [
            {"id": "divine_aura",     "name": "Aura Divine",          "icon": "Sun",        "description": "+30 XP bonus pour chaque nouveau héros parrainé"},
            {"id": "holy_shield",     "name": "Bouclier Sacré",       "icon": "ShieldCheck","description": "+2 Réputation reçue sur chaque post du fil"},
            {"id": "oath",            "name": "Serment",              "icon": "Crown",      "description": "+10 DNA Leadership bonus à chaque niveau"},
        ],
    },
    "alchemist": {
        "id": "alchemist", "name": "Alchimiste", "icon": "FlaskConical", "color": "#10B981",
        "tagline": "Transmuteur des éléments oubliés",
        "stat_bonus": {"creativity": 2, "expertise": 3},
        "powers": [
            {"id": "transmutation",   "name": "Transmutation",        "icon": "Repeat",     "description": "Coffres ouverts garantissent au moins 1 objet Rare"},
            {"id": "elixir_craft",    "name": "Élixir Maître",        "icon": "FlaskConical","description": "+25% durée des boosts achetés en boutique"},
            {"id": "catalyst",        "name": "Catalyseur",           "icon": "Atom",       "description": "+10 DNA Expertise bonus à chaque niveau"},
        ],
    },
    "explorer": {
        "id": "explorer", "name": "Explorateur", "icon": "Compass", "color": "#00BFFF",
        "tagline": "Cartographe des mondes inconnus",
        "stat_bonus": {"curiosity": 3, "discovery": 2},
        "powers": [
            {"id": "pathfinder",      "name": "Éclaireur",            "icon": "Map",        "description": "Révèle les failles 2× plus souvent (cooldown réduit)"},
            {"id": "treasure_sense",  "name": "Sens du Trésor",       "icon": "Gem",        "description": "+10% chance d'objet Épique dans les coffres"},
            {"id": "wanderlust",      "name": "Soif d'Aventure",      "icon": "Compass",    "description": "+10 DNA Curiosité bonus à chaque niveau"},
        ],
    },
    "necromancer": {
        "id": "necromancer", "name": "Nécromancien", "icon": "Ghost", "color": "#7928CA",
        "tagline": "Maître des âmes et des cycles",
        "stat_bonus": {"expertise": 2, "ambition": 3},
        "powers": [
            {"id": "soul_harvest",    "name": "Moisson des Âmes",     "icon": "Ghost",      "description": "+30 XP bonus pour chaque quête réactivée (relancée)"},
            {"id": "undying_will",    "name": "Volonté Impérissable", "icon": "Skull",      "description": "Récupère 50% de l'XP perdue sur les quêtes expirées"},
            {"id": "dark_mastery",    "name": "Maîtrise Obscure",     "icon": "Eye",        "description": "+10 DNA Ambition bonus à chaque niveau"},
        ],
    },
    "architect": {
        "id": "architect", "name": "Architecte", "icon": "Building2", "color": "#A855F7",
        "tagline": "Bâtisseur des cités éternelles",
        "stat_bonus": {"creativity": 3, "persistence": 2},
        "powers": [
            {"id": "blueprint",       "name": "Plans du Maître",      "icon": "Ruler",      "description": "-10% coût Écus sur toutes les améliorations du Royaume"},
            {"id": "grand_design",    "name": "Grand Dessein",        "icon": "Building2",  "description": "+50% revenus passifs des bâtiments du Royaume"},
            {"id": "legacy",          "name": "Héritage",             "icon": "Layers",     "description": "+10 DNA Créativité bonus à chaque niveau"},
        ],
    },
    "chronomancer": {
        "id": "chronomancer", "name": "Chronomancien", "icon": "Clock", "color": "#00E5FF",
        "tagline": "Tisseur du temps et des destinées",
        "stat_bonus": {"expertise": 3, "curiosity": 2},
        "powers": [
            {"id": "time_warp",       "name": "Distorsion Temporelle","icon": "Clock",      "description": "Étend la durée des quêtes journalières de +4h"},
            {"id": "foresight",       "name": "Prescience",           "icon": "Eye",        "description": "+20% XP pendant les événements saisonniers actifs"},
            {"id": "temporal_echo",   "name": "Écho Temporel",        "icon": "RefreshCw",  "description": "+10 DNA Expertise bonus à chaque niveau"},
        ],
    },
    "inventor": {
        "id": "inventor", "name": "Inventeur", "icon": "Cog", "color": "#FFD700",
        "tagline": "Génie des engrenages et des merveilles",
        "stat_bonus": {"creativity": 3, "ambition": 2},
        "powers": [
            {"id": "overclocked",     "name": "Surchargé",            "icon": "Cog",        "description": "+20% Écus passifs générés par la Mine d'Écus"},
            {"id": "gadget_forge",    "name": "Forge à Gadgets",      "icon": "Wrench",     "description": "+1 emplacement d'inventaire offert tous les 10 niveaux"},
            {"id": "eureka",          "name": "Eurêka !",             "icon": "Lightbulb",  "description": "+10 DNA Ambition bonus à chaque niveau"},
        ],
    },
}

# Class portrait filenames (mirrors frontend CLASS_IMAGE_FILES → /assets/classes/*.png)
CLASS_PORTRAIT_FILES = {
    "mage": "mage",
    "warrior": "guerrier",
    "guerrier": "guerrier",
    "assassin": "assassin",
    "paladin": "paladin",
    "alchemist": "alchimiste",
    "alchimiste": "alchimiste",
    "explorer": "explorateur",
    "explorateur": "explorateur",
    "necromancer": "necromancien",
    "necromancien": "necromancien",
    "architect": "architecte",
    "architecte": "architecte",
    "chronomancer": "chronomancien",
    "chronomancien": "chronomancien",
    "inventor": "inventeur",
    "inventeur": "inventeur",
}


def class_portrait_path(class_id: str | None) -> str:
    """Relative public URL for the class portrait used as default avatar."""
    cid = (class_id or "explorer").lower()
    file = CLASS_PORTRAIT_FILES.get(cid, "explorateur")
    return f"/assets/classes/{file}.png"


def is_class_portrait_url(url: str | None) -> bool:
    """True when avatar is unset or still the default class portrait."""
    if not url:
        return True
    return "/assets/classes/" in url


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
    {"id": "starforged", "name": "Forgé des Étoiles", "unlock_level": 1},
    {"id": "void_walker", "name": "Marcheur du Vide", "unlock_level": 1},
    {"id": "ambassadeur_nexus", "name": "Ambassadeur du Nexus", "unlock_level": 1},
    {"id": "ascendant_nexus", "name": "Ascendant du Nexus", "unlock_level": 1},
]

SHOP_ONLY_TITLES = frozenset({"starforged", "void_walker"})

# Titres débloqués par le parrainage (ne s'obtiennent pas par le niveau).
REFERRAL_TITLES = frozenset({"ambassadeur_nexus"})

# Titres réservés aux membres VIP « Pass Ascendant » (octroi explicite).
VIP_TITLES = frozenset({"ascendant_nexus"})

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
    {"id": "discord_herald", "name": "Héraut Discord", "category": "social", "icon": "MessageSquare", "rarity": "rare", "description": "Inscription ou liaison via Discord", "color": "#5865F2"},
    {"id": "loyal_friend", "name": "Ami Fidèle", "category": "social", "icon": "Users", "rarity": "rare", "description": "10 abonnements", "color": "#3B82F6"},
    {"id": "recruteur", "name": "Recruteur", "category": "social", "icon": "UserPlus", "rarity": "epic", "description": "A parrainé 3 nouveaux héros", "color": "#A855F7"},
    {"id": "mentor_heroe", "name": "Mentor des Héros", "category": "social", "icon": "GraduationCap", "rarity": "legendary", "description": "A parrainé 15 nouveaux héros", "color": "#EAB308"},
    {"id": "parrain_legendaire", "name": "Parrain Légendaire", "category": "social", "icon": "Crown", "rarity": "mythic", "description": "A parrainé 50 nouveaux héros", "color": "#EF4444"},
    {"id": "vip_nexus", "name": "VIP Nexus", "category": "social", "icon": "Gem", "rarity": "legendary", "description": "Détenteur du Pass Ascendant", "color": "#FBBF24"},
    {"id": "pionnier_nexus", "name": "Pionnier du Nexus", "category": "social", "icon": "Flag", "rarity": "mythic", "description": "Parmi les 100 premiers héros à rejoindre NEXORIA", "color": "#22D3EE"},
    {"id": "season_passholder", "name": "Détenteur du Passe Saison", "category": "social", "icon": "Ticket", "rarity": "legendary", "description": "A acquis le Passe Saison premium", "color": "#EC4899"},
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
    {"id": "merchant", "name": "Marchand Avisé", "category": "collection", "icon": "ShoppingBag", "rarity": "rare", "description": "Premier achat à la Boutique des Écus", "color": "#3B82F6"},
    {"id": "big_spender", "name": "Mécène", "category": "collection", "icon": "Coins", "rarity": "epic", "description": "5000 Écus dépensés à la Boutique", "color": "#A855F7"},
    {"id": "class_master", "name": "Maître de Classe", "category": "creation", "icon": "Award", "rarity": "epic", "description": "Atteindre niveau 50 dans votre classe", "color": "#A855F7"},
    {"id": "skill_tree_5", "name": "Apprenti", "category": "creation", "icon": "Sprout", "rarity": "common", "description": "5 points de compétence dépensés", "color": "#9CA3AF"},
    {"id": "skill_tree_50", "name": "Spécialiste", "category": "creation", "icon": "Network", "rarity": "epic", "description": "50 points de compétence dépensés", "color": "#A855F7"},
    # Quests
    {"id": "quest_finisher", "name": "Finisseur", "category": "participation", "icon": "CheckCircle2", "rarity": "rare", "description": "10 quêtes accomplies", "color": "#3B82F6"},
    {"id": "quest_champion", "name": "Champion des Quêtes", "category": "participation", "icon": "Medal", "rarity": "legendary", "description": "100 quêtes accomplies", "color": "#EAB308"},
    # Guilds & Forum & Seasons
    {"id": "founder_guild", "name": "Fondateur d'Ordre", "category": "social", "icon": "Castle", "rarity": "epic", "description": "Fondateur d'un Ordre mystique", "color": "#A855F7"},
    {"id": "scholar", "name": "Érudit", "category": "creation", "icon": "BookOpen", "rarity": "rare", "description": "Premier sujet ouvert sur la Tribune", "color": "#3B82F6"},
    {"id": "nexus_blessed", "name": "Béni du Nexus", "category": "secrets", "icon": "Crown", "rarity": "legendary", "description": "Touché par la Roue du Nexus", "color": "#FBBF24"},
    {"id": "wheel_first_spin", "name": "Tour de Fortune", "category": "participation", "icon": "CircleDot", "rarity": "common", "description": "Premier tour à la Roue du Nexus", "color": "#9CA3AF"},
    {"id": "wheel_spinner_7", "name": "Fidèle du Nexus", "category": "participation", "icon": "RotateCw", "rarity": "rare", "description": "7 tours cumulés à la Roue du Nexus", "color": "#38E8FF"},
    {"id": "wheel_spinner_30", "name": "Devin du Nexus", "category": "participation", "icon": "Sparkles", "rarity": "epic", "description": "30 tours cumulés à la Roue du Nexus", "color": "#7B3FF2"},
    {"id": "wheel_spinner_100", "name": "Maître de la Roue", "category": "participation", "icon": "Trophy", "rarity": "legendary", "description": "100 tours cumulés à la Roue du Nexus", "color": "#FBBF24"},
    {"id": "wheel_lucky", "name": "Faveur Cosmique", "category": "secrets", "icon": "Gem", "rarity": "epic", "description": "Récompense légendaire gagnée à la Roue du Nexus", "color": "#FBBF24"},
    # Forge du Nexus
    {"id": "craft_apprentice", "name": "Apprenti Forgeron", "category": "collection", "icon": "Hammer", "rarity": "common", "description": "Première tentative à la Forge du Nexus", "color": "#9CA3AF"},
    {"id": "craft_first_success", "name": "Première Relique", "category": "collection", "icon": "Sparkles", "rarity": "rare", "description": "Première forge réussie", "color": "#38E8FF"},
    {"id": "craft_forger_10", "name": "Forgeron", "category": "collection", "icon": "Anvil", "rarity": "rare", "description": "10 tentatives à la Forge", "color": "#3B82F6"},
    {"id": "craft_forger_50", "name": "Artisan du Nexus", "category": "collection", "icon": "Wrench", "rarity": "epic", "description": "50 tentatives à la Forge", "color": "#7B3FF2"},
    {"id": "craft_master", "name": "Maître Forgeron", "category": "collection", "icon": "Award", "rarity": "epic", "description": "25 forges réussies", "color": "#A855F7"},
    {"id": "craft_grandmaster", "name": "Grand Maître du Nexus", "category": "collection", "icon": "Trophy", "rarity": "legendary", "description": "100 forges réussies", "color": "#FBBF24"},
    {"id": "craft_epic_smith", "name": "Forgeron Épique", "category": "collection", "icon": "Gem", "rarity": "epic", "description": "A forgé une relique épique ou supérieure", "color": "#9D4CDD"},
    {"id": "craft_legend_smith", "name": "Forge Légendaire", "category": "collection", "icon": "Crown", "rarity": "legendary", "description": "A forgé une relique légendaire", "color": "#F97316"},
    {"id": "craft_obsidian", "name": "Lame des Ombres", "category": "secrets", "icon": "Sword", "rarity": "legendary", "description": "A forgé la Lame d'Obsidienne", "color": "#EF4444"},
    {"id": "craft_hoarder", "name": "Collecteur Cosmique", "category": "collection", "icon": "Layers", "rarity": "rare", "description": "Possède les 6 matériaux de forge en même temps", "color": "#38E8FF"},
    {"id": "craft_resilient", "name": "Endurci par l'Échec", "category": "secrets", "icon": "Shield", "rarity": "rare", "description": "A surmonté 5 échecs de forge", "color": "#6B7280"},
    {"id": "season_champion", "name": "Champion de la Saison", "category": "secrets", "icon": "Trophy", "rarity": "mythic", "description": "1ᵉʳ d'une saison clôturée", "color": "#EF4444"},
    {"id": "season_elite", "name": "Élite de la Saison", "category": "secrets", "icon": "Star", "rarity": "legendary", "description": "Top 10 d'une saison clôturée", "color": "#EAB308"},
    # Secrets / Events
    {"id": "rift_walker", "name": "Marcheur des Failles", "category": "secrets", "icon": "Aperture", "rarity": "divine", "description": "Survécu à une faille dimensionnelle", "color": "#00E5FF"},
    {"id": "oracle_blessed", "name": "Béni de l'Oracle", "category": "secrets", "icon": "Eye", "rarity": "epic", "description": "Consulté l'Oracle 10 fois", "color": "#A855F7"},
    {"id": "news_scribe", "name": "Scribe des Nouvelles", "category": "creation", "icon": "Newspaper", "rarity": "common", "description": "Premier commentaire sur une actualité", "color": "#22D3EE"},
    {"id": "news_sage", "name": "Sage du Royaume", "category": "creation", "icon": "BookOpen", "rarity": "rare", "description": "25 commentaires sur les actualités", "color": "#A855F7"},
    {"id": "news_herald", "name": "Héraut des Chroniques", "category": "creation", "icon": "Megaphone", "rarity": "epic", "description": "100 commentaires sur les actualités", "color": "#FBBF24"},
    {"id": "guardian_just", "name": "Gardien de la Justice", "category": "social", "icon": "Shield", "rarity": "rare", "description": "Signalement validé par les modérateurs", "color": "#4ADE80"},
    {"id": "hall_of_legends", "name": "Hall of Legends", "category": "secrets", "icon": "Flame", "rarity": "cosmic", "description": "Atteindre le top 10 mondial", "color": "#FF0080"},
    {"id": "boss_slayer", "name": "Tueur de Boss", "category": "secrets", "icon": "Target", "rarity": "legendary", "description": "Participé à la défaite d'un boss mondial", "color": "#EAB308"},
]

# Quest templates
QUEST_TEMPLATES = [
    # ── Quotidiennes ──
    {"id": "daily_login", "type": "daily", "name": "Présence Quotidienne", "description": "Connecte-toi aujourd'hui (sur n'importe quelle page).", "target": 1, "action": "login", "xp": 25, "aether": 10},
    {"id": "daily_forum_reply", "type": "daily", "name": "Voix du Conseil", "description": "Réponds à 2 sujets dans le Forum (onglet Forum › ouvre un sujet › Répondre).", "target": 2, "action": "forum_reply", "xp": 50, "aether": 25},
    {"id": "daily_oracle", "type": "daily", "name": "Murmures de l'Oracle", "description": "Consulte l'Oracle une fois (onglet Oracle).", "target": 1, "action": "oracle", "xp": 40, "aether": 20},
    {"id": "daily_nexus", "type": "daily", "name": "Marche du Nexus", "description": "Entre dans le Nexus Online (onglet Online).", "target": 1, "action": "nexus_enter", "xp": 35, "aether": 15},
    # ── Hebdomadaires ──
    {"id": "weekly_forum_threads", "type": "weekly", "name": "Chroniqueur", "description": "Ouvre 3 nouveaux sujets dans le Forum (onglet Forum › Nouveau sujet).", "target": 3, "action": "forum_thread", "xp": 300, "aether": 150},
    {"id": "weekly_forum_replies", "type": "weekly", "name": "Orateur des Salles", "description": "Poste 15 réponses dans les sujets du Forum (onglet Forum › Répondre).", "target": 15, "action": "forum_reply", "xp": 320, "aether": 160},
    {"id": "weekly_guild_chat", "type": "weekly", "name": "Fraternité d'Ordre", "description": "Envoie 10 messages dans le chat de ton ordre (onglet Guildes › ton ordre › Discussion).", "target": 10, "action": "guild_chat", "xp": 220, "aether": 110},
    {"id": "weekly_oracle", "type": "weekly", "name": "Sagesse de l'Oracle", "description": "Consulte l'Oracle 3 fois (onglet Oracle).", "target": 3, "action": "oracle", "xp": 250, "aether": 120},
    {"id": "weekly_friends", "type": "weekly", "name": "Liens d'Amitié", "description": "Envoie 5 messages privés à un ami (onglet Amis › ouvre une discussion).", "target": 5, "action": "friend_message", "xp": 180, "aether": 90},
    # ── Quotidiennes supplémentaires ──
    {"id": "daily_chest", "type": "daily", "name": "Briseur de Sceau", "description": "Ouvre 1 coffre (Inventaire › Ouvrir le coffre — coûte 50 Écus, remboursés par la récompense).", "target": 1, "action": "chest_open", "xp": 80, "aether": 50},
    {"id": "daily_nexus_wheel", "type": "daily", "name": "Fortune du Nexus", "description": "Tourne la Roue du Nexus une fois (Accueil ou Boutique › Roue du Nexus).", "target": 1, "action": "nexus_wheel_spin", "xp": 60, "aether": 35},
    {"id": "daily_combat", "type": "daily", "name": "Chasseur de l'Arène", "description": "Vaincs 3 créatures dans l'Arène du Nexus (Nexus Online › Arène du Nexus).", "target": 3, "action": "combat_kill", "xp": 90, "aether": 45},
    {"id": "daily_craft", "type": "daily", "name": "Étincelle du Forge", "description": "Tente 1 forge à la Forge du Nexus (Inventaire › Forge du Nexus).", "target": 1, "action": "craft", "xp": 70, "aether": 40},
    {"id": "daily_craft_success", "type": "daily", "name": "Relique Forgée", "description": "Réussis 1 forge aujourd'hui à la Forge du Nexus.", "target": 1, "action": "craft_success", "xp": 120, "aether": 60},
    # ── Hebdomadaires supplémentaires ──
    {"id": "weekly_parrainage", "type": "weekly", "name": "Messager du Royaume", "description": "Parraine 1 nouvel héros cette semaine (Settings › Parrainage › partage ton lien).", "target": 1, "action": "referral", "xp": 350, "aether": 175},
    {"id": "weekly_shop", "type": "weekly", "name": "Mécène de la Boutique", "description": "Effectue 1 achat à la Boutique cette semaine (l'article le moins cher coûte 50 Écus — remboursés par la récompense).", "target": 1, "action": "shop_purchase", "xp": 200, "aether": 50},
    {"id": "weekly_nexus_wheel", "type": "weekly", "name": "Habitant de la Roue", "description": "Tourne la Roue du Nexus 5 fois cette semaine.", "target": 5, "action": "nexus_wheel_spin", "xp": 280, "aether": 140},
    {"id": "weekly_craft", "type": "weekly", "name": "Semaine à l'Enclume", "description": "Forge 5 fois cette semaine (réussite ou échec).", "target": 5, "action": "craft", "xp": 300, "aether": 150},
    {"id": "weekly_craft_success", "type": "weekly", "name": "Artisan du Royaume", "description": "Réussis 3 forges cette semaine.", "target": 3, "action": "craft_success", "xp": 400, "aether": 200},
    # ── Mensuelle supplémentaire ──
    {"id": "monthly_grind", "type": "monthly", "name": "Marathonien", "description": "Gagne 5000 XP ce mois (en publiant, réagissant et participant partout sur le site).", "target": 5000, "action": "xp", "xp": 1500, "aether": 800},
    {"id": "monthly_parrainage", "type": "monthly", "name": "Seigneur des Alliances", "description": "Parraine 3 nouveaux héros ce mois (Settings › Parrainage › partage ton lien).", "target": 3, "action": "referral", "xp": 1000, "aether": 500},
    {"id": "monthly_vip", "type": "monthly", "name": "Ascension Royale", "description": "Active le Pass Ascendant ce mois (Boutique › Pass Ascendant).", "target": 1, "action": "vip_purchase", "xp": 2000, "aether": 1000},
    {"id": "monthly_nexus_wheel", "type": "monthly", "name": "Légende de la Roue", "description": "Tourne la Roue du Nexus 20 fois ce mois.", "target": 20, "action": "nexus_wheel_spin", "xp": 1200, "aether": 600},
    {"id": "monthly_craft", "type": "monthly", "name": "Légende de la Forge", "description": "Forge 20 fois ce mois à la Forge du Nexus.", "target": 20, "action": "craft", "xp": 1000, "aether": 500},
    {"id": "monthly_craft_epic", "type": "monthly", "name": "Maître des Runes", "description": "Réussis 2 forges épiques ou supérieures ce mois.", "target": 2, "action": "craft_epic_success", "xp": 1500, "aether": 750},
    # ── Quêtes EXCLUSIVES VIP (vip_only : visibles uniquement par les détenteurs du Pass Ascendant) ──
    {"id": "vip_daily_oracle", "type": "daily", "name": "Faveur de l'Ascendant", "description": "VIP : consulte l'Oracle aujourd'hui pour une récompense renforcée.", "target": 1, "action": "oracle", "xp": 120, "aether": 80, "vip_only": True},
    {"id": "vip_daily_chest", "type": "daily", "name": "Trésor de l'Ascendant", "description": "VIP : ouvre 2 coffres aujourd'hui.", "target": 2, "action": "chest_open", "xp": 200, "aether": 120, "vip_only": True},
    {"id": "vip_daily_wheel", "type": "daily", "name": "Triple Fortune Ascendante", "description": "VIP : tourne la Roue du Nexus 3 fois aujourd'hui.", "target": 3, "action": "nexus_wheel_spin", "xp": 180, "aether": 100, "vip_only": True},
    {"id": "vip_daily_craft", "type": "daily", "name": "Forge Ascendante", "description": "VIP : réussis 2 forges aujourd'hui.", "target": 2, "action": "craft_success", "xp": 200, "aether": 120, "vip_only": True},
    {"id": "vip_weekly_forum", "type": "weekly", "name": "Voix Souveraine", "description": "VIP : poste 20 réponses sur la Tribune cette semaine.", "target": 20, "action": "forum_reply", "xp": 600, "aether": 350, "vip_only": True},
    {"id": "vip_weekly_referral", "type": "weekly", "name": "Ambassade de l'Ascendant", "description": "VIP : parraine 2 nouveaux héros cette semaine.", "target": 2, "action": "referral", "xp": 800, "aether": 500, "vip_only": True},
    {"id": "vip_monthly_grind", "type": "monthly", "name": "Légende Ascendante", "description": "VIP : gagne 12000 XP ce mois.", "target": 12000, "action": "xp", "xp": 4000, "aether": 2500, "vip_only": True},
]

# Défis communautaires affichés sur l'accueil / événements (objectifs collectifs)
COMMUNITY_CHALLENGES = [
    {
        "challenge_id": "forum_echoes",
        "sort_order": 1,
        "name": "Échos du Conseil",
        "description": "La communauté doit échanger 500 réponses sur les forums pour réveiller l'Oracle collectif.",
        "target": 500,
        "action": "forum_reply",
        "action_label": "Réponses forum",
        "link": "/forum",
        "tone": "violet",
        "icon": "MessageSquare",
        "reward_xp": 200,
        "reward_aether": 100,
        "reward_label": "+200 XP · +100 Écus pour tous les héros",
    },
    {
        "challenge_id": "forum_chronicles",
        "sort_order": 2,
        "name": "Chroniques du Royaume",
        "description": "Ouvrir 80 nouveaux débats pour alimenter la mémoire vivante de NEXORIA.",
        "target": 80,
        "action": "forum_thread",
        "action_label": "Sujets ouverts",
        "link": "/forum",
        "tone": "cyan",
        "icon": "ScrollText",
        "reward_xp": 150,
        "reward_aether": 75,
        "reward_label": "+150 XP · +75 Écus pour tous les héros",
    },
    {
        "challenge_id": "oracle_convergence",
        "sort_order": 3,
        "name": "Convergence Mystique",
        "description": "300 consultations de l'Oracle pour percer le voile entre les mondes.",
        "target": 300,
        "action": "oracle_log",
        "action_label": "Consultations",
        "link": "/oracle",
        "tone": "amber",
        "icon": "Sparkles",
        "reward_xp": 250,
        "reward_aether": 120,
        "reward_label": "+250 XP · +120 Écus pour tous les héros",
    },
    {
        "challenge_id": "guild_banners",
        "sort_order": 4,
        "name": "Bannières Unies",
        "description": "200 messages échangés dans les guildes pour sceller l'alliance des ordres.",
        "target": 200,
        "action": "guild_chat",
        "action_label": "Messages de guilde",
        "link": "/guilds",
        "tone": "gold",
        "icon": "Castle",
        "reward_xp": 300,
        "reward_aether": 150,
        "reward_label": "+300 XP · +150 Écus pour tous les héros",
    },
    {
        "challenge_id": "fellowship_bonds",
        "sort_order": 5,
        "name": "Tisserands d'Amitié",
        "description": "150 missives entre compagnons pour renforcer les liens du royaume.",
        "target": 150,
        "action": "friend_message",
        "action_label": "Missives envoyées",
        "link": "/friends",
        "tone": "emerald",
        "icon": "Users",
        "reward_xp": 200,
        "reward_aether": 100,
        "reward_label": "+200 XP · +100 Écus pour tous les héros",
    },
    {
        "challenge_id": "forge_awakening",
        "sort_order": 6,
        "name": "Éveil des Forgerons",
        "description": "500 forges collectives pour réveiller l'enclume cosmique du royaume.",
        "target": 500,
        "action": "craft",
        "action_label": "Forges réalisées",
        "link": "/craft",
        "tone": "amber",
        "icon": "Hammer",
        "reward_xp": 250,
        "reward_aether": 125,
        "reward_label": "+250 XP · +125 Écus pour tous les héros",
    },
]

# Inventory item templates — Reliques
ITEM_TEMPLATES = [
    # Commons
    {"id": "rusty_blade", "name": "Lame Rouillée", "rarity": "common", "type": "weapon", "icon": "Sword"},
    {"id": "iron_helm", "name": "Heaume de Fer", "rarity": "common", "type": "armor", "icon": "HardHat"},
    {"id": "minor_potion", "name": "Potion Mineure", "rarity": "common", "type": "consumable", "icon": "FlaskConical"},
    {"id": "torch_oil", "name": "Huile de Torche", "rarity": "common", "type": "consumable", "icon": "Flame"},
    {"id": "leather_strap", "name": "Lanière de Cuir", "rarity": "common", "type": "material", "icon": "Square"},
    {"id": "wooden_shield", "name": "Pavois en Bois", "rarity": "common", "type": "armor", "icon": "Shield"},
    {"id": "copper_ring", "name": "Anneau de Cuivre", "rarity": "common", "type": "accessory", "icon": "Circle"},
    # Rares
    {"id": "silver_amulet", "name": "Amulette d'Argent", "rarity": "rare", "type": "accessory", "icon": "Gem"},
    {"id": "elven_bow", "name": "Arc Elfique", "rarity": "rare", "type": "weapon", "icon": "Crosshair"},
    {"id": "rune_dagger", "name": "Dague Runique", "rarity": "rare", "type": "weapon", "icon": "Swords"},
    {"id": "moonstone", "name": "Pierre de Lune", "rarity": "rare", "type": "material", "icon": "Moon"},
    {"id": "mage_robe", "name": "Robe d'Apprenti Mage", "rarity": "rare", "type": "armor", "icon": "Shirt"},
    {"id": "healing_elixir", "name": "Élixir Curatif", "rarity": "rare", "type": "consumable", "icon": "FlaskRound"},
    {"id": "sage_tome", "name": "Tome du Sage", "rarity": "rare", "type": "tome", "icon": "BookOpen"},
    # Epics
    {"id": "frost_staff", "name": "Bâton de Givre", "rarity": "epic", "type": "weapon", "icon": "Wand"},
    {"id": "shadow_cloak", "name": "Cape des Ombres", "rarity": "epic", "type": "armor", "icon": "Shirt"},
    {"id": "ember_blade", "name": "Lame de Braise", "rarity": "epic", "type": "weapon", "icon": "Flame"},
    {"id": "ancient_compass", "name": "Boussole Ancienne", "rarity": "epic", "type": "accessory", "icon": "Compass"},
    {"id": "void_pendant", "name": "Pendentif du Vide", "rarity": "epic", "type": "accessory", "icon": "Eye"},
    {"id": "warlord_helm", "name": "Heaume du Seigneur de Guerre", "rarity": "epic", "type": "armor", "icon": "Crown"},
    {"id": "trickster_mask", "name": "Masque de l'Escamoteur", "rarity": "epic", "type": "armor", "icon": "Drama"},
    # Legendaries
    {"id": "dragon_scale", "name": "Écaille de Dragon", "rarity": "legendary", "type": "material", "icon": "Shell"},
    {"id": "phoenix_feather", "name": "Plume de Phénix", "rarity": "legendary", "type": "material", "icon": "Feather"},
    {"id": "starforged_blade", "name": "Lame Forgée des Étoiles", "rarity": "legendary", "type": "weapon", "icon": "Sword"},
    {"id": "leviathan_horn", "name": "Corne du Léviathan", "rarity": "legendary", "type": "material", "icon": "Triangle"},
    {"id": "kingmaker_crown", "name": "Couronne du Roi-Faiseur", "rarity": "legendary", "type": "accessory", "icon": "Crown"},
    {"id": "soul_lantern", "name": "Lanterne des Âmes", "rarity": "legendary", "type": "relic", "icon": "Lamp"},
    {"id": "rune_sigil", "name": "Sceau Runique Majeur", "rarity": "legendary", "type": "relic", "icon": "Hexagon"},
    {"id": "world_anchor", "name": "Ancre du Monde", "rarity": "legendary", "type": "relic", "icon": "Anchor"},
    # Mythics
    {"id": "mythic_orb", "name": "Orbe Mythique", "rarity": "mythic", "type": "relic", "icon": "CircleDot"},
    {"id": "titan_gauntlet", "name": "Gantelet du Titan", "rarity": "mythic", "type": "armor", "icon": "Hand"},
    {"id": "void_blade", "name": "Lame du Néant", "rarity": "mythic", "type": "weapon", "icon": "Sword"},
    {"id": "celestial_tome", "name": "Tome Céleste", "rarity": "mythic", "type": "tome", "icon": "BookOpen"},
    # Divines
    {"id": "divine_crown", "name": "Couronne Divine", "rarity": "divine", "type": "relic", "icon": "Crown"},
    {"id": "world_tree_branch", "name": "Branche de l'Arbre-Monde", "rarity": "divine", "type": "relic", "icon": "TreePine"},
    {"id": "godheart", "name": "Cœur d'un Dieu", "rarity": "divine", "type": "relic", "icon": "Heart"},
    # Cosmics
    {"id": "cosmic_shard", "name": "Éclat Cosmique", "rarity": "cosmic", "type": "relic", "icon": "Sparkles"},
    {"id": "star_seed", "name": "Graine d'Étoile", "rarity": "cosmic", "type": "relic", "icon": "Star"},
    {"id": "infinity_loop", "name": "Boucle d'Infini", "rarity": "cosmic", "type": "relic", "icon": "Infinity"},
]

from craft_data import CRAFT_ITEM_TEMPLATES  # noqa: E402

ITEM_TEMPLATES = ITEM_TEMPLATES + CRAFT_ITEM_TEMPLATES


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
