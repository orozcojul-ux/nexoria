import { getClassImageSrc } from "./badge-assets";

/** Prefer custom avatar, then Discord CDN, then class portrait. */
export function getUserAvatarUrl(user) {
  if (!user) return null;
  if (user.avatar_url) return user.avatar_url;
  if (user.discord_avatar_url) return user.discord_avatar_url;
  return getClassImageSrc(user.class_id);
}
