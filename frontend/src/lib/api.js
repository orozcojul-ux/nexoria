import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API_URL = `${BASE}/api`;

// Token en sessionStorage = une session par fenêtre/onglet (multi-comptes possible).
// localStorage n'est plus utilisé pour l'auth afin d'éviter qu'une connexion
// dans une fenêtre écrase le compte d'une autre.
const TOKEN_KEY = "nexoria_token";
// Clé beta = accès testeur pendant la maintenance. Stockée en localStorage
// pour persister entre les onglets/sessions du testeur.
const BETA_KEY = "nexoria_beta_key";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  const beta = getBetaKey();
  if (beta) {
    config.headers = config.headers || {};
    config.headers["X-Beta-Key"] = beta;
  }
  const lang = localStorage.getItem("nexoria_language");
  if (lang) {
    config.headers = config.headers || {};
    config.headers["Accept-Language"] = lang;
  }
  // FormData : laisser le navigateur définir le boundary multipart
  if (config.data instanceof FormData && config.headers) {
    if (typeof config.headers.set === "function") {
      config.headers.set("Content-Type", undefined);
    } else if (typeof config.headers.delete === "function") {
      config.headers.delete("Content-Type");
    } else {
      delete config.headers["Content-Type"];
    }
  }
  return config;
});

export default api;

export function setToken(token) {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
  try {
    window.dispatchEvent(new CustomEvent("nexoria:token-changed", { detail: { hasToken: !!token } }));
  } catch { /* ignore */ }
}

export function setBetaKey(key) {
  if (key) localStorage.setItem(BETA_KEY, key);
  else localStorage.removeItem(BETA_KEY);
}

export function getBetaKey() {
  return localStorage.getItem(BETA_KEY) || "";
}

export function getToken() {
  let token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    const legacy = localStorage.getItem(TOKEN_KEY);
    if (legacy) {
      sessionStorage.setItem(TOKEN_KEY, legacy);
      localStorage.removeItem(TOKEN_KEY);
      token = legacy;
    }
  }
  return token;
}

export function extractBanDetail(err) {
  const detail = err?.response?.data?.detail;
  if (detail && typeof detail === "object" && detail.banned) {
    return {
      banned: true,
      reason: detail.reason || "Violation des règles du royaume",
      until: detail.until || null,
    };
  }
  return null;
}

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (!detail) return err?.message || "Erreur inconnue";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => (e?.msg ? e.msg : JSON.stringify(e))).join(" ");
  }
  if (detail?.banned) {
    return detail.reason || "Vous êtes banni du royaume";
  }
  if (detail?.forum_banned) {
    return detail.reason || "Vous êtes exclu du forum";
  }
  if (detail?.forum_muted) {
    return detail.reason || "Publication forum temporairement désactivée";
  }
  if (typeof detail?.reason === "string") return detail.reason;
  if (detail?.msg) return detail.msg;
  if (typeof detail === "object") {
    return detail.message || "Une erreur est survenue";
  }
  return String(detail);
}
