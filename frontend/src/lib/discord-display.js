/** Display name shown for a linked Discord account on NEXORIA profiles. */
export function getDiscordDisplayName(user) {
  if (!user?.discord_id) return null;
  return user.discord_guild_nick || user.discord_global_name || user.discord_username || null;
}
