import api from "@/lib/api";

export const DISCORD_LINK_INTENT_KEY = "nexoria_discord_link_intent";
export const DISCORD_LINK_LOGIN_KEY = "nexoria_discord_link_login";
export const DISCORD_LINK_PASSWORD_KEY = "nexoria_discord_link_password";

export function needsBetaDiscordLink(user, { maintenanceEnabled = false } = {}) {
  if (!maintenanceEnabled) return false;
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

export function storeDiscordLinkCredentials({ login, password }) {
  try {
    if (login?.trim()) sessionStorage.setItem(DISCORD_LINK_LOGIN_KEY, login.trim());
    if (password) sessionStorage.setItem(DISCORD_LINK_PASSWORD_KEY, password);
  } catch {
    /* ignore */
  }
}

export function consumeDiscordLinkCredentials() {
  try {
    const login = sessionStorage.getItem(DISCORD_LINK_LOGIN_KEY) || "";
    const password = sessionStorage.getItem(DISCORD_LINK_PASSWORD_KEY) || "";
    sessionStorage.removeItem(DISCORD_LINK_LOGIN_KEY);
    sessionStorage.removeItem(DISCORD_LINK_PASSWORD_KEY);
    if (!login || !password) return null;
    return { login, password };
  } catch {
    return null;
  }
}

export async function startDiscordLinkOAuth({ login, password } = {}) {
  const { data } = await api.get("/auth/discord/url");
  if (!data?.url) throw new Error("Discord OAuth URL missing");
  markDiscordLinkIntent();
  if (login && password) {
    storeDiscordLinkCredentials({ login, password });
  }
  window.location.href = data.url;
}
