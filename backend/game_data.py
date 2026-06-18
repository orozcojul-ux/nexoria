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
    # ── Mensuelle ──
    {"id": "monthly_grind", "type": "monthly", "name": "Marathonien", "description": "Gagne 5000 XP ce mois (en publiant, réagissant et participant partout sur le site).", "target": 5000, "action": "xp", "xp": 1500, "aether": 800},
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
