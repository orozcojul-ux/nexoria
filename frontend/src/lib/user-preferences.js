import api from "@/lib/api";

/**
 * Save language/country to MongoDB and sync Discord roles.
 * @returns {Promise<{ discordSyncStatus?: string, discordSync?: object, language?: string, country?: string }>}
 */
export async function updateUserPreferences(patch) {
  const body = {};
  if (patch.language != null) {
    body.language = patch.language;
    body.preferredLanguage = patch.language;
  }
  if (patch.country !== undefined) {
    body.country = patch.country;
  }
  if (patch.country_code !== undefined) {
    body.country_code = patch.country_code;
  }
  const { data } = await api.patch("/users/me/preferences", body);
  return data;
}

export function preferencesSyncToastKey(status) {
  switch (status) {
    case "success":
    case "partial":
      return "settings.preferences.discordSynced";
    case "not_linked":
      return "settings.preferences.discordNotLinked";
    case "sync_disabled":
    case "discord_not_configured":
    case "missing_role_mapping":
    case "missing_permissions":
    case "not_in_guild":
    case "error":
      return "settings.preferences.discordFailed";
    default:
      return "settings.preferences.saved";
  }
}

export function shouldToastDiscordWarning(status) {
  return [
    "missing_permissions",
    "missing_role_mapping",
    "not_in_guild",
    "error",
    "partial",
  ].includes(status);
}
