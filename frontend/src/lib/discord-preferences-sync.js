import api from "@/lib/api";

/** Push site language/country to Discord roles (no-op if Discord not linked). */
export async function syncDiscordPreferences() {
  try {
    await api.post("/discord/sync-preferences");
  } catch {
    // Discord may be unlinked or sync disabled — ignore.
  }
}
