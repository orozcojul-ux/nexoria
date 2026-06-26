import { getClassImageSrc } from "./badge-assets";

const BACKEND_ORIGIN = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
/** Origine HTTP du backend sans le suffixe /api (ex. http://localhost:8000). */
const STATIC_ORIGIN = BACKEND_ORIGIN.replace(/\/api$/, "");

/** Chemins servis en statique sur la même origine que le site (Nginx ou FastAPI). */
function isSameOriginStaticPath(url) {
  return url.startsWith("/uploads/") || url.startsWith("/assets/");
}

/**
 * Normalise une URL stockée en base (chemins VPS, localhost, slash manquant).
 * Exporté pour les tests et usages ponctuels.
 */
export function normalizeStoredMediaUrl(url) {
  if (!url || typeof url !== "string") return url;
  let s = url.trim().replace(/\\/g, "/");
  if (!s) return s;

  const lower = s.toLowerCase();
  const marker = "/uploads/";
  const idx = lower.indexOf(marker);
  if (idx >= 0) {
    s = s.slice(idx);
  } else if (lower.startsWith("uploads/")) {
    s = `/${s}`;
  }

  s = s.split("?", 1)[0];

  if (/^https?:\/\//i.test(s) && /localhost|127\.0\.0\.1/i.test(s)) {
    try {
      const path = new URL(s).pathname;
      if (path.startsWith("/uploads/") || path.startsWith("/assets/")) return path;
    } catch {
      /* ignore */
    }
  }

  return s;
}

/** Nettoie une URL absolue localhost accidentellement stockée en base. */
function sanitizeStoredAbsoluteUrl(url) {
  const normalized = normalizeStoredMediaUrl(url);
  if (/^https?:\/\//i.test(normalized) && /localhost|127\.0\.0\.1/i.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      if (isSameOriginStaticPath(parsed.pathname)) return parsed.pathname;
    } catch {
      /* ignore */
    }
  }
  return normalized;
}

/**
 * Résout une URL média pour affichage dans le navigateur.
 * - /uploads/... → chemin relatif (prod) ou backend origin (dev CRA)
 * - Ne jamais préfixer /uploads/ avec REACT_APP_BACKEND_URL (/api).
 */
export function resolveMediaUrl(url) {
  if (!url) return null;

  const normalized = normalizeStoredMediaUrl(url);

  if (normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("data:")) {
    return sanitizeStoredAbsoluteUrl(normalized);
  }

  if (isSameOriginStaticPath(normalized)) {
    if (process.env.NODE_ENV === "production") {
      return normalized;
    }
    if (typeof window !== "undefined" && STATIC_ORIGIN && STATIC_ORIGIN !== window.location.origin) {
      return `${STATIC_ORIGIN}${normalized}`;
    }
    return normalized;
  }

  if (normalized.startsWith("/") && STATIC_ORIGIN && typeof window !== "undefined" && STATIC_ORIGIN !== window.location.origin) {
    return `${STATIC_ORIGIN}${normalized}`;
  }

  return normalized;
}

/** Prefer custom avatar, then Discord CDN, then class portrait. */
export function getUserAvatarUrl(user) {
  if (!user) return null;
  if (user.avatar_url) return resolveMediaUrl(user.avatar_url);
  if (user.discord_avatar_url) return user.discord_avatar_url;
  return getClassImageSrc(user.class_id);
}
