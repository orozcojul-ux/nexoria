import { Cloud, CloudLightning, CloudRain, Sparkles, Sun } from "lucide-react";

export const WEATHER_LABEL = {
  clear: { fr: "Ciel clair", icon: Sun, color: "text-yellow-300" },
  rain: { fr: "Pluie", icon: CloudRain, color: "text-blue-300" },
  storm: { fr: "Orage", icon: CloudLightning, color: "text-purple-300" },
  eclipse: { fr: "Éclipse", icon: Cloud, color: "text-zinc-300" },
  aurora: { fr: "Aurore", icon: Sparkles, color: "text-cyan-300" },
};

export const GM_TABS = [
  { id: "player", label: "Joueur" },
  { id: "world", label: "Monde" },
  { id: "broadcast", label: "Annonces" },
  { id: "logs", label: "Logs" },
];
