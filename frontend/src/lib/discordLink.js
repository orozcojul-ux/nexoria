import api from "@/lib/api";

export const DISCORD_LINK_INTENT_KEY = "nexoria_discord_link_intent";

export function needsBetaDiscordLink(user) {
  if (!user) return false;
  if (user.discord_linked || user.discord_id) return false;
  if (user.role === "admin" || user.role === "moderator") return false;
  return Boolean(user.needs_discord_link || user.beta_access);
}

export function markDiscordLinkIntent() {
  try {
    sessionStorage.setItem(DISCORD_LINK_INTENT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function consumeDiscordLinkIntent() {
  try {
    const value = sessionStorage.getItem(DISCORD_LINK_INTENT_KEY);
    sessionStorage.removeItem(DISCORD_LINK_INTENT_KEY);
    return value === "1";
  } catch {
    return false;
  }
}

export async function startDiscordLinkOAuth() {
  const { data } = await api.get("/auth/discord/url");
  if (!data?.url) throw new Error("Discord OAuth URL missing");
  markDiscordLinkIntent();
  window.location.href = data.url;
}
