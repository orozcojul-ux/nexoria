import { stripHtml } from "@/lib/stripHtml";

/** Textes par défaut — affichés proprement sur la page */
export const DEFAULT_MAINTENANCE_TEXT = {
  brand_name: "NEXORIA",
  brand_tagline: "L'ASCENSION COMMENCE",
  badge: "Maintenance en cours",
  title_line1: "Royaume en maintenance",
  title_line2: "",
  body: "NEXORIA se prépare. Le Nexus rouvrira bientôt ses portes.",
  body_sub: "Merci pour votre patience et votre soutien.",
  footer: "NEXORIA — Unis dans l'éternité",
  discord_label: "Rejoindre Discord",
};

/** Valeurs HTML stockées en base (admin) — utilisées comme source de texte */
export const DEFAULT_MAINTENANCE_HTML = {
  brand_name: "NEXORIA",
  brand_tagline: "L'ASCENSION COMMENCE",
  badge: "Maintenance en cours",
  title: "Royaume en maintenance",
  body: "NEXORIA se prépare. Le Nexus rouvrira bientôt ses portes.",
  body_sub: "Merci pour votre patience et votre soutien.",
  footer: "NEXORIA — Unis dans l'éternité",
  discord_label: "Rejoindre Discord",
};

export const MAINTENANCE_HTML_FIELDS = [
  { key: "brand_tagline", label: "Logo — Slogan", hint: "Courte phrase sous le logo NEXORIA", minHeight: 56 },
  { key: "badge", label: "Badge (haut droite)", hint: "Ex. Maintenance en cours", minHeight: 48 },
  { key: "title", label: "Titre principal", hint: "Deux lignes possibles (Entrée = saut de ligne)", minHeight: 80 },
  { key: "body", label: "Message principal", hint: "Description visible par les joueurs", minHeight: 100 },
  { key: "body_sub", label: "Sous-message", hint: "Texte secondaire en italique", minHeight: 64 },
  { key: "discord_label", label: "Bouton Discord", hint: "Texte du bouton", minHeight: 48 },
  { key: "footer", label: "Pied de page", hint: "Bas de page", minHeight: 48 },
];

export function mergeMaintenanceHtml(stored) {
  const merged = { ...DEFAULT_MAINTENANCE_HTML };
  if (!stored || typeof stored !== "object") return merged;
  for (const key of Object.keys(DEFAULT_MAINTENANCE_HTML)) {
    const val = stored[key];
    if (val != null && String(val).trim() !== "") merged[key] = val;
  }
  return merged;
}

/** Nettoie le contenu stocké (HTML legacy → texte simple) */
export function normalizeMaintenanceHtml(stored) {
  const merged = mergeMaintenanceHtml(stored);
  return {
    brand_name: stripHtml(merged.brand_name).slice(0, 40) || DEFAULT_MAINTENANCE_HTML.brand_name,
    brand_tagline: stripHtml(merged.brand_tagline).slice(0, 80) || DEFAULT_MAINTENANCE_HTML.brand_tagline,
    badge: stripHtml(merged.badge).slice(0, 60) || DEFAULT_MAINTENANCE_HTML.badge,
    title: stripHtml(merged.title, { preserveBreaks: true }).slice(0, 200) || DEFAULT_MAINTENANCE_HTML.title,
    body: stripHtml(merged.body).slice(0, 500) || DEFAULT_MAINTENANCE_HTML.body,
    body_sub: stripHtml(merged.body_sub).slice(0, 300) || DEFAULT_MAINTENANCE_HTML.body_sub,
    footer: stripHtml(merged.footer).slice(0, 120) || DEFAULT_MAINTENANCE_HTML.footer,
    discord_label: stripHtml(merged.discord_label).slice(0, 60) || DEFAULT_MAINTENANCE_HTML.discord_label,
  };
}

export const DEFAULT_MAINTENANCE_SYSTEMS = {
  database: { label: "Base de données", status: "maintenance", progress: 50 },
  site: { label: "Site", status: "maintenance", progress: 30 },
  server: { label: "Serveur Online", status: "maintenance", progress: 10 },
};

export function normalizeMaintenanceSystems(stored) {
  const out = {};
  for (const [key, def] of Object.entries(DEFAULT_MAINTENANCE_SYSTEMS)) {
    const row = stored?.[key] || {};
    const progress = Number(row.progress);
    out[key] = {
      label: stripHtml(row.label).slice(0, 80) || def.label,
      status: ["operational", "sync", "maintenance", "offline"].includes(row.status) ? row.status : def.status,
      progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : def.progress,
    };
  }
  return out;
}

function parseMaintenanceTitle(raw) {
  const clean = stripHtml(raw, { preserveBreaks: true });
  const lines = clean.split("\n").map((s) => s.trim()).filter(Boolean);
  if (lines.length >= 2) {
    return { line1: lines[0], line2: lines.slice(1).join(" ") };
  }
  const single = lines[0] || "";
  if (/du\s+nexus/i.test(single)) {
    return {
      line1: single.replace(/\s*du\s+nexus\s*/i, "").trim() || DEFAULT_MAINTENANCE_TEXT.title_line1,
      line2: "du Nexus",
    };
  }
  return {
    line1: single || DEFAULT_MAINTENANCE_TEXT.title_line1,
    line2: DEFAULT_MAINTENANCE_TEXT.title_line2,
  };
}

/** Convertit le contenu admin en textes propres pour la page publique */
export function resolveMaintenanceText(html) {
  const clean = normalizeMaintenanceHtml(html);
  const { line1, line2 } = parseMaintenanceTitle(clean.title);

  return {
    brand_name: DEFAULT_MAINTENANCE_TEXT.brand_name,
    brand_tagline: clean.brand_tagline || DEFAULT_MAINTENANCE_TEXT.brand_tagline,
    badge: clean.badge || DEFAULT_MAINTENANCE_TEXT.badge,
    title_line1: line1,
    title_line2: line2,
    body: clean.body || DEFAULT_MAINTENANCE_TEXT.body,
    body_sub: clean.body_sub || DEFAULT_MAINTENANCE_TEXT.body_sub,
    footer: clean.footer || DEFAULT_MAINTENANCE_TEXT.footer,
    discord_label: clean.discord_label || DEFAULT_MAINTENANCE_TEXT.discord_label,
  };
}
