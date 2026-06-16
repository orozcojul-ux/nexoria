/** Prefer custom avatar, then Discord CDN URL from OAuth. */
export function getUserAvatarUrl(user) {
  if (!user) return null;
  return user.avatar_url || user.discord_avatar_url || null;
}
