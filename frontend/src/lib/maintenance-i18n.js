import {
  DEFAULT_MAINTENANCE_HTML,
  DEFAULT_MAINTENANCE_SYSTEMS,
  normalizeMaintenanceHtml,
  parseMaintenanceTitleFromClean,
} from "@/lib/maintenance-content";

/** Map known French API messages to i18n keys. */
const API_ERROR_KEYS = {
  "Identifiants invalides": "maintenance.error.invalid_credentials",
  "Identifiants invalides.": "maintenance.error.invalid_credentials",
  "Clé beta invalide": "maintenance.error.invalid_beta_key",
  "Clé beta requise": "maintenance.error.beta_key_required",
  "Clé déjà utilisée": "maintenance.error.beta_key_used",
  "Cette clé n'est pas assignée à votre compte": "maintenance.error.beta_key_not_assigned",
  "Compte déjà activé": "maintenance.error.already_activated",
  "Email déjà utilisé": "maintenance.error.email_taken",
  "Pseudo déjà pris": "maintenance.error.username_taken",
  "Erreur serveur": "maintenance.error.server",
  "Connexion Discord impossible": "maintenance.error.discord",
  "URL Discord non disponible — réessayez dans quelques secondes": "maintenance.error.discord_url",
};

const API_SUCCESS_KEYS = {
  "Compte créé avec succès. Rejoins le Discord et propose-toi au bêta test pour recevoir une clé d'accès.": "maintenance.success.account_created",
  "Accès bêta activé. Bienvenue dans le Nexus.": "maintenance.success.beta_activated",
  "Compte créé via Discord.": "maintenance.success.account_discord",
};

export function translateMaintenanceApiError(t, detail) {
  const raw = typeof detail === "string" ? detail.trim() : "";
  if (!raw) return t("maintenance.error.server");
  const key = API_ERROR_KEYS[raw];
  return key ? t(key) : raw;
}

export function translateMaintenanceApiSuccess(t, message) {
  const raw = typeof message === "string" ? message.trim() : "";
  if (!raw) return "";
  const key = API_SUCCESS_KEYS[raw];
  return key ? t(key) : raw;
}

function fieldOrTranslation(apiVal, defaultFr, key, t) {
  const val = (apiVal || "").trim();
  if (val && val !== defaultFr) return val;
  return t(key);
}

/** Hero/footer texts — i18n defaults when admin content matches French defaults. */
export function resolveMaintenanceTextI18n(html, t) {
  const clean = normalizeMaintenanceHtml(html);
  const titleRaw = clean.title || DEFAULT_MAINTENANCE_HTML.title;
  const defaultTitle = DEFAULT_MAINTENANCE_HTML.title;
  let titleLine1;
  let titleLine2;
  if (titleRaw.trim() === defaultTitle.trim()) {
    titleLine1 = t("maintenance.title_line1");
    titleLine2 = t("maintenance.title_line2");
  } else {
    const parsed = parseMaintenanceTitleFromClean(titleRaw);
    titleLine1 = parsed.line1;
    titleLine2 = parsed.line2;
  }

  return {
    brand_name: "NEXORIA",
    brand_tagline: fieldOrTranslation(clean.brand_tagline, DEFAULT_MAINTENANCE_HTML.brand_tagline, "maintenance.brand_tagline", t),
    badge: fieldOrTranslation(clean.badge, DEFAULT_MAINTENANCE_HTML.badge, "maintenance.badge", t),
    title_line1: titleLine1,
    title_line2: titleLine2,
    body: fieldOrTranslation(clean.body, DEFAULT_MAINTENANCE_HTML.body, "maintenance.body", t),
    body_sub: fieldOrTranslation(clean.body_sub, DEFAULT_MAINTENANCE_HTML.body_sub, "maintenance.body_sub", t),
    footer: fieldOrTranslation(clean.footer, DEFAULT_MAINTENANCE_HTML.footer, "maintenance.footer", t),
    discord_label: fieldOrTranslation(clean.discord_label, DEFAULT_MAINTENANCE_HTML.discord_label, "maintenance.discord.cta", t),
  };
}

export function resolveMaintenanceSystemsI18n(stored, t) {
  const out = {};
  for (const [key, def] of Object.entries(DEFAULT_MAINTENANCE_SYSTEMS)) {
    const row = stored?.[key] || {};
    const progress = Number(row.progress);
    const labelKey = `maintenance.system.${key}`;
    const apiLabel = (row.label || "").trim();
    out[key] = {
      label: apiLabel && apiLabel !== def.label ? apiLabel : t(labelKey),
      status: row.status || def.status,
      progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : def.progress,
    };
  }
  return out;
}

export function formatMaintRelativeTime(iso, t, fmtDate) {
  if (!iso) return t("maintenance.time.just_now");
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return t("maintenance.time.recently");
  const diffMin = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (diffMin < 1) return t("maintenance.time.just_now");
  if (diffMin < 60) return t("maintenance.time.min_ago", { n: diffMin });
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return t("maintenance.time.hours_ago", { n: hours });
  return fmtDate(iso);
}
