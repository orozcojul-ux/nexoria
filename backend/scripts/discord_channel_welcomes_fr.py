"""Messages de bienvenue Discord en français (reorganize_discord_guild.py)."""


def channel_welcomes(site_url: str) -> dict[str, dict]:
    return {
        "1514271114405216359": {
            "title": "🌟 Bienvenue sur Nexoria",
            "description": (
                "Le portail du royaume t'ouvre ses portes.\n\n"
                "• Lis le **règlement** avant de t'aventurer\n"
                "• Consulte les **annonces** pour ne rien manquer\n"
                "• Rejoins l'aventure sur le site et forge ta légende\n\n"
                f"🔗 **Site :** {site_url}"
            ),
            "color": 0x7C3AED,
        },
        "1514271110101995651": {
            "title": "📜 Règlement du royaume",
            "description": (
                "**Respect & communauté**\n"
                "Traite chaque héros avec respect. Aucune discrimination, harcèlement ou spam.\n\n"
                "**Contenu**\n"
                "Pas de contenu illégal, NSFW ou toxique. Reste dans l'univers fantasy de Nexoria.\n\n"
                "**Jeu fair-play**\n"
                "Pas de triche, d'exploit ou d'abus de bugs. Signale-les au Conseil.\n\n"
                "**Discord ↔ Site**\n"
                "Ton pseudo Discord et ton héros Nexoria doivent rester cohérents. "
                "Les sanctions Discord peuvent impacter ton compte site."
            ),
            "color": 0xC9A565,
        },
        "1514271112136228864": {
            "title": "📢 Annonces officielles",
            "description": (
                "Salon réservé aux **annonces officielles** de l'équipe Nexoria.\n\n"
                "Mises à jour majeures, événements, maintenance, nouveautés boutique… "
                "Active les notifications pour ne rien manquer."
            ),
            "color": 0x22D3EE,
        },
        "1514271204481962146": {
            "title": "❓ FAQ — Questions fréquentes",
            "description": (
                "**Comment créer mon héros ?**\n"
                f"Inscris-toi sur {site_url} et choisis ta classe.\n\n"
                "**Comment lier Discord ?**\n"
                "Paramètres → Compte → Connecter Discord.\n\n"
                "**C'est quoi les Éclats ?**\n"
                "La monnaie du royaume — gagnée en jouant ou via la boutique.\n\n"
                "**Pass Ascendant (VIP) ?**\n"
                "Avantages premium : boutique exclusive, bonus XP/Éclats, salon VIP…"
            ),
            "color": 0xA78BFA,
        },
        "1514271116582191158": {
            "title": "🗺️ Lore du monde",
            "description": (
                "Plonge dans l'histoire de **Nexoria** : royaumes, failles dimensionnelles, "
                "Ordre du Nexus et légendes des héros.\n\n"
                "Partage tes théories, découvertes et récits ici."
            ),
            "color": 0x6B7280,
        },
        "1514271118532411565": {
            "title": "📖 Classes & races",
            "description": (
                "Dix classes, dix destins : Mage, Guerrier, Assassin, Paladin, Alchimiste, "
                "Explorateur, Nécromancien, Architecte, Chronomancien, Inventeur.\n\n"
                "Discute builds, synergies et changements de classe. "
                "Ton ADN de profil reflète ta classe sur le site."
            ),
            "color": 0xF59E0B,
        },
        "1514271120415658115": {
            "title": "🎭 Création de personnage",
            "description": (
                "Conseils pour forger ton héros : biographie, citation, histoire, "
                "couleur d'accent et liens sociaux sur ton profil public.\n\n"
                "Montre ta création et inspire les autres voyageurs."
            ),
            "color": 0xEC4899,
        },
        "1514271180268240977": {
            "title": "🔮 Paroles de l'Oracle",
            "description": (
                "L'Oracle du Nexus murmure ici. Pose tes questions sur le destin, "
                "les quêtes et les prophéties du royaume.\n\n"
                "Consulte aussi l'Oracle IA directement sur le site."
            ),
            "color": 0x8B5CF6,
        },
        "1514271122412146739": {
            "title": "🏅 Rôles & titres",
            "description": (
                "Salon **automatique** — chaque montée de niveau d'un héros y est annoncée.\n\n"
                "Les paliers de progression (Novice → Élu Cosmique) se synchronisent "
                "avec tes rôles Discord. Continue l'aventure sur le site !"
            ),
            "color": 0x4ADE80,
        },
        "1515325507208745080": {
            "title": "🌌 Chroniques du Nexus",
            "description": (
                "Flux automatique de l'activité majeure du royaume : "
                "connexions, inscriptions, déconnexions et renommages de héros.\n\n"
                "Chaque ligne reflète l'activité en direct sur NEXORIA."
            ),
            "color": 0x6366F1,
        },
        "1514271126694662387": {
            "title": "🏙️ Hub central",
            "description": (
                "Place publique du royaume — discussions générales, entraide, "
                "stratégies et convivialité entre héros.\n\n"
                "Le fil d'actualité principal vit sur le site ; ici, c'est la taverne du Nexus."
            ),
            "color": 0x0EA5E9,
        },
        "1514271132667347055": {
            "title": "📊 XP & progression",
            "description": (
                "Salon **automatique** — gains d'XP, Éclats, réputation, badges, "
                "achats boutique et récompenses de quêtes.\n\n"
                "Chaque exploit sur le site peut y laisser une trace."
            ),
            "color": 0x10B981,
        },
        "1514271130557612052": {
            "title": "🎒 Inventaire & échanges",
            "description": (
                "Salon **automatique** — échanges d'objets et cadeaux entre joueurs conclus sur le site.\n\n"
                "Les reliques VIP ne peuvent pas être transférées à un non-VIP."
            ),
            "color": 0xF97316,
        },
        "1514271140338470932": {
            "title": "🌀 Failles dimensionnelles",
            "description": (
                "Salon **automatique** — alertes quand une faille s'ouvre dans le royaume.\n\n"
                "Connecte-toi vite sur le site pour réclamer les récompenses avant la fermeture !"
            ),
            "color": 0xA855F7,
        },
        "1514271154213355540": {
            "title": "🏰 Guildes & alliances",
            "description": (
                "Ordres, alliances et politique inter-guildes.\n\n"
                "Crée ou rejoins une guilde sur le site — coffre commun, quêtes et prestige collectif."
            ),
            "color": 0x78716C,
        },
        "1514271156042203377": {
            "title": "📋 Recrutement guildes",
            "description": (
                "Publie ton annonce de recrutement ou trouve un ordre digne de ton épée.\n\n"
                "Précise ta classe, ton niveau et tes objectifs."
            ),
            "color": 0x57534E,
        },
        "1514271167785996360": {
            "title": "📅 Agenda des événements",
            "description": (
                "Calendrier des événements Nexoria — raids, tournois, quêtes collectives.\n\n"
                "Consulte aussi la page **Événements** sur le site pour le programme à jour."
            ),
            "color": 0xEF4444,
        },
        "1514271172647325768": {
            "title": "🎯 Défis hebdomadaires",
            "description": (
                "Défis et quêtes de la semaine. Partage ta progression et celle de ton ordre.\n\n"
                "Les récompenses sont distribuées à tous les héros une fois l'objectif collectif atteint."
            ),
            "color": 0xDC2626,
        },
        "1514271191094001765": {
            "title": "🖼️ Fan-art Nexoria",
            "description": "Partage tes créations artistiques inspirées de l'univers Nexoria. Crédite les artistes et respecte le droit d'auteur.",
            "color": 0xDB2777,
        },
        "1514271194508034049": {
            "title": "🎮 Captures & clips",
            "description": "Screenshots épiques, clips de gameplay et moments mémorables du royaume.",
            "color": 0x2563EB,
        },
        "1517470910427168770": {
            "title": "📝 Inscriptions Beta — Conseil uniquement",
            "description": (
                "**Salon privé du Conseil (Sages).**\n\n"
                "Les candidatures soumises via le formulaire de la page maintenance "
                "apparaissent ici automatiquement.\n\n"
                "**Rappel aux testeurs :** le beta actuel = **site web uniquement**. "
                "**Nexus Online n'est pas développé.**\n\n"
                "• Valide ou refuse dans l'admin site\n"
                "• Envoie la clé beta au candidat retenu\n"
                "• **100 places** au total"
            ),
            "color": 0x7C3AED,
        },
        "1517470908476821575": {
            "title": "🧪 Beta test — Remontées de bugs",
            "description": (
                "Salon **réservé aux Beta testeurs** et au staff.\n\n"
                "**⚠️ Périmètre du beta actuel**\n"
                "Pour l'instant, le test porte **uniquement sur le site web Nexoria** "
                "(inscription, profil, forum, boutique, quêtes…).\n\n"
                "**Nexus Online** (monde virtuel / MMO) **n'est pas du tout développé** — "
                "aucune zone ni gameplay n'y est disponible.\n\n"
                "Signale ici les bugs **du site** avec : étapes, navigateur, capture si possible."
            ),
            "color": 0x8B5CF6,
        },
        "1517470912256016534": {
            "title": "👑 Salon VIP — Pass Ascendant",
            "description": (
                "Espace exclusif des détenteurs du **Pass Ascendant**.\n\n"
                "Boutique VIP, bonus de parrainage, quêtes exclusives et entraide premium."
            ),
            "color": 0xF59E0B,
        },
        "1514271209272115200": {
            "title": "🛡️ Staff général",
            "description": "Coordination de l'équipe — Gardien Suprême, Sages et Sentinelle.",
            "color": 0x1F2937,
        },
        "1514271211679650013": {
            "title": "📋 Logs modération",
            "description": "Journal des actions de modération forum, tickets et sanctions.",
            "color": 0x374151,
        },
        "1514271214607007935": {
            "title": "⚙️ Config bot & RPG",
            "description": "Configuration technique du bot Discord et des intégrations site ↔ serveur.",
            "color": 0x4B5563,
        },
        "1514271217077452962": {
            "title": "📊 Statistiques serveur",
            "description": "Métriques, croissance et tableaux de bord internes.",
            "color": 0x6B7280,
        },
    }
