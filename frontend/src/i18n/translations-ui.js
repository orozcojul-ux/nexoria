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
  "profile.last_connection": T("Dernière connexion", "Last seen", {
    es: "Última conexión", de: "Zuletzt gesehen", it: "Ultimo accesso", pt: "Última conexão", nl: "Laatst gezien", ja: "最終ログイン",
  }),
  "profile.last_connection_unknown": T("Dernière connexion inconnue", "Last seen unknown", {
    es: "Última conexión desconocida", de: "Zuletzt gesehen unbekannt", it: "Ultimo accesso sconosciuto", pt: "Última conexão desconhecida", nl: "Laatst gezien onbekend", ja: "最終ログイン不明",
  }),

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
  "contentTranslate.translate": T("Traduire", "Translate", {
    es: "Traducir", de: "Übersetzen", it: "Traduci", pt: "Traduzir", nl: "Vertalen", ja: "翻訳",
  }),
  "contentTranslate.retry": T("Réessayer", "Retry", {
    es: "Reintentar", de: "Erneut versuchen", it: "Riprova", pt: "Tentar novamente", nl: "Opnieuw", ja: "再試行",
  }),
  "contentTranslate.translated": T("Traduit", "Translated", {
    es: "Traducido", de: "Übersetzt", it: "Tradotto", pt: "Traduzido", nl: "Vertaald", ja: "翻訳済み",
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
  "footer.mobile": T("Nexoria sur mobile", "NEXORIA on mobile", {
    es: "NEXORIA en móvil", de: "NEXORIA mobil", it: "NEXORIA su mobile", pt: "NEXORIA no telemóvel", nl: "NEXORIA op mobiel", ja: "モバイル版 NEXORIA",
  }),
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

  // ─── PWA mobile page & tutorial ───
  "pwa.page.kicker": T("Application web", "Web app", {
    es: "App web", de: "Web-App", it: "App web", pt: "App web", nl: "Webapp", ja: "Webアプリ",
  }),
  "pwa.page.title": T("Nexoria sur mobile", "NEXORIA on mobile", {
    es: "NEXORIA en móvil", de: "NEXORIA mobil", it: "NEXORIA su mobile", pt: "NEXORIA no telemóvel", nl: "NEXORIA op mobiel", ja: "モバイル版 NEXORIA",
  }),
  "pwa.page.subtitle": T(
    "Transforme NEXORIA en application sur ton téléphone : accès en un tap, plein écran et chargement plus rapide — sans Play Store ni App Store.",
    "Turn NEXORIA into an app on your phone: one-tap access, full screen and faster loading — no Play Store or App Store required.",
    {
      es: "Convierte NEXORIA en app en tu móvil: acceso con un toque, pantalla completa y carga más rápida — sin Play Store ni App Store.",
      de: "Mach NEXORIA zur App auf deinem Handy: Ein-Tipp-Zugriff, Vollbild und schnelleres Laden — ohne Play Store oder App Store.",
      it: "Trasforma NEXORIA in app sul telefono: accesso con un tap, schermo intero e caricamento più rapido — senza store.",
      pt: "Transforma NEXORIA numa app no telemóvel: acesso com um toque, ecrã inteiro e carregamento mais rápido — sem lojas.",
      nl: "Maak van NEXORIA een app op je telefoon: toegang met één tik, volledig scherm en sneller laden — zonder stores.",
      ja: "NEXORIAをスマホアプリ化：ワンタップ起動、全画面表示、高速読み込み — ストア不要。",
    },
  ),
  "pwa.page.hint": T(
    "Le tutoriel illustré s'ouvre automatiquement avec les étapes pas à pas.",
    "The illustrated tutorial opens automatically with step-by-step instructions.",
    {
      es: "El tutorial ilustrado se abre solo con instrucciones paso a paso.",
      de: "Das illustrierte Tutorial öffnet sich automatisch mit Schritt-für-Schritt-Anleitung.",
      it: "Il tutorial illustrato si apre da solo con istruzioni passo passo.",
      pt: "O tutorial ilustrado abre sozinho com instruções passo a passo.",
      nl: "De geïllustreerde tutorial opent automatisch met stappen.",
      ja: "イラスト付きチュートリアルが自動で開き、手順を案内します。",
    },
  ),
  "pwa.page.hintDetail": T(
    "Chaque étape est accompagnée d'une capture schématique pour t'aider à retrouver les bons boutons sur ton écran.",
    "Each step includes a schematic screenshot to help you find the right buttons on your screen.",
    {
      es: "Cada paso incluye una captura esquemática para encontrar los botones correctos.",
      de: "Jeder Schritt enthält eine schematische Ansicht, damit du die richtigen Schaltflächen findest.",
      it: "Ogni passo include uno schema per trovare i pulsanti giusti sullo schermo.",
      pt: "Cada passo inclui um esquema para encontrares os botões certos no ecrã.",
      nl: "Elke stap bevat een schematische weergave om de juiste knoppen te vinden.",
      ja: "各ステップに画面のボタン位置がわかる模式図付き。",
    },
  ),
  "pwa.page.benefit1.title": T("Accès en un tap", "One-tap access", {
    es: "Acceso con un toque", de: "Ein-Tipp-Zugriff", it: "Accesso con un tap", pt: "Acesso com um toque", nl: "Toegang met één tik", ja: "ワンタップ起動",
  }),
  "pwa.page.benefit1.desc": T(
    "L'icône NEXORIA sur ton écran d'accueil ouvre le royaume directement, comme une vraie application.",
    "The NEXORIA icon on your home screen opens the realm directly, just like a native app.",
    {
      es: "El icono de NEXORIA en tu pantalla de inicio abre el reino directamente, como una app nativa.",
      de: "Das NEXORIA-Symbol auf dem Startbildschirm öffnet das Reich direkt — wie eine native App.",
      it: "L'icona NEXORIA sulla Home apre il regno direttamente, come un'app nativa.",
      pt: "O ícone NEXORIA no ecrã inicial abre o reino diretamente, como uma app nativa.",
      nl: "Het NEXORIA-pictogram op je startscherm opent het rijk direct, net als een native app.",
      ja: "ホーム画面のNEXORIAアイコンから、ネイティブアプリのように直接起動。",
    },
  ),
  "pwa.page.benefit2.title": T("Mode plein écran", "Full-screen mode", {
    es: "Pantalla completa", de: "Vollbildmodus", it: "Schermo intero", pt: "Ecrã inteiro", nl: "Volledig scherm", ja: "全画面モード",
  }),
  "pwa.page.benefit2.desc": T(
    "Plus de barre d'adresse ni d'onglets du navigateur : tu joues dans une interface immersive dédiée.",
    "No browser address bar or tabs — you play in a dedicated immersive interface.",
    {
      es: "Sin barra de direcciones ni pestañas: juegas en una interfaz inmersiva dedicada.",
      de: "Keine Adressleiste oder Tabs — du spielst in einer dedizierten immersiven Oberfläche.",
      it: "Niente barra degli indirizzi o schede: giochi in un'interfaccia immersiva dedicata.",
      pt: "Sem barra de endereços nem separadores: jogas numa interface imersiva dedicada.",
      nl: "Geen adresbalk of tabbladen — je speelt in een dedicated immersieve interface.",
      ja: "アドレスバーやタブなし — 没入感のある専用UIでプレイ。",
    },
  ),
  "pwa.page.benefit3.title": T("Sessions conservées", "Saved sessions", {
    es: "Sesiones guardadas", de: "Gespeicherte Sitzungen", it: "Sessioni salvate", pt: "Sessões guardadas", nl: "Opgeslagen sessies", ja: "セッション保持",
  }),
  "pwa.page.benefit3.desc": T(
    "Retrouve ton héros où tu l'avais laissé : connexion plus fluide et retour rapide au royaume.",
    "Pick up where you left off: smoother login and a quick return to the realm.",
    {
      es: "Retoma donde lo dejaste: inicio de sesión más fluido y vuelta rápida al reino.",
      de: "Mach dort weiter, wo du aufgehört hast: flüssigerer Login und schnelle Rückkehr ins Reich.",
      it: "Riprendi da dove avevi lasciato: accesso più fluido e ritorno rapido al regno.",
      pt: "Continua onde paraste: login mais fluido e regresso rápido ao reino.",
      nl: "Ga verder waar je gebleven was: vlottere login en snelle terugkeer naar het rijk.",
      ja: "前回の続きから：スムーズなログインと素早い復帰。",
    },
  ),
  "pwa.page.openTutorial": T("Voir le tutoriel d'installation", "View install tutorial", {
    es: "Ver tutorial de instalación", de: "Installationsanleitung anzeigen", it: "Vedi guida installazione", pt: "Ver tutorial de instalação", nl: "Installatiehandleiding bekijken", ja: "インストール手順を見る",
  }),
  "pwa.page.backDashboard": T("Retour au tableau de bord", "Back to dashboard", {
    es: "Volver al panel", de: "Zurück zum Dashboard", it: "Torna alla dashboard", pt: "Voltar ao painel", nl: "Terug naar dashboard", ja: "ダッシュボードに戻る",
  }),
  "pwa.page.backHome": T("Retour à l'accueil", "Back to home", {
    es: "Volver al inicio", de: "Zur Startseite", it: "Torna alla home", pt: "Voltar ao início", nl: "Terug naar home", ja: "ホームに戻る",
  }),
  "pwa.tutorial.title": T("Installer NEXORIA sur mobile", "Install NEXORIA on mobile", {
    es: "Instalar NEXORIA en móvil", de: "NEXORIA mobil installieren", it: "Installa NEXORIA su mobile", pt: "Instalar NEXORIA no telemóvel", nl: "NEXORIA op mobiel installeren", ja: "モバイルに NEXORIA をインストール",
  }),
  "pwa.tutorial.subtitle": T(
    "Suis le guide illustré ci-dessous selon ton appareil. Chaque étape montre où appuyer sur ton écran.",
    "Follow the illustrated guide below for your device. Each step shows where to tap on your screen.",
    {
      es: "Sigue la guía ilustrada según tu dispositivo. Cada paso muestra dónde pulsar.",
      de: "Folge der illustrierten Anleitung für dein Gerät. Jeder Schritt zeigt, wo du tippen musst.",
      it: "Segui la guida illustrata per il tuo dispositivo. Ogni passo mostra dove toccare.",
      pt: "Segue o guia ilustrado para o teu dispositivo. Cada passo mostra onde tocar.",
      nl: "Volg de geïllustreerde gids voor je apparaat. Elke stap toont waar je moet tikken.",
      ja: "端末に合わせてイラスト付きガイドに従ってください。各ステップでタップ位置を表示。",
    },
  ),
  "pwa.tutorial.benefitsTitle": T("Pourquoi installer ?", "Why install?", {
    es: "¿Por qué instalar?", de: "Warum installieren?", it: "Perché installare?", pt: "Porquê instalar?", nl: "Waarom installeren?", ja: "インストールのメリット",
  }),
  "pwa.tutorial.benefit1": T(
    "Icône sur l'écran d'accueil — lance NEXORIA comme une app native",
    "Home screen icon — launch NEXORIA like a native app",
    {
      es: "Icono en la pantalla de inicio — abre NEXORIA como app nativa",
      de: "Symbol auf dem Startbildschirm — starte NEXORIA wie eine native App",
      it: "Icona sulla Home — avvia NEXORIA come app nativa",
      pt: "Ícone no ecrã inicial — abre NEXORIA como app nativa",
      nl: "Pictogram op startscherm — start NEXORIA als native app",
      ja: "ホーム画面のアイコン — ネイティブアプリのように起動",
    },
  ),
  "pwa.tutorial.benefit2": T(
    "Interface plein écran sans barre d'adresse du navigateur",
    "Full-screen interface without the browser address bar",
    {
      es: "Interfaz a pantalla completa sin barra de direcciones",
      de: "Vollbild-Oberfläche ohne Browser-Adressleiste",
      it: "Interfaccia a schermo intero senza barra degli indirizzi",
      pt: "Interface em ecrã inteiro sem barra de endereços",
      nl: "Volledig scherm zonder adresbalk van de browser",
      ja: "ブラウザのアドレスバーなしの全画面UI",
    },
  ),
  "pwa.tutorial.benefit3": T(
    "Retour rapide au royaume — ta session est mémorisée",
    "Quick return to the realm — your session is remembered",
    {
      es: "Vuelta rápida al reino — tu sesión se recuerda",
      de: "Schnelle Rückkehr ins Reich — deine Sitzung wird gespeichert",
      it: "Ritorno rapido al regno — la sessione è memorizzata",
      pt: "Regresso rápido ao reino — a sessão fica memorizada",
      nl: "Snelle terugkeer naar het rijk — je sessie wordt onthouden",
      ja: "王国へ素早く復帰 — セッションを保持",
    },
  ),
  "pwa.tutorial.yourDevice": T("Ton appareil", "Your device", {
    es: "Tu dispositivo", de: "Dein Gerät", it: "Il tuo dispositivo", pt: "O teu dispositivo", nl: "Jouw apparaat", ja: "お使いの端末",
  }),
  "pwa.tutorial.android.title": T("Android (Chrome)", "Android (Chrome)", {
    es: "Android (Chrome)", de: "Android (Chrome)", it: "Android (Chrome)", pt: "Android (Chrome)", nl: "Android (Chrome)", ja: "Android (Chrome)",
  }),
  "pwa.tutorial.android.step1": T(
    "Ouvre nexoria-game.fr dans Google Chrome (pas un autre navigateur).",
    "Open nexoria-game.fr in Google Chrome (not another browser).",
    {
      es: "Abre nexoria-game.fr en Google Chrome (no otro navegador).",
      de: "Öffne nexoria-game.fr in Google Chrome (nicht einem anderen Browser).",
      it: "Apri nexoria-game.fr in Google Chrome (non un altro browser).",
      pt: "Abre nexoria-game.fr no Google Chrome (não noutro browser).",
      nl: "Open nexoria-game.fr in Google Chrome (niet een andere browser).",
      ja: "Google Chrome で nexoria-game.fr を開いてください（他のブラウザ不可）。",
    },
  ),
  "pwa.tutorial.android.step2": T(
    "Appuie sur le menu ⋮ en haut à droite, ou sur le bandeau « Installer l'application » s'il apparaît.",
    "Tap the ⋮ menu at the top right, or the « Install app » banner if it appears.",
    {
      es: "Pulsa el menú ⋮ arriba a la derecha, o el banner « Instalar aplicación » si aparece.",
      de: "Tippe oben rechts auf ⋮ oder auf « App installieren », falls angezeigt.",
      it: "Tocca il menu ⋮ in alto a destra, o il banner « Installa app » se compare.",
      pt: "Toca no menu ⋮ no canto superior direito, ou no banner « Instalar app » se aparecer.",
      nl: "Tik rechtsboven op ⋮ of op « App installeren » als die verschijnt.",
      ja: "右上の ⋮ メニュー、または表示された「アプリをインストール」をタップ。",
    },
  ),
  "pwa.tutorial.android.step3": T(
    "Choisis « Installer l'application » ou « Ajouter à l'écran d'accueil », puis confirme.",
    "Choose « Install app » or « Add to Home screen », then confirm.",
    {
      es: "Elige « Instalar aplicación » o « Añadir a pantalla de inicio » y confirma.",
      de: "Wähle « App installieren » oder « Zum Startbildschirm » und bestätige.",
      it: "Scegli « Installa app » o « Aggiungi a Home » e conferma.",
      pt: "Escolhe « Instalar app » ou « Adicionar ao ecrã inicial » e confirma.",
      nl: "Kies « App installeren » of « Toevoegen aan startscherm » en bevestig.",
      ja: "「アプリをインストール」または「ホーム画面に追加」を選んで確認。",
    },
  ),
  "pwa.tutorial.android.s1.title": T("Ouvre le site dans Chrome", "Open the site in Chrome", {
    es: "Abre el sitio en Chrome", de: "Seite in Chrome öffnen", it: "Apri il sito in Chrome", pt: "Abre o site no Chrome", nl: "Open de site in Chrome", ja: "Chromeでサイトを開く",
  }),
  "pwa.tutorial.android.s1.desc": T(
    "Depuis ton téléphone Android, lance Google Chrome et va sur nexoria-game.fr. Firefox, Samsung Internet ou les navigateurs intégrés ne proposent pas toujours l'installation — Chrome est le plus fiable.",
    "On your Android phone, open Google Chrome and go to nexoria-game.fr. Firefox, Samsung Internet or built-in browsers don't always offer install — Chrome is the most reliable.",
    {
      es: "En tu Android, abre Google Chrome y ve a nexoria-game.fr. Otros navegadores no siempre permiten instalar — Chrome es lo más fiable.",
      de: "Öffne auf deinem Android Google Chrome und gehe zu nexoria-game.fr. Andere Browser bieten nicht immer Installation — Chrome ist am zuverlässigsten.",
      it: "Sul tuo Android, apri Google Chrome e vai su nexoria-game.fr. Altri browser non sempre permettono l'installazione — Chrome è il più affidabile.",
      pt: "No teu Android, abre o Google Chrome e vai a nexoria-game.fr. Outros browsers nem sempre permitem instalar — o Chrome é o mais fiável.",
      nl: "Open op je Android Google Chrome en ga naar nexoria-game.fr. Andere browsers bieden niet altijd installatie — Chrome is het betrouwbaarst.",
      ja: "AndroidでGoogle Chromeを開き、nexoria-game.frにアクセス。他ブラウザではインストールできない場合があります — Chromeが最も確実です。",
    },
  ),
  "pwa.tutorial.android.s2.title": T("Ouvre le menu d'installation", "Open the install menu", {
    es: "Abre el menú de instalación", de: "Installationsmenü öffnen", it: "Apri il menu di installazione", pt: "Abre o menu de instalação", nl: "Open het installatiemenu", ja: "インストールメニューを開く",
  }),
  "pwa.tutorial.android.s2.desc": T(
    "En haut à droite, appuie sur les trois points ⋮. Sur certains appareils, un bandeau « Installer l'application » apparaît aussi en bas de l'écran — tu peux l'utiliser directement.",
    "At the top right, tap the three dots ⋮. On some devices, an « Install app » banner also appears at the bottom — you can use it directly.",
    {
      es: "Arriba a la derecha, pulsa los tres puntos ⋮. En algunos dispositivos, un banner « Instalar aplicación » aparece abajo — puedes usarlo directamente.",
      de: "Oben rechts auf die drei Punkte ⋮ tippen. Auf manchen Geräten erscheint unten ein Banner « App installieren » — nutze es direkt.",
      it: "In alto a destra, tocca i tre puntini ⋮. Su alcuni dispositivi compare un banner « Installa app » in basso — puoi usarlo direttamente.",
      pt: "No canto superior direito, toca nos três pontos ⋮. Nalguns dispositivos, um banner « Instalar app » aparece em baixo — podes usá-lo diretamente.",
      nl: "Tik rechtsboven op de drie puntjes ⋮. Op sommige toestellen verschijnt onderaan een banner « App installeren » — gebruik die direct.",
      ja: "右上の ⋮ をタップ。端末によっては下部に「アプリをインストール」バナーが表示されます — そちらでもOK。",
    },
  ),
  "pwa.tutorial.android.s3.title": T("Confirme l'ajout", "Confirm the install", {
    es: "Confirma la instalación", de: "Installation bestätigen", it: "Conferma l'installazione", pt: "Confirma a instalação", nl: "Bevestig installatie", ja: "追加を確認",
  }),
  "pwa.tutorial.android.s3.desc": T(
    "Sélectionne « Installer l'application » ou « Ajouter à l'écran d'accueil », vérifie que le nom affiché est NEXORIA, puis valide. L'icône apparaîtra sur ton écran d'accueil en quelques secondes.",
    "Select « Install app » or « Add to Home screen », check that the name shown is NEXORIA, then confirm. The icon will appear on your home screen within seconds.",
    {
      es: "Elige « Instalar aplicación » o « Añadir a pantalla de inicio », verifica que el nombre sea NEXORIA y confirma. El icono aparecerá en segundos.",
      de: "Wähle « App installieren » oder « Zum Startbildschirm », prüfe den Namen NEXORIA und bestätige. Das Symbol erscheint in Sekunden.",
      it: "Scegli « Installa app » o « Aggiungi a Home », verifica che il nome sia NEXORIA e conferma. L'icona apparirà in pochi secondi.",
      pt: "Escolhe « Instalar app » ou « Adicionar ao ecrã inicial », confirma o nome NEXORIA e valida. O ícone aparecerá em segundos.",
      nl: "Kies « App installeren » of « Toevoegen aan startscherm », controleer de naam NEXORIA en bevestig. Het pictogram verschijnt binnen enkele seconden.",
      ja: "「アプリをインストール」または「ホーム画面に追加」を選び、名前がNEXORIAであることを確認して追加。数秒でアイコンが表示されます。",
    },
  ),
  "pwa.tutorial.ios.s1.title": T("Ouvre Safari", "Open Safari", {
    es: "Abre Safari", de: "Safari öffnen", it: "Apri Safari", pt: "Abre o Safari", nl: "Open Safari", ja: "Safariを開く",
  }),
  "pwa.tutorial.ios.s1.desc": T(
    "Sur iPhone ou iPad, seul Safari permet d'ajouter NEXORIA à l'écran d'accueil. Ouvre nexoria-game.fr dans Safari — pas Chrome, Firefox ou un autre navigateur sur iOS.",
    "On iPhone or iPad, only Safari can add NEXORIA to your home screen. Open nexoria-game.fr in Safari — not Chrome, Firefox or another browser on iOS.",
    {
      es: "En iPhone o iPad, solo Safari permite añadir NEXORIA a la pantalla de inicio. Abre nexoria-game.fr en Safari.",
      de: "Auf iPhone oder iPad kann nur Safari NEXORIA zum Home-Bildschirm hinzufügen. Öffne nexoria-game.fr in Safari.",
      it: "Su iPhone o iPad, solo Safari può aggiungere NEXORIA alla Home. Apri nexoria-game.fr in Safari.",
      pt: "No iPhone ou iPad, só o Safari permite adicionar NEXORIA ao ecrã inicial. Abre nexoria-game.fr no Safari.",
      nl: "Op iPhone of iPad kan alleen Safari NEXORIA toevoegen aan het startscherm. Open nexoria-game.fr in Safari.",
      ja: "iPhone/iPadではSafariのみホーム画面に追加できます。Safariでnexoria-game.frを開いてください。",
    },
  ),
  "pwa.tutorial.ios.s2.title": T("Ajoute à l'écran d'accueil", "Add to Home Screen", {
    es: "Añadir a pantalla de inicio", de: "Zum Home-Bildschirm", it: "Aggiungi a Home", pt: "Adicionar ao ecrã inicial", nl: "Zet op beginscherm", ja: "ホーム画面に追加",
  }),
  "pwa.tutorial.ios.s2.desc": T(
    "Appuie sur Partager en bas de l'écran (carré avec une flèche vers le haut), fais défiler les options et choisis « Sur l'écran d'accueil ». Tu peux renommer le raccourci, puis appuie sur « Ajouter ».",
    "Tap Share at the bottom (square with an upward arrow), scroll the options and choose « Add to Home Screen ». You can rename the shortcut, then tap « Add ».",
    {
      es: "Pulsa Compartir abajo (cuadrado con flecha hacia arriba), desplázate y elige « Añadir a pantalla de inicio ». Renombra si quieres y pulsa « Añadir ».",
      de: "Tippe unten auf Teilen (Quadrat mit Pfeil nach oben), scrolle und wähle « Zum Home-Bildschirm ». Benenne um und tippe « Hinzufügen ».",
      it: "Tocca Condividi in basso (quadrato con freccia su), scorri e scegli « Aggiungi a Home ». Rinomina se vuoi e tocca « Aggiungi ».",
      pt: "Toca em Partilhar em baixo (quadrado com seta para cima), desliza e escolhe « Adicionar ao ecrã inicial ». Renomeia se quiseres e toca « Adicionar ».",
      nl: "Tik onderaan op Delen (vierkant met pijl omhoog), scroll en kies « Zet op beginscherm ». Hernoem indien gewenst en tik « Voeg toe ».",
      ja: "下部の共有（上向き矢印の四角）をタップし、「ホーム画面に追加」を選んで「追加」をタップ。",
    },
  ),
  "pwa.tutorial.ios.s3.title": T("Lance NEXORIA depuis ton écran d'accueil", "Launch NEXORIA from your home screen", {
    es: "Abre NEXORIA desde tu pantalla de inicio", de: "NEXORIA vom Startbildschirm starten", it: "Avvia NEXORIA dalla Home", pt: "Abre NEXORIA a partir do ecrã inicial", nl: "Start NEXORIA vanaf je startscherm", ja: "ホーム画面からNEXORIAを起動",
  }),
  "pwa.tutorial.ios.s3.desc": T(
    "L'icône NEXORIA apparaît sur ton écran d'accueil. Appuie dessus pour ouvrir le royaume en plein écran, sans repasser par Safari.",
    "The NEXORIA icon appears on your home screen. Tap it to open the realm full screen, without going through Safari again.",
    {
      es: "El icono de NEXORIA aparece en tu pantalla de inicio. Pulsa para abrir el reino a pantalla completa, sin volver a Safari.",
      de: "Das NEXORIA-Symbol erscheint auf dem Startbildschirm. Tippe darauf, um das Reich im Vollbild zu öffnen — ohne Safari.",
      it: "L'icona NEXORIA compare sulla Home. Toccala per aprire il regno a schermo intero, senza passare di nuovo da Safari.",
      pt: "O ícone NEXORIA aparece no ecrã inicial. Toca para abrir o reino em ecrã inteiro, sem voltar ao Safari.",
      nl: "Het NEXORIA-pictogram verschijnt op je startscherm. Tik om het rijk volledig scherm te openen, zonder Safari.",
      ja: "ホーム画面にNEXORIAアイコンが表示されます。タップするとSafariを経由せず全画面で起動します。",
    },
  ),
  "pwa.tutorial.ios.title": T("iPhone / iPad (Safari)", "iPhone / iPad (Safari)", {
    es: "iPhone / iPad (Safari)", de: "iPhone / iPad (Safari)", it: "iPhone / iPad (Safari)", pt: "iPhone / iPad (Safari)", nl: "iPhone / iPad (Safari)", ja: "iPhone / iPad (Safari)",
  }),
  "pwa.tutorial.alreadyInstalled": T(
    "NEXORIA semble déjà installée sur cet appareil.",
    "NEXORIA appears to be already installed on this device.",
    {
      es: "NEXORIA parece ya instalada en este dispositivo.",
      de: "NEXORIA scheint auf diesem Gerät bereits installiert zu sein.",
      it: "NEXORIA sembra già installata su questo dispositivo.",
      pt: "NEXORIA parece já instalada neste dispositivo.",
      nl: "NEXORIA lijkt al geïnstalleerd op dit apparaat.",
      ja: "この端末には既に NEXORIA がインストールされているようです。",
    },
  ),
  "pwa.tutorial.note": T(
    "Astuce : sur iPhone, utilise obligatoirement Safari. Sur Android, Chrome est recommandé. Si tu ne vois pas l'option d'installation, vérifie que tu es bien sur nexoria-game.fr et rafraîchis la page.",
    "Tip: on iPhone, you must use Safari. On Android, Chrome is recommended. If you don't see the install option, make sure you're on nexoria-game.fr and refresh the page.",
    {
      es: "Consejo: en iPhone usa Safari obligatoriamente. En Android, Chrome es recomendado. Si no ves la opción, verifica que estás en nexoria-game.fr y recarga.",
      de: "Tipp: auf dem iPhone unbedingt Safari nutzen. Auf Android Chrome empfohlen. Wenn die Option fehlt, prüfe nexoria-game.fr und lade neu.",
      it: "Suggerimento: su iPhone usa obbligatoriamente Safari. Su Android, Chrome è consigliato. Se non vedi l'opzione, verifica nexoria-game.fr e ricarica.",
      pt: "Dica: no iPhone usa obrigatoriamente Safari. No Android, Chrome é recomendado. Se não vires a opção, verifica nexoria-game.fr e atualiza.",
      nl: "Tip: op iPhone verplicht Safari. Op Android Chrome aanbevolen. Zie je geen optie? Controleer nexoria-game.fr en ververs.",
      ja: "ヒント: iPhoneはSafari必須。AndroidはChrome推奨。インストールオプションが見えない場合はnexoria-game.frでページを更新してください。",
    },
  ),
};
