import { T } from "./translations";

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

  // ─── Landing status ───
  "landing.status.web_ok": T("Opérationnel", "Operational"),
  "landing.status.db_ok": T("Opérationnelle", "Operational"),
  "landing.status.server": T("Serveur", "Server"),
  "landing.status.database": T("Base de données", "Database"),
  "landing.status.web": T("Web", "Web"),
};
