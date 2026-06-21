import {
  Scroll, ShoppingBag, Sparkles, Castle, Flame, Trophy, CircleDot, Hammer,
} from "lucide-react";

export const HOME_COLORS = {
  bg: "#070711",
  panel: "#0E0D1A",
  panelAlt: "#151225",
  violet: "#7B3FF2",
  cyan: "#38E8FF",
  green: "#3CFF9E",
  gold: "#D6B25E",
  text: "#F4F1FF",
  textMuted: "#A9A3C7",
};

export const CAT_LABELS = {
  event: "pub.news.cat.event",
  update: "pub.news.cat.update",
  community: "pub.news.cat.community",
  announce: "pub.news.cat.announce",
};

export const CAT_BANNERS = {
  event: "/assets/banners/events.webp",
  update: "/assets/banners/admin.webp",
  community: "/assets/banners/guilds.webp",
  announce: "/assets/banners/shop.webp",
};

export const QUICK_LINKS = [
  { to: "/craft", labelKey: "nav.craft", label: "Forge du Nexus", icon: Hammer, color: "#F97316", bg: "rgba(249,115,22,0.14)" },
  { to: "/quests", labelKey: "nav.quests", label: "Quêtes", icon: Scroll, color: HOME_COLORS.violet, bg: "rgba(123,63,242,0.14)" },
  { to: "/shop", labelKey: "nav.shop", label: "Boutique", icon: ShoppingBag, color: HOME_COLORS.gold, bg: "rgba(214,178,94,0.12)" },
  { to: "/nexus-wheel", labelKey: "nav.nexusWheel", label: "Roue du Nexus", icon: CircleDot, color: HOME_COLORS.cyan, bg: "rgba(56,232,255,0.12)" },
  { to: "/oracle", labelKey: "nav.oracle", label: "Genèse", icon: Sparkles, color: HOME_COLORS.cyan, bg: "rgba(56,232,255,0.12)" },
  { to: "/kingdom", labelKey: "nav.kingdom", label: "Royaume", icon: Castle, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  { to: "/events", labelKey: "nav.events", label: "Événements", icon: Flame, color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
];

export const WHEEL_FEATURED = {
  to: "/nexus-wheel",
  category: "Fortune",
  title: "Roue du Nexus",
  description: "Tour gratuit quotidien — Écus, XP, coffres et badges à gagner.",
  image: "/assets/banners/shop.webp",
};

export const CRAFT_FEATURED = {
  to: "/craft",
  category: "Artisanat",
  title: "Forge du Nexus",
  description: "Combinez vos matériaux — Acier sombre, Cristaux, Essences — et forgez des reliques uniques.",
  image: "/assets/banners/shop.webp",
};

export const SHOP_FEATURED = {
  to: "/shop",
  category: "Boutique",
  title: "Boutique",
  description: "Découvre les reliques, pass VIP et trésors exclusifs du Royaume.",
  image: "/assets/banners/shop.webp",
};

export const NEWS_FEATURED_FALLBACK = {
  category: "Actualité",
  title: "Actualités du Royaume",
  description: "Chroniques, annonces et nouvelles du Nexus — revenez bientôt.",
  image: "/assets/banners/admin.webp",
};

export const CHALLENGE_ICON_MAP = {
  MessageSquare: "MessageSquare",
  ScrollText: "ScrollText",
  Sparkles: "Sparkles",
  Castle: "Castle",
  Users: "Users",
  Flame: "Flame",
};

export const fmtNum = (n) => (n == null ? "—" : Number(n).toLocaleString("fr-FR"));
export const fmtScore = (n) => (n == null ? "—" : n > 999 ? `${(n / 1000).toFixed(1)}k` : String(n));
