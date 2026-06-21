import { getClassImageSrc } from "./badge-assets";

const BACKEND_ORIGIN = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");

/** Résout une URL média relative (/uploads/…) ou absolue. */
export function resolveMediaUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  if (url.startsWith("/") && BACKEND_ORIGIN) {
    return `${BACKEND_ORIGIN}${url}`;
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
