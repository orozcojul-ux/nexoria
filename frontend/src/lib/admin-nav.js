import {
  Users, Ban, ScrollText, MessageSquare, Megaphone,
  Newspaper,
  ShoppingBag, Calendar, Coins, Plug, Hammer, BookOpen, Shield,
  Ticket, Activity, MessagesSquare, Flag, TrendingUp, UserCircle2,
} from "lucide-react";

/** Admin tab metadata — labels via i18n admin.tab.* */
export const ADMIN_TAB_KEYS = {
  pulse: "admin.tab.pulse",
  users: "admin.tab.users",
  tickets: "admin.tab.tickets",
  reports: "admin.tab.reports",
  bans: "admin.tab.bans",
  roles: "admin.tab.roles",
  broadcast: "admin.tab.broadcast",
  chat: "admin.tab.chat",
  logs: "admin.tab.logs",
  "forum-mod": "admin.tab.forum_mod",
  moderation: "admin.tab.moderation",
  shop: "admin.tab.shop",
  news: "admin.tab.news",
  team: "admin.tab.team",
  events: "admin.tab.events",
  seasons: "admin.tab.seasons",
  grant: "admin.tab.grant",
  economy: "admin.tab.economy",
  discord: "admin.tab.discord",
  system: "admin.tab.system",
  legend: "admin.tab.legend",
};

const VALID_TABS = new Set(Object.keys(ADMIN_TAB_KEYS));

/** Ordre d'affichage des onglets (sidebar + mobile). */
export const ADMIN_TAB_ORDER = [
  "pulse",
  "users",
  "tickets",
  "roles",
  "reports",
  "bans",
  "moderation",
  "forum-mod",
  "broadcast",
  "chat",
  "logs",
  "shop",
  "news",
  "team",
  "events",
  "seasons",
  "grant",
  "economy",
  "system",
  "discord",
  "legend",
];

export function isValidAdminTab(tab) {
  return VALID_TABS.has(tab);
}

export function adminHref(tab = "pulse") {
  return tab === "pulse" ? "/admin" : `/admin?tab=${tab}`;
}

export function buildAdminSidebarNav({ isAdmin }) {
  const item = (tab, labelKey, icon, testid, extra = {}) => ({
    to: adminHref(tab),
    labelKey,
    icon,
    testid,
    adminTab: tab,
    ...extra,
  });

  const sections = [
    {
      titleKey: "sidebar.section.dashboard",
      items: [
        item("pulse", "admin.tab.pulse", Activity, "nav-cms-pulse"),
      ],
    },
    {
      titleKey: "sidebar.section.players",
      items: [
        item("users", "admin.tab.users", Users, "nav-cms-players"),
        item("tickets", "admin.tab.tickets", Ticket, "nav-cms-tickets"),
        ...(isAdmin ? [item("roles", "admin.tab.roles", Shield, "nav-cms-roles")] : []),
      ],
    },
    {
      titleKey: "sidebar.section.moderation",
      items: [
        item("reports", "admin.tab.reports", Flag, "nav-cms-reports", { dynamicBadge: "open_reports" }),
        item("bans", "admin.tab.bans", Ban, "nav-cms-sanctions"),
        item("moderation", "admin.tab.moderation", Shield, "nav-cms-moderation", { dynamicBadge: "naria_pending" }),
        item("forum-mod", "admin.tab.forum_mod", MessagesSquare, "nav-cms-forum-mod"),
      ],
    },
    {
      titleKey: "sidebar.section.comms",
      items: [
        ...(isAdmin ? [item("broadcast", "admin.tab.broadcast", Megaphone, "nav-cms-broadcast")] : []),
        item("chat", "admin.tab.chat", MessageSquare, "nav-cms-chat"),
        item("logs", "admin.tab.logs", ScrollText, "nav-cms-logs"),
      ],
    },
    {
      titleKey: "sidebar.section.content",
      items: [
        ...(isAdmin ? [
          item("shop", "admin.tab.shop", ShoppingBag, "nav-cms-shop"),
          item("news", "admin.tab.news", Newspaper, "nav-cms-news"),
          item("team", "admin.tab.team", UserCircle2, "nav-cms-team"),
          item("events", "admin.tab.events", Calendar, "nav-cms-events"),
          item("seasons", "admin.tab.seasons", Calendar, "nav-cms-seasons"),
          item("grant", "admin.tab.grant", Coins, "nav-cms-grant"),
          item("economy", "admin.tab.economy", TrendingUp, "nav-cms-economy"),
        ] : []),
      ],
    },
    {
      titleKey: "sidebar.section.system",
      items: [
        ...(isAdmin ? [
          item("system", "admin.tab.system", Hammer, "nav-cms-system"),
          item("discord", "admin.tab.discord", Plug, "nav-cms-discord"),
        ] : []),
        item("legend", "admin.tab.legend", BookOpen, "nav-cms-legend"),
      ],
    },
  ];

  return sections.filter((s) => s.items.length > 0);
}

export function buildPlayerAdminShortcuts({ isAdmin }) {
  const shortcuts = [
    { tab: "pulse", labelKey: "admin.tab.pulse", icon: Activity, testid: "nav-admin-pulse" },
    { tab: "users", labelKey: "admin.tab.users", icon: Users, testid: "nav-admin-users" },
    { tab: "tickets", labelKey: "admin.tab.tickets", icon: Ticket, testid: "nav-admin-tickets" },
    { tab: "reports", labelKey: "admin.tab.reports", icon: Flag, testid: "nav-admin-reports" },
    { tab: "bans", labelKey: "admin.tab.bans", icon: Ban, testid: "nav-admin-bans" },
    { tab: "moderation", labelKey: "admin.tab.moderation", icon: Shield, testid: "nav-admin-moderation" },
    { tab: "forum-mod", labelKey: "admin.tab.forum_mod", icon: MessagesSquare, testid: "nav-admin-forum" },
  ];
  if (isAdmin) {
    shortcuts.push({ tab: "shop", labelKey: "admin.tab.shop", icon: ShoppingBag, testid: "nav-admin-shop" });
  }
  return shortcuts.map((s) => ({
    ...s,
    to: adminHref(s.tab),
    adminTab: s.tab,
  }));
}

export function getActiveAdminTab(search) {
  const params = new URLSearchParams(search);
  const raw = params.get("tab") || "pulse";
  const tab = raw === "overview" ? "pulse" : raw;
  return isValidAdminTab(tab) ? tab : "pulse";
}

export const MOD_TABS = new Set(["pulse", "users", "tickets", "reports", "bans", "moderation", "chat", "forum-mod", "logs", "legend"]);

export function resolveAdminTab(tab, isAdmin) {
  const normalized = tab === "overview" ? "pulse" : tab;
  const resolved = isValidAdminTab(normalized) ? normalized : "pulse";
  if (isAdmin) return resolved;
  return MOD_TABS.has(resolved) ? resolved : "pulse";
}

/** Liste ordonnée des onglets visibles pour le sélecteur mobile. */
export function getVisibleAdminTabs(isAdmin) {
  return ADMIN_TAB_ORDER.filter((id) => isAdmin || MOD_TABS.has(id));
}

/** Resolve admin tab label with t() */
export function adminTabLabel(tab, t) {
  const key = ADMIN_TAB_KEYS[tab === "overview" ? "pulse" : tab];
  return key ? t(key) : tab;
}

export const ADMIN_TAB_META = Object.fromEntries(
  Object.entries(ADMIN_TAB_KEYS).map(([tab, labelKey]) => [tab, { labelKey }]),
);
