import { getClassImageSrc } from "./badge-assets";

const BACKEND_ORIGIN = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
/** Origine HTTP du backend sans le suffixe /api (ex. http://localhost:8000). */
const STATIC_ORIGIN = BACKEND_ORIGIN.replace(/\/api$/, "");

/** Chemins servis en statique sur la même origine que le site (Nginx ou FastAPI). */
function isSameOriginStaticPath(url) {
  return url.startsWith("/uploads/") || url.startsWith("/assets/");
}

/** Nettoie une URL absolue localhost accidentellement stockée en base. */
function sanitizeStoredAbsoluteUrl(url) {
  if (process.env.NODE_ENV !== "production") return url;
  if (!/localhost|127\.0\.0\.1/i.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (isSameOriginStaticPath(parsed.pathname)) return parsed.pathname;
  } catch {
    /* ignore */
  }
  return url;
}

/**
 * Résout une URL média pour affichage dans le navigateur.
 * - /uploads/... → chemin relatif (prod) ou backend origin (dev CRA)
 * - Ne jamais préfixer /uploads/ avec REACT_APP_BACKEND_URL (/api).
 */
export function resolveMediaUrl(url) {
  if (!url) return null;

  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return sanitizeStoredAbsoluteUrl(url);
  }

  if (isSameOriginStaticPath(url)) {
    if (process.env.NODE_ENV === "production") {
      return url;
    }
    if (typeof window !== "undefined" && STATIC_ORIGIN && STATIC_ORIGIN !== window.location.origin) {
      return `${STATIC_ORIGIN}${url}`;
    }
    return url;
  }

  if (url.startsWith("/") && STATIC_ORIGIN && typeof window !== "undefined" && STATIC_ORIGIN !== window.location.origin) {
    return `${STATIC_ORIGIN}${url}`;
  }

  return url;
}

/** Prefer custom avatar, then Discord CDN, then class portrait. */
export function getUserAvatarUrl(user) {
  if (!user) return null;
  if (user.avatar_url) return resolveMediaUrl(user.avatar_url);
  if (user.discord_avatar_url) return user.discord_avatar_url;
  return getClassImageSrc(user.class_id);
}
