import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API_URL = `${BASE}/api`;

const api = axios.create({
  baseURL: API_URL,
  // Use Bearer-token auth (cookies blocked by wildcard CORS on credentials)
  withCredentials: false,
});

// Attach session_token from localStorage automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nexoria_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export function setToken(token) {
  if (token) localStorage.setItem("nexoria_token", token);
  else localStorage.removeItem("nexoria_token");
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
