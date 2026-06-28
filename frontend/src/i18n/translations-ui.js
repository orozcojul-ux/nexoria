import { T } from "./translations.js";

/** UI strings for pages, widgets, shop, quests, dashboard — merged into I18nContext */
export const TRANSLATIONS_UI = {
  // ─── Quests page ───
  "quests.tab.daily": T("Quotidien", "Daily"),
  "quests.tab.weekly": T("Hebdo", "Weekly"),
  "quests.tab.monthly": T("Mensuel", "Monthly"),
  "quests.stat.total": T("Quêtes", "Quests"),
  "quests.stat.done": T("Accomplies", "Completed"),
  "quests.stat.xp": T("XP gagné", "XP earned"),
  "quests.stat.aether": T("Écus", "Écus"),
  "quests.cycle": T("Cycle", "Cycle"),
  "quests.empty": T("Le tableau est vide pour ce cycle...", "The board is empty for this cycle..."),
  "quests.oracle.title": T("Prophétie de l'Oracle", "Oracle prophecy"),
  "quests.oracle.generate": T("Générer une quête", "Generate a quest"),
  "quests.oracle.loading": T("L'Oracle consulte les étoiles...", "The Oracle reads the stars..."),
  "quests.oracle.error": T("Le parchemin reste vierge...", "The scroll stays blank..."),
  "quests.reward": T("+{xp} XP · +{aether} Écus", "+{xp} XP · +{aether} Écus"),
  "quests.progress": T("Progression", "Progress"),
  "quests.oracle.subtitle": T("Une mission unique générée pour toi.", "A unique mission generated for you."),
  "quests.oracle.writing": T("Écriture...", "Writing..."),
  "quests.oracle.generate_btn": T("Générer", "Generate"),

  // ─── Shop UI ───
  "shop.buy": T("Acheter", "Buy"),
  "shop.owned": T("Acquis", "Owned"),
  "shop.level_required": T("Niv. {level} requis", "Lv. {level} required"),
  "shop.level_insufficient": T("Niv. insuffisant", "Level too low"),
  "shop.cart": T("Panier", "Cart"),
  "shop.cart_empty": T("Panier vide", "Cart empty"),
  "shop.checkout": T("Tout acheter", "Buy all"),
  "shop.inventory_title": T("Mon inventaire boutique", "My shop inventory"),
  "shop.active_boosts": T("Boosts actifs", "Active boosts"),
  "shop.featured": T("À la une", "Featured"),

  // ─── Feed widgets ───
  "feed.dashboard_kicker": T("Tableau de Bord — NEXORIA", "Dashboard — NEXORIA"),
  "feed.greeting_full": T("Bonjour, {{username}} !", "Hello, {{username}}!"),
  "feed.live_badge": T("En direct", "Live"),
  "feed.realm_pulse": T("Pulsation du Royaume", "Realm Pulse"),
  "feed.signups_short": T("Inscriptions", "Signups"),
  "feed.quests_empty": T("Aucune quête active aujourd'hui.", "No active quests today."),
  "feed.top_heroes": T("Top Héros", "Top Heroes"),
  "feed.leaderboard_loading": T("Chargement du classement…", "Loading rankings…"),
  "feed.challenges_title": T("Défis du Royaume", "Realm Challenges"),
  "feed.challenge_tag": T("Défi communautaire", "Community challenge"),
  "feed.challenges_empty": T("Aucun défi communautaire en cours.", "No community challenges active."),
  "feed.all_challenges": T("Tous les défis", "All challenges"),
  "feed.view_profile": T("Voir ma fiche", "View my profile"),
  "feed.default_hero": T("Héros", "Hero"),
  "feed.wheel.kicker": T("Récompense quotidienne", "Daily reward"),
  "feed.wheel.title": T("Roue du Nexus", "Nexus Wheel"),
  "feed.wheel.desc": T("Écus, XP, coffres et trésors cosmiques — un tour gratuit chaque jour.", "Écus, XP, chests and cosmic treasures — one free spin each day."),
  "feed.wheel.desc_vip": T("Écus, XP, coffres et trésors cosmiques — 3 tours VIP par jour.", "Écus, XP, chests and cosmic treasures — 3 VIP spins per day."),
  "feed.wheel.tag_ecus": T("Écus", "Écus"),
  "feed.wheel.tag_xp": T("XP", "XP"),
  "feed.wheel.tag_chests": T("Coffres", "Chests"),
  "feed.wheel.tag_badges": T("Badges", "Badges"),
  "feed.wheel.spins_available": T("{{count}} tours disponibles", "{{count}} spins available"),
  "feed.wheel.spin_ready": T("Tour disponible !", "Spin available!"),
  "feed.wheel.vip_pass": T("Pass Ascendant", "Ascendant Pass"),
  "feed.wheel.spin_cta": T("Lancer la roue", "Spin the wheel"),
  "feed.wheel.view_cta": T("Voir la roue", "View the wheel"),
  "feed.quick_access": T("Accès rapide", "Quick access"),
  "feed.daily_quests": T("Quêtes du jour", "Daily quests"),
  "feed.all_quests": T("Toutes les quêtes", "All quests"),
  "feed.level_short": T("Niv.", "Lv."),
  "feed.xp_label": T("XP", "XP"),
  "feed.aether_label": T("Écus", "Écus"),
  "feed.enter_nexus": T("Entrer dans le Nexus", "Enter the Nexus"),
  "feed.world_map": T("Carte du monde", "World map"),

  // ─── Dashboard / CMS panels ───
  "dashboard.activity": T("Activité en temps réel", "Live activity"),
  "dashboard.no_activity": T("Aucune activité récente", "No recent activity"),
  "dashboard.quick_actions": T("Actions rapides", "Quick actions"),
  "dashboard.class_distribution": T("Répartition des classes", "Class distribution"),
  "dashboard.tag.connection": T("CONNEXION", "CONNECTION"),
  "dashboard.tag.alert": T("ALERTE", "ALERT"),
  "dashboard.posted": T("{name} a publié dans le carrefour", "{name} posted in the square"),
  "dashboard.gm_action": T("Action GM", "GM action"),
  "dashboard.action.broadcast": T("Annonce globale", "Global announce"),
  "dashboard.action.warp": T("Warp joueur", "Warp player"),
  "dashboard.action.freeze": T("Geler joueur", "Freeze player"),
  "dashboard.action.mute": T("Mute", "Mute"),
  "dashboard.action.ban": T("Bannir", "Ban"),
  "dashboard.action.observe": T("Observer", "Observe"),
  "dashboard.action.maintenance": T("Maintenance", "Maintenance"),
  "dashboard.action.gm_logs": T("Logs GM", "GM logs"),

  // ─── Staff dock status ───
  "staff.status.maintenance": T("Maintenance", "Maintenance"),
  "staff.status.nexus_open": T("Nexus ouvert", "Nexus open"),
  "staff.status.nexus_closed": T("Nexus fermé", "Nexus closed"),
  "staff.status.maint_short": T("Maint.", "Maint."),
  "staff.status.on": T("On", "On"),
  "staff.status.off": T("Off", "Off"),

  // ─── Landing mockup nav ───
  "landing.nav.game": T("JEU", "GAME"),
  "landing.nav.community": T("COMMUNAUTÉ", "COMMUNITY"),

  // ─── Admin page extras ───
  "admin.mode_label": T("Mode", "Mode"),
  "admin.edit_hero": T("Modifier", "Edit"),
  "admin.ban_hero": T("Bannir", "Ban"),
  "page.admin.subtitle": T("Centre de contrôle des Sentinelles", "Sentinel control center"),

  // ─── Settings account (common toasts) ───
  "settings.email_updated": T("Email mis à jour", "Email updated"),
  "settings.username_updated": T("Pseudo mis à jour", "Username updated"),
  "settings.password_updated": T("Mot de passe mis à jour", "Password updated"),
  "settings.profile_saved": T("Profil enregistré", "Profile saved"),
  "settings.account_deleted": T("Compte supprimé", "Account deleted"),

  // ─── Class names (display) ───
  "class.mage": T("Mage", "Mage"),
  "class.warrior": T("Guerrier", "Warrior"),
  "class.assassin": T("Assassin", "Assassin"),
  "class.paladin": T("Paladin", "Paladin"),
  "class.alchemist": T("Alchimiste", "Alchemist"),
  "class.explorer": T("Explorateur", "Explorer"),
  "class.necromancer": T("Nécromancien", "Necromancer"),
  "class.architect": T("Architecte", "Architect"),
  "class.chronomancer": T("Chronomancien", "Chronomancer"),
  "class.inventor": T("Inventeur", "Inventor"),

  // ─── Common status / actions ───
  "status.online": T("En ligne", "Online"),

  // ─── Profil ───
  "profile.last_connection": T("Dernière connexion", "Last seen"),
  "profile.last_connection_unknown": T("Dernière connexion inconnue", "Last seen unknown"),

  "time.now": T("À l'instant", "Just now", {
    es: "Ahora", de: "Gerade eben", it: "Adesso", pt: "Agora", nl: "Zojuist", ja: "たった今",
  }),
  "time.minutesAgo": T("Il y a {{count}} min", "{{count}} min ago", {
    es: "Hace {{count}} min", de: "Vor {{count}} Min.", it: "{{count}} min fa",
    pt: "Há {{count}} min", nl: "{{count}} min geleden", ja: "{{count}}分前",
  }),
  "time.hoursAgo": T("Il y a {{count}} h", "{{count}} h ago", {
    es: "Hace {{count}} h", de: "Vor {{count}} Std.", it: "{{count}} h fa",
    pt: "Há {{count}} h", nl: "{{count}} u geleden", ja: "{{count}}時間前",
  }),
  "time.daysAgo": T("Il y a {{count}} j", "{{count}}d ago", {
    es: "Hace {{count}} d", de: "Vor {{count}} T.", it: "{{count}} g fa",
    pt: "Há {{count}} d", nl: "{{count}} d geleden", ja: "{{count}}日前",
  }),
  "time.weeksAgo": T("Il y a {{count}} sem.", "{{count}}w ago", {
    es: "Hace {{count}} sem.", de: "Vor {{count}} Wo.", it: "{{count}} sett. fa",
    pt: "Há {{count}} sem.", nl: "{{count}} w geleden", ja: "{{count}}週間前",
  }),
  "time.unknown": T("Date inconnue", "Unknown date", {
    es: "Fecha desconocida", de: "Unbekanntes Datum", it: "Data sconosciuta",
    pt: "Data desconhecida", nl: "Onbekende datum", ja: "日付不明",
  }),

  "contentTranslate.loading": T("Traduction…", "Translating…", {
    es: "Traduciendo…", de: "Übersetzen…", it: "Traduzione…", pt: "Traduzindo…", nl: "Vertalen…", ja: "翻訳中…",
  }),
  "contentTranslate.autoTranslated": T("Traduit automatiquement", "Auto-translated", {
    es: "Traducido automáticamente", de: "Automatisch übersetzt", it: "Tradotto automaticamente",
    pt: "Traduzido automaticamente", nl: "Automatisch vertaald", ja: "自動翻訳",
  }),
  "contentTranslate.showingOriginal": T("Texte original", "Original text", {
    es: "Texto original", de: "Originaltext", it: "Testo originale", pt: "Texto original", nl: "Originele tekst", ja: "原文",
  }),
  "contentTranslate.showOriginal": T("Voir l'original", "Show original", {
    es: "Ver original", de: "Original anzeigen", it: "Mostra originale", pt: "Ver original", nl: "Origineel tonen", ja: "原文を表示",
  }),
  "contentTranslate.showTranslation": T("Voir la traduction", "Show translation", {
    es: "Ver traducción", de: "Übersetzung anzeigen", it: "Mostra traduzione", pt: "Ver tradução", nl: "Vertaling tonen", ja: "翻訳を表示",
  }),
  "profile.vip_pass": T("Pass Ascendant (VIP)", "Ascendant Pass (VIP)"),
  "common.yes": T("Oui", "Yes"),
  "common.no": T("Non", "No"),
  "nav.admin_panel": T("Centre de contrôle", "Control center"),
  "status.offline": T("Hors ligne", "Offline"),
  "status.locked": T("Verrouillé", "Locked"),
  "status.unlocked": T("Débloqué", "Unlocked"),
  "status.available": T("Disponible", "Available"),
  "status.completed": T("Terminé", "Completed"),
  "status.in_progress": T("En cours", "In progress"),
  "rarity.common": T("Commun", "Common"),
  "rarity.rare": T("Rare", "Rare"),
  "rarity.epic": T("Épique", "Epic"),
  "rarity.legendary": T("Légendaire", "Legendary"),
  "rarity.mythic": T("Mythique", "Mythic"),
  "rarity.divine": T("Divin", "Divine"),
  "rarity.cosmic": T("Cosmique", "Cosmic"),
  "action.validate": T("Valider", "Confirm"),
  "action.equip": T("Équiper", "Equip"),
  "action.use": T("Utiliser", "Use"),
  "action.claim": T("Réclamer", "Claim"),
  "action.send": T("Envoyer", "Send"),
  "action.forge": T("Forger", "Forge"),
  "action.fight": T("Combattre", "Fight"),
  "action.accept": T("Accepter", "Accept"),
  "action.buy": T("Acheter", "Buy"),
  "placeholder.search": T("Rechercher...", "Search..."),
  "placeholder.message": T("Message...", "Message..."),
  "placeholder.reply": T("Écrire une réponse...", "Write a reply..."),
  "placeholder.guild_name": T("Nom de guilde...", "Guild name..."),
  "placeholder.enter_code": T("Entrer un code...", "Enter a code..."),

  // ─── Landing status ───
  "landing.status.web_ok": T("Opérationnel", "Operational"),
  "landing.status.db_ok": T("Opérationnelle", "Operational"),
  "landing.status.server": T("Serveur", "Server"),
  "landing.status.database": T("Base de données", "Database"),
  "landing.status.web": T("Web", "Web"),

  // ─── Site footer ───
  "footer.socials": T("Réseaux sociaux", "Social networks"),
  "footer.useful_links": T("Liens utiles", "Useful links"),
  "footer.help": T("Aide", "Help"),
  "footer.community": T("Communauté", "Community"),
  "footer.support": T("Support", "Support"),
  "footer.terms": T("Conditions", "Terms"),
  "footer.privacy": T("Confidentialité", "Privacy"),
  "footer.copyright_title": T("Copyright Nexoria", "Copyright Nexoria"),
  "footer.rights": T("© {{year}} NEXORIA. Tous droits réservés.", "© {{year}} NEXORIA. All Rights Reserved."),
  "footer.tagline": T("Univers MMORPG social · Forge ta légende", "Social MMORPG universe · Forge your legend"),

  // ─── Feed online heroes ───
  "feed.online_heroes": T("Héros connectés au Royaume", "Heroes connected to the Realm"),
  "feed.online_heroes_empty": T("Aucun héros dans le Nexus Online pour le moment.", "No heroes in Nexus Online right now."),

  // ─── PWA install ───
  "pwa.install.title": T("Installer NEXORIA", "Install NEXORIA", {
    es: "Instalar NEXORIA", de: "NEXORIA installieren", it: "Installa NEXORIA", pt: "Instalar NEXORIA", nl: "NEXORIA installeren", ja: "NEXORIAをインストール",
  }),
  "pwa.install.subtitle": T(
    "Ajoute le royaume à ton écran d'accueil.",
    "Add the realm to your home screen.",
    {
      es: "Añade el reino a tu pantalla de inicio.",
      de: "Füge das Reich zu deinem Startbildschirm hinzu.",
      it: "Aggiungi il regno alla schermata Home.",
      pt: "Adiciona o reino ao teu ecrã inicial.",
      nl: "Voeg het rijk toe aan je startscherm.",
      ja: "王国をホーム画面に追加。",
    },
  ),
  "pwa.install.button": T("Installer", "Install", {
    es: "Instalar", de: "Installieren", it: "Installa", pt: "Instalar", nl: "Installeren", ja: "インストール",
  }),
  "pwa.install.dismiss": T("Fermer", "Close", {
    es: "Cerrar", de: "Schließen", it: "Chiudi", pt: "Fechar", nl: "Sluiten", ja: "閉じる",
  }),
  "pwa.install.waiting": T(
    "Ouvre NEXORIA dans Chrome pour voir l'option d'installation.",
    "Open NEXORIA in Chrome to see the install option.",
    {
      es: "Abre NEXORIA en Chrome para ver la opción de instalación.",
      de: "Öffne NEXORIA in Chrome, um die Installationsoption zu sehen.",
      it: "Apri NEXORIA in Chrome per l'opzione di installazione.",
      pt: "Abre NEXORIA no Chrome para ver a opção de instalação.",
      nl: "Open NEXORIA in Chrome voor de installatieoptie.",
      ja: "ChromeでNEXORIAを開いてインストールオプションを表示。",
    },
  ),
  "pwa.install.ios.button": T("Comment faire sur iPhone", "How to on iPhone", {
    es: "Cómo en iPhone", de: "So geht's auf dem iPhone", it: "Come su iPhone", pt: "Como no iPhone", nl: "Hoe op iPhone", ja: "iPhoneでの方法",
  }),
  "pwa.install.ios.title": T("Ajouter à l'écran d'accueil (iOS)", "Add to Home Screen (iOS)", {
    es: "Añadir a pantalla de inicio (iOS)", de: "Zum Home-Bildschirm (iOS)", it: "Aggiungi a Home (iOS)", pt: "Adicionar ao ecrã inicial (iOS)", nl: "Toevoegen aan startscherm (iOS)", ja: "ホーム画面に追加 (iOS)",
  }),
  "pwa.install.ios.step1": T(
    "Appuie sur Partager en bas de Safari.",
    "Tap Share at the bottom of Safari.",
    {
      es: "Pulsa Compartir en la parte inferior de Safari.",
      de: "Tippe unten in Safari auf Teilen.",
      it: "Tocca Condividi in basso in Safari.",
      pt: "Toca em Partilhar na parte inferior do Safari.",
      nl: "Tik op Delen onderaan in Safari.",
      ja: "Safari下部の共有をタップ。",
    },
  ),
  "pwa.install.ios.step2": T(
    "Choisis « Sur l'écran d'accueil », puis confirme.",
    "Choose « Add to Home Screen », then confirm.",
    {
      es: "Elige « Añadir a pantalla de inicio » y confirma.",
      de: "Wähle « Zum Home-Bildschirm » und bestätige.",
      it: "Scegli « Aggiungi a Home » e conferma.",
      pt: "Escolhe « Adicionar ao ecrã inicial » e confirma.",
      nl: "Kies « Zet op beginscherm » en bevestig.",
      ja: "「ホーム画面に追加」を選んで確認。",
    },
  ),
};
