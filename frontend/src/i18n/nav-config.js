import {
  LayoutDashboard, Castle, Trophy, UserCheck, Calendar,
  Sword, Gem, ShoppingBag, Eye, Sparkles,
  ScrollText, UserPlus, Settings, Headphones, BookOpen, Gift,
} from "lucide-react";

/** Player sidebar — labels resolved via i18n labelKey */
export function buildPlayerNav() {
  return [
    {
      titleKey: "sidebar.section.main",
      items: [
        { to: "/feed", labelKey: "nav.home", icon: LayoutDashboard, testid: "nav-feed", end: true },
        { to: "/classes", labelKey: "nav.classes", icon: Sword, testid: "nav-classes" },
        { to: "/guilds", labelKey: "nav.guilds", icon: Castle, testid: "nav-guilds" },
        { to: "/leaderboards", labelKey: "nav.rankings", icon: Trophy, testid: "nav-leaderboards" },
        { to: "/events", labelKey: "nav.events", icon: Calendar, testid: "nav-events" },
        { to: "/oracle", labelKey: "nav.oracle", icon: Eye, testid: "nav-oracle" },
      ],
    },
    {
      titleKey: "sidebar.section.community",
      items: [
        { to: "/forum", labelKey: "nav.forum", icon: ScrollText, testid: "nav-forum" },
        { to: "/tickets", labelKey: "nav.tickets", icon: Headphones, testid: "nav-tickets" },
        { to: "/friends", labelKey: "nav.friends", icon: UserPlus, testid: "nav-friends", dynamicBadge: "friends" },
        { to: "/parrainage", labelKey: "nav.referral", icon: Gift, testid: "nav-referral" },
        { openLegend: true, labelKey: "sidebar.guide", icon: BookOpen, testid: "sidebar-guide-btn" },
      ],
    },
    {
      titleKey: "sidebar.section.customize",
      items: [
        { to: "/hero", labelKey: "nav.profile", icon: UserCheck, testid: "nav-hero" },
        { to: "/inventory", labelKey: "nav.inventory", icon: Gem, testid: "nav-inventory" },
        { to: "/quests", labelKey: "nav.quests", icon: Sparkles, testid: "nav-quests" },
      ],
    },
    {
      titleKey: "sidebar.section.shop",
      items: [
        { to: "/shop", labelKey: "nav.shop", icon: ShoppingBag, testid: "nav-shop" },
      ],
    },
  ];
}

/** Public top nav (landing) */
export function buildPublicNav(isLoggedIn) {
  const main = [
    { to: "/", labelKey: "pub.nav.home", icon: LayoutDashboard, public: true },
    { to: isLoggedIn ? "/nexus" : "/login", labelKey: "pub.nav.nexus", icon: Eye, openNexus: isLoggedIn },
    { to: isLoggedIn ? "/hero" : "/login", labelKey: "pub.nav.profile", icon: UserCheck },
    { to: isLoggedIn ? "/inventory" : "/login", labelKey: "pub.nav.inventory", icon: Gem },
    { to: isLoggedIn ? "/hero" : "/login", labelKey: "pub.nav.badges", icon: Trophy },
    { to: "/classes", labelKey: "pub.nav.classes", icon: Sword },
    { to: "/guilds", labelKey: "pub.nav.guilds", icon: Castle },
    { to: "/shop", labelKey: "pub.nav.shop", icon: ShoppingBag },
  ];
  const more = [
    { to: "/events", labelKey: "nav.events", icon: Calendar },
    { to: "/forum", labelKey: "nav.forum", icon: ScrollText },
    { to: "/leaderboards", labelKey: "nav.leaderboards", icon: Trophy },
    { to: "/oracle", labelKey: "nav.oracle", icon: Eye },
  ];
  return { main, more };
}

export const LANDING_FEATURE_CARDS = [
  { key: "nexus", to: "/nexus", icon: "portal", banner: "/assets/banners/world.webp" },
  { key: "hero", to: "/register", icon: "hero", banner: "/assets/banners/classes.webp" },
  { key: "challenge", to: "/events", icon: "swords", banner: "/assets/banners/events.webp" },
  { key: "guilds", to: "/guilds", icon: "shield", banner: "/assets/banners/guilds.webp" },
  { key: "shop", to: "/shop", icon: "chest", banner: "/assets/banners/shop.webp" },
];

export const LANDING_NEWS = [
  { id: 1, catKey: "pub.news.cat.event", date: "2025-05-10", titleKey: "pub.news.1.title", descKey: "pub.news.1.desc", banner: "/assets/banners/events.webp" },
  { id: 2, catKey: "pub.news.cat.update", date: "2025-05-08", titleKey: "pub.news.2.title", descKey: "pub.news.2.desc", banner: "/assets/banners/admin.webp" },
  { id: 3, catKey: "pub.news.cat.community", date: "2025-05-05", titleKey: "pub.news.3.title", descKey: "pub.news.3.desc", banner: "/assets/banners/guilds.webp" },
  { id: 4, catKey: "pub.news.cat.announce", date: "2025-05-01", titleKey: "pub.news.4.title", descKey: "pub.news.4.desc", banner: "/assets/banners/shop.webp" },
];
