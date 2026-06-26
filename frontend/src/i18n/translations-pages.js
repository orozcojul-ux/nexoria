import { T } from "./translations.js";

/** Page-level UI strings — inventory, forum, friends, kingdom, etc. */
export const TRANSLATIONS_PAGES = {
  // ─── Common errors ───
  "errors.generic": T("Une erreur est survenue.", "Something went wrong.", {
    es: "Ha ocurrido un error.", de: "Ein Fehler ist aufgetreten.", it: "Si è verificato un errore.",
    pt: "Ocorreu um erro.", nl: "Er is een fout opgetreden.", ja: "エラーが発生しました。",
  }),
  "errors.network": T("Connexion impossible. Réessayez.", "Connection failed. Try again.", {
    es: "Conexión imposible. Inténtalo de nuevo.", de: "Verbindung fehlgeschlagen. Erneut versuchen.",
    it: "Connessione fallita. Riprova.", pt: "Falha na conexão. Tente novamente.",
    nl: "Verbinding mislukt. Probeer opnieuw.", ja: "接続に失敗しました。もう一度お試しください。",
  }),
  "errors.unauthorized": T("Connexion requise.", "Login required.", {
    es: "Inicio de sesión requerido.", de: "Anmeldung erforderlich.", it: "Accesso richiesto.",
    pt: "Login necessário.", nl: "Inloggen vereist.", ja: "ログインが必要です。",
  }),
  "errors.forbidden": T("Accès refusé.", "Access denied.", {
    es: "Acceso denegado.", de: "Zugriff verweigert.", it: "Accesso negato.",
    pt: "Acesso negado.", nl: "Toegang geweigerd.", ja: "アクセスが拒否されました。",
  }),
  "errors.notFound": T("Introuvable.", "Not found.", {
    es: "No encontrado.", de: "Nicht gefunden.", it: "Non trovato.",
    pt: "Não encontrado.", nl: "Niet gevonden.", ja: "見つかりません。",
  }),
  "common.empty": T("Rien à afficher pour le moment.", "Nothing to show yet.", {
    es: "Nada que mostrar por ahora.", de: "Noch nichts anzuzeigen.", it: "Niente da mostrare.",
    pt: "Nada a exibir por enquanto.", nl: "Nog niets om te tonen.", ja: "表示するものがありません。",
  }),
  "common.sending": T("Envoi…", "Sending…", {
    es: "Enviando…", de: "Senden…", it: "Invio…", pt: "Enviando…", nl: "Verzenden…", ja: "送信中…",
  }),
  "common.opening": T("Ouverture…", "Opening…", {
    es: "Abriendo…", de: "Öffnen…", it: "Apertura…", pt: "Abrindo…", nl: "Openen…", ja: "読み込み中…",
  }),

  // ─── Inventory ───
  "inventory.tab.relics": T("Reliques", "Relics"),
  "inventory.tab.cosmetics": T("Cosmétiques", "Cosmetics"),
  "inventory.tab.boosts": T("Élixirs actifs", "Active elixirs"),
  "inventory.tab.consumables": T("Consommables", "Consumables"),
  "inventory.tab.mounts": T("Montures", "Mounts"),
  "inventory.tab.auras": T("Auras", "Auras"),
  "inventory.tab.perks": T("Royaume", "Kingdom"),
  "inventory.guide.title": T("Guide de l'inventaire", "Inventory guide"),
  "inventory.chest.reveal": T("Révélation", "Revelation"),
  "inventory.chest.intro": T("Les brumes s'écartent et révèlent leurs présents...", "The mists part and reveal their gifts..."),
  "inventory.equip.frame": T("Cadre équipé — visible dans le Nexus", "Frame equipped — visible in the Nexus"),
  "inventory.equip.banner": T("Bannière équipée", "Banner equipped"),
  "inventory.equip.aura": T("Aura équipée — visible dans le Nexus", "Aura equipped — visible in the Nexus"),
  "inventory.equip.mount": T("Monture équipée — visible dans le Nexus", "Mount equipped — visible in the Nexus"),
  "inventory.equip.failed": T("Équipement impossible", "Could not equip"),
  "inventory.chest.duplicates": T("Vous possédez déjà toutes ces reliques — {count} Écus restitué.", "You already own these relics — {count} Écus refunded."),
  "inventory.chest.failed": T("Le coffre résiste...", "The chest resists..."),
  "inventory.compact.ok": T("Coffre compacté — {count} doublon(s) fusionné(s).", "Chest compacted — {count} duplicate(s) merged."),
  "inventory.compact.none": T("Aucun doublon à compacter.", "No duplicates to merge."),
  "inventory.compact.failed": T("Compactage impossible", "Could not compact"),
  "inventory.send.title": T("Envoyer des Écus", "Send Écus"),
  "inventory.send.placeholder": T("Pseudo du héros", "Hero username"),
  "inventory.send.note": T("Un petit mot…", "A short note…"),
  "inventory.send.submit": T("Envoyer les Écus", "Send Écus"),
  "inventory.send.invalid": T("Pseudo et montant valides requis", "Valid username and amount required"),
  "inventory.send.failed": T("Envoi impossible", "Could not send"),
  "inventory.username.required": T("Pseudo requis", "Username required"),
  "inventory.gift.failed": T("Don impossible", "Gift failed"),
  "inventory.trade.sent": T("Proposition d'échange envoyée à {name}", "Trade offer sent to {name}"),
  "inventory.trade.failed": T("Échange impossible", "Trade failed"),
  "inventory.item.info": T("Informations sur l'objet", "Item information"),
  "inventory.shop.added": T("« {name} » ajouté à ton inventaire", "« {name} » added to your inventory"),

  // ─── Forum ───
  "forum.loading": T("Ouverture de la Tribune…", "Opening the Forum…"),
  "forum.loadFailed": T("Impossible de charger le forum", "Could not load the forum"),
  "forum.createPost": T("Nouveau sujet", "New topic"),
  "forum.reply": T("Répondre", "Reply"),
  "forum.noPosts": T("Aucun sujet pour le moment.", "No topics yet."),
  "forum.search": T("Rechercher un sujet…", "Search a topic…"),
  "forum.threads": T("Sujets", "Topics"),
  "forum.replies": T("Réponses", "Replies"),
  "forum.views": T("Vues", "Views"),
  "forum.lastActivity": T("Dernière activité", "Last activity"),
  "forum.pinned": T("Épinglé", "Pinned"),
  "forum.locked": T("Verrouillé", "Locked"),
  "forum.publish": T("Publier", "Publish"),
  "forum.titlePlaceholder": T("Titre du sujet", "Topic title"),
  "forum.contentPlaceholder": T("Votre message…", "Your message…"),
  "forum.backCategories": T("Retour aux catégories", "Back to categories"),
  "forum.recent": T("Activité récente", "Recent activity"),

  // ─── Friends ───
  "friends.loadFailed": T("Impossible de charger vos compagnons", "Could not load your companions"),
  "friends.add": T("Ajouter un compagnon", "Add a companion"),
  "friends.requests": T("Demandes reçues", "Incoming requests"),
  "friends.sent": T("Demandes envoyées", "Sent requests"),
  "friends.empty": T("Aucun compagnon pour le moment.", "No companions yet."),
  "friends.searchPlaceholder": T("Pseudo du héros…", "Hero username…"),
  "friends.sendRequest": T("Envoyer une demande", "Send request"),
  "friends.accept": T("Accepter", "Accept"),
  "friends.decline": T("Refuser", "Decline"),
  "friends.remove": T("Retirer", "Remove"),
  "friends.chat": T("Discuter", "Chat"),
  "friends.online": T("En ligne", "Online"),
  "friends.offline": T("Hors ligne", "Offline"),
  "friends.requestSent": T("Demande envoyée", "Request sent"),
  "friends.requestAccepted": T("Compagnon accepté", "Companion accepted"),
  "friends.requestDeclined": T("Demande refusée", "Request declined"),
  "friends.removed": T("Compagnon retiré", "Companion removed"),

  // ─── Kingdom ───
  "kingdom.loading": T("Chargement du royaume…", "Loading kingdom…"),
  "kingdom.upgrade": T("Améliorer", "Upgrade"),
  "kingdom.collect": T("Collecter", "Collect"),
  "kingdom.resources": T("Ressources", "Resources"),
  "kingdom.buildings": T("Bâtiments", "Buildings"),

  // ─── Craft ───
  "craft.recipes": T("Recettes", "Recipes"),
  "craft.craft": T("Forger", "Craft"),
  "craft.materials": T("Matériaux", "Materials"),
  "craft.insufficient": T("Ressources insuffisantes", "Insufficient resources"),
  "craft.success": T("Objet forgé avec succès", "Item crafted successfully"),

  // ─── Skills ───
  "skills.points": T("Points disponibles", "Available points"),
  "skills.allocate": T("Allouer", "Allocate"),
  "skills.tree": T("Constellation", "Constellation"),
  "skills.maxed": T("Compétence au maximum", "Skill maxed"),

  // ─── Leaderboards ───
  "leaderboards.rank": T("Rang", "Rank"),
  "leaderboards.player": T("Héros", "Hero"),
  "leaderboards.score": T("Score", "Score"),
  "leaderboards.season": T("Saison", "Season"),
  "leaderboards.empty": T("Aucun classement pour le moment.", "No rankings yet."),

  // ─── Guilds ───
  "guilds.create": T("Fonder une guilde", "Create a guild"),
  "guilds.join": T("Rejoindre", "Join"),
  "guilds.leave": T("Quitter", "Leave"),
  "guilds.members": T("Membres", "Members"),
  "guilds.deposit": T("Déposer", "Deposit"),
  "guilds.treasury": T("Coffre", "Treasury"),
  "guilds.empty": T("Aucune guilde trouvée.", "No guilds found."),

  // ─── Nexus Online ───
  "nexusOnline.enter": T("Entrer dans le Nexus", "Enter the Nexus"),
  "nexusOnline.playersOnline": T("Héros en ligne", "Heroes online"),
  "nexusOnline.chat": T("Chat", "Chat"),
  "nexusOnline.room": T("Salle", "Room"),
  "nexusOnline.connecting": T("Connexion au Nexus…", "Connecting to the Nexus…"),
  "nexusOnline.disconnected": T("Déconnecté du Nexus", "Disconnected from the Nexus"),

  // ─── Tickets ───
  "tickets.new": T("Nouveau ticket", "New ticket"),
  "tickets.subject": T("Sujet", "Subject"),
  "tickets.message": T("Message", "Message"),
  "tickets.send": T("Envoyer", "Send"),
  "tickets.empty": T("Aucun ticket ouvert.", "No open tickets."),
  "tickets.status.open": T("Ouvert", "Open"),
  "tickets.status.closed": T("Fermé", "Closed"),

  // ─── Under construction ───
  "underConstruction.title": T("Zone en construction", "Under construction"),
  "underConstruction.body": T("Les Sentinelles restaurent cet espace du royaume.", "The Sentinels are restoring this realm area."),
  "underConstruction.back": T("Retour à l'accueil", "Back to home"),

  // ─── Banned ───
  "banned.title": T("Accès suspendu", "Access suspended"),
  "banned.body": T("Votre compte a été suspendu du royaume.", "Your account has been suspended from the realm."),
  "banned.until": T("Jusqu'au {date}", "Until {date}"),
  "banned.reason": T("Motif", "Reason"),

  // ─── Home / feed extras ───
  "home.welcome": T("Bienvenue dans NEXORIA", "Welcome to NEXORIA"),
  "home.welcomeUser": T("Bonjour, {username}", "Hello, {username}"),
  "home.dailyQuests": T("Quêtes du jour", "Daily quests"),
  "home.onlineHeroes": T("Héros en ligne", "Heroes online"),
  "home.realmNews": T("Nouvelles du royaume", "Realm news"),
  "home.quickAccess": T("Accès rapide", "Quick access"),

  // ─── Economy ───
  "economy.ecusCount": T("{count} Écus", "{count} Écus"),
  "economy.ecusCount_one": T("{count} Écu", "{count} Écu"),
  "economy.ecusCount_other": T("{count} Écus", "{count} Écus"),
};
