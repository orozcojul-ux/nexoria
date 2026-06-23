import api, { setBetaKey, setToken } from "@/lib/api";

export const MAINT_DISCORD_FLOW_REGISTER = "register";
export const MAINT_DISCORD_FLOW_BETA = "beta";
const FLOW_KEY = "nexoria_maint_discord_flow_type";
const BETA_KEY_STORAGE = "nexoria_maint_discord_beta_key";

export function clearMaintenanceDiscordFlow() {
  sessionStorage.removeItem(FLOW_KEY);
  sessionStorage.removeItem(BETA_KEY_STORAGE);
}

export function startMaintenanceDiscordOAuth({ flow, betaKey, discordUrl }) {
  if (!discordUrl) {
    throw new Error("Connexion Discord indisponible — réessayez dans quelques secondes.");
  }
  if (flow === MAINT_DISCORD_FLOW_BETA && !betaKey?.trim()) {
    throw new Error("Saisis ta clé bêta avant de te connecter via Discord.");
  }

  clearMaintenanceDiscordFlow();
  sessionStorage.setItem(FLOW_KEY, flow);
  if (flow === MAINT_DISCORD_FLOW_BETA) {
    sessionStorage.setItem(BETA_KEY_STORAGE, betaKey.trim().toUpperCase());
  }

  const w = 500;
  const h = 700;
  const left = Math.max(0, (window.screen.width - w) / 2);
  const top = Math.max(0, (window.screen.height - h) / 2);
  const popupName = flow === MAINT_DISCORD_FLOW_BETA
    ? "discord_oauth_maint_beta"
    : "discord_oauth_maint_register";
  const popup = window.open(
    discordUrl,
    popupName,
    `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,location=0`,
  );

  if (!popup || popup.closed || typeof popup.closed === "undefined") {
    window.location.href = discordUrl;
    return "redirect";
  }
  return "popup";
}

export async function completeMaintenanceDiscordOAuth(code) {
  const flow = sessionStorage.getItem(FLOW_KEY);
  if (!flow) return null;

  try {
    if (flow === MAINT_DISCORD_FLOW_REGISTER) {
      const { data } = await api.post("/auth/maintenance-discord-register", { code });
      return { flow, data };
    }
    if (flow === MAINT_DISCORD_FLOW_BETA) {
      const betaKey = sessionStorage.getItem(BETA_KEY_STORAGE) || "";
      const { data } = await api.post("/auth/maintenance-discord-beta", {
        code,
        beta_key: betaKey,
      });
      if (betaKey) setBetaKey(betaKey);
      return { flow, data };
    }
    return null;
  } finally {
    clearMaintenanceDiscordFlow();
  }
}

export function applyMaintenanceDiscordSession(data, { setUser }) {
  if (data?.session_token) {
    setToken(data.session_token);
    setUser(data);
  }
}

export function shouldRedirectFeedAfterMaintDiscord(data) {
  return Boolean(data?.redirect_feed || data?.beta_access);
}
