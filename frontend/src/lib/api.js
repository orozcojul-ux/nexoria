import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API_URL = `${BASE}/api`;

// SECURITY NOTE: Tokens are stored in localStorage because the deployment ingress
// returns `Access-Control-Allow-Origin: *` which forbids cookie-based auth with
// credentials. To mitigate XSS risk: (1) React auto-escapes user content, (2) we
// never use dangerouslySetInnerHTML on untrusted strings, (3) tokens expire after
// 7 days server-side and can be revoked via /api/auth/logout.
const TOKEN_KEY = "nexoria_token";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (!detail) return err?.message || "Erreur inconnue";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e?.msg ? e.msg : JSON.stringify(e))).join(" ");
  if (detail?.msg) return detail.msg;
  return String(detail);
}
