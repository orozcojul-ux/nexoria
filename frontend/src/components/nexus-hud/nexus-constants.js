import {
  Globe2, Hash, Shield, UserPlus, Briefcase, Zap,
  Sun, CloudRain, CloudLightning, Cloud, Sparkles,
} from "lucide-react";

export const WEATHER_LABEL = {
  clear: { fr: "Ciel clair", icon: Sun, tone: "gold" },
  rain: { fr: "Pluie", icon: CloudRain, tone: "cyan" },
  storm: { fr: "Orage", icon: CloudLightning, tone: "violet" },
  eclipse: { fr: "Éclipse", icon: Cloud, tone: "muted" },
  aurora: { fr: "Aurore", icon: Sparkles, tone: "cyan" },
};

export const CHANNEL_CONFIG = {
  global: { fr: "Global", icon: Globe2, tone: "cyan" },
  room: { fr: "Salle", icon: Hash, tone: "violet" },
  guild: { fr: "Guilde", icon: Shield, tone: "emerald" },
  whisper: { fr: "Chuchotement", icon: UserPlus, tone: "pink" },
  trade: { fr: "Commerce", icon: Briefcase, tone: "gold" },
  event: { fr: "Événement", icon: Zap, tone: "violet" },
};

export const QUICK_EMOJIS = [
  "😀", "😂", "🥲", "😎", "🤔", "😡", "❤️", "💜", "💛",
  "🔥", "⚔️", "🛡️", "✨", "💎", "👑", "🎉", "👍", "👎", "🙏", "💀",
];

export const MAP_GROUP_LABELS = {
  center: { fr: "Cœur du Nexus", tone: "cyan" },
  social: { fr: "Sanctuaires sociaux", tone: "emerald" },
  combat: { fr: "Arènes & combats", tone: "danger" },
  knowledge: { fr: "Savoir & archives", tone: "gold" },
  mystic: { fr: "Mystique & éther", tone: "violet" },
  adventure: { fr: "Terres lointaines", tone: "orange" },
  restricted: { fr: "Zones scellées", tone: "gold" },
};

export const MAP_GROUP_ORDER = ["center", "social", "combat", "knowledge", "mystic", "adventure", "restricted"];
