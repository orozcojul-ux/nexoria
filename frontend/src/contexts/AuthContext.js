import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { setToken, getToken, API_URL } from "@/lib/api";

const AUTH_CLOSE_FLAG = "nexoria_tab_closing"; // sessionStorage key

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [banInfo, setBanInfo] = useState(null);

  const setUser = useCallback((u) => {
    if (u?.session_token) setToken(u.session_token);
    setUserState(u);
  }, []);

  const checkAuth = useCallback(async () => {
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }

    // ── Reload detection ────────────────────────────────────────────────────
    // `beforeunload` fires for BOTH close AND refresh.
    // On refresh, sessionStorage persists, so AUTH_CLOSE_FLAG survives.
    // On real close, the browser clears sessionStorage → flag is gone on next open.
    const wasClosing = sessionStorage.getItem(AUTH_CLOSE_FLAG);
    sessionStorage.removeItem(AUTH_CLOSE_FLAG);

    if (wasClosing) {
      // The beforeunload fired (close or refresh) and we have a token.
      // Determine if it was a refresh by checking the navigation type.
      const navEntry = performance?.getEntriesByType?.("navigation")?.[0];
      const isReload = navEntry?.type === "reload";
      if (isReload && getToken()) {
        // Page was refreshed, not closed — cancel the pending session close.
        try { await api.post("/auth/tab-reactivate"); } catch { /* silent */ }
      }
      // If it was NOT a reload but wasClosing existed in sessionStorage,
      // that means the browser kept sessionStorage alive (some browsers do).
      // The server-side 5-second grace period will reject stale closes automatically.
    }
    // ── End reload detection ─────────────────────────────────────────────────

    if (!getToken()) { setLoading(false); return; }
    try {
      const { data } = await api.get("/auth/me");
      setUserState(data);
      setBanInfo(null);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 503 && err?.response?.data?.maintenance) {
        setLoading(false);
        return;
      }
      if (err?.response?.status === 403 && detail?.banned) {
        setBanInfo({
          banned: true,
          reason: detail.reason || "Violation des règles du royaume",
          until: detail.until || null,
        });
        setUserState(null);
      } else {
        console.warn("Auth check failed, clearing token", err?.response?.status);
        setToken(null);
        setUserState(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // ── beforeunload: mark session as closing + send beacon ──────────────────
  // sendBeacon cannot set Authorization headers, so the token is sent in the body.
  useEffect(() => {
    const handleUnload = () => {
      const token = getToken();
      if (!token) return;
      // 1. Mark in sessionStorage: if this was a refresh, the next load detects it
      sessionStorage.setItem(AUTH_CLOSE_FLAG, "1");
      // 2. Tell the server the tab is about to close
      const body = JSON.stringify({ token });
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon?.(`${API_URL}/auth/tab-close`, blob);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  // Heartbeat — keeps session activity fresh for "Sur le site" / staff presence accuracy
  useEffect(() => {
    if (!user?.user_id) return undefined;
    const ping = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      api.post("/auth/heartbeat").catch(() => {});
    };
    ping();
    const id = setInterval(ping, 60000);
    const onVisible = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user?.user_id]);

  // Mise à jour temps réel du portefeuille (Aether, niveau, XP) via WebSocket
  useEffect(() => {
    const handler = (e) => {
      const p = e.detail || {};
      setUserState((prev) => {
        if (!prev) return prev;
        if (p.user_id && p.user_id !== prev.user_id) return prev;
        const next = { ...prev };
        if (p.aether !== undefined) next.aether = p.aether;
        if (p.level !== undefined) next.level = p.level;
        if (p.xp !== undefined) next.xp = p.xp;
        if (p.rank !== undefined) next.rank = p.rank;
        if (p.xp_pct !== undefined) next.xp_pct = p.xp_pct;
        if (p.skill_points !== undefined) next.skill_points = p.skill_points;
        return next;
      });
    };
    window.addEventListener("nexoria:profile:updated", handler);
    return () => window.removeEventListener("nexoria:profile:updated", handler);
  }, []);

  // Sync language preference into auth user (keeps DB + UI in sync)
  useEffect(() => {
    const handler = (e) => {
      const language = e.detail?.language;
      if (!language) return;
      setUserState((prev) => (prev ? { ...prev, language } : prev));
    };
    window.addEventListener("nexoria:language-changed", handler);
    return () => window.removeEventListener("nexoria:language-changed", handler);
  }, []);

  // Si le token change dans un autre onglet (legacy localStorage), resynchroniser
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "nexoria_token") checkAuth();
    };
    const onTokenChanged = () => checkAuth();
    window.addEventListener("storage", onStorage);
    window.addEventListener("nexoria:token-changed", onTokenChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("nexoria:token-changed", onTokenChanged);
    };
  }, [checkAuth]);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUserState(data);
      setBanInfo(null);
      return data;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 503 && err?.response?.data?.maintenance) {
        return null;
      }
      if (err?.response?.status === 403 && detail?.banned) {
        setBanInfo({
          banned: true,
          reason: detail.reason || "Violation des règles du royaume",
          until: detail.until || null,
        });
        setUserState(null);
        return null;
      }
      console.error("Refresh failed", err);
      setUserState(null);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); }
    catch (err) { console.warn("Logout failed", err?.message); }
    setToken(null);
    setUserState(null);
    setBanInfo(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, refresh, logout, checkAuth, banInfo, setBanInfo }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
