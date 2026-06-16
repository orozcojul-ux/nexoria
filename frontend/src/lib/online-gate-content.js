import { stripHtml } from "@/lib/stripHtml";
import { resolveMaintenanceText, normalizeMaintenanceHtml } from "@/lib/maintenance-content";

export const DEFAULT_ONLINE_GATE_HTML = {
  brand_name: "NEXORIA",
  brand_tagline: "LA COMMUNAUTÉ AVANT TOUT",
  badge: "Nexus fermé",
  title: "Le Nexus\nse repose",
  body: "Le serveur Nexus n'est pas ouvert en permanence. Les Sentinelles l'ouvrent lors des rassemblements et événements communautaires.",
  body_sub: "Le reste du site reste accessible. Rejoignez le Discord pour la prochaine ouverture.",
  footer: "NEXORIA — Unis dans l'éternité",
  discord_label: "Rejoindre la communauté",
};

export const ONLINE_GATE_HTML_FIELDS = [
  { key: "brand_tagline", label: "Logo — Slogan", hint: "Courte phrase sous le logo", minHeight: 56 },
  { key: "badge", label: "Badge", hint: "Ex. Portes du Nexus fermées", minHeight: 48 },
  { key: "title", label: "Titre principal", hint: "Deux lignes possibles (Entrée = saut de ligne)", minHeight: 80 },
  { key: "body", label: "Message principal", hint: "Explication pour la communauté", minHeight: 100 },
  { key: "body_sub", label: "Sous-message", hint: "Texte secondaire", minHeight: 64 },
  { key: "discord_label", label: "Bouton Discord", hint: "Texte du bouton", minHeight: 48 },
  { key: "footer", label: "Pied de page", hint: "Bas de page", minHeight: 48 },
];

export function normalizeOnlineGateHtml(stored) {
  const merged = { ...DEFAULT_ONLINE_GATE_HTML };
  if (stored && typeof stored === "object") {
    for (const key of Object.keys(DEFAULT_ONLINE_GATE_HTML)) {
      const val = stored[key];
      if (val != null && String(val).trim() !== "") merged[key] = val;
    }
  }
  return normalizeMaintenanceHtml(merged);
}

export function resolveOnlineClosedText(html) {
  return resolveMaintenanceText(normalizeOnlineGateHtml(html));
}
