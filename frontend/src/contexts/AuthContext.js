import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import api, { setToken, getToken, API_URL } from "@/lib/api";

const AUTH_CLOSE_FLAG = "nexoria_tab_closing"; // sessionStorage key
const IDLE_MINUTES = 15;
const IDLE_MS = IDLE_MINUTES * 60 * 1000;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [banInfo, setBanInfo] = useState(null);
  const lastActivityRef = useRef(Date.now());

  const setUser = useCallback((u) => {
    if (u?.session_token) setToken(u.session_token);
    setUserState(u);
    if (u?.session_token) {
      window.dispatchEvent(new CustomEvent("nexoria:auth-login", {
        detail: { user_id: u.user_id, last_seen: u.last_seen, username: u.username },
      }));
    }
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
      if (process.env.NODE_ENV === "development") {
        console.log("Current user class:", data?.class, data?.classe, data?.character_class, data?.class_id, data?.class_name);
      }
      setUserState(data);
      setBanInfo(null);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const status = err?.response?.status;
      if (status === 503 && err?.response?.data?.maintenance) {
        // Soft maintenance: keep token, let the user retry / stay on public routes.
        setLoading(false);
        return;
      }
      if (status === 401 || status === 403) {
        if (status === 403 && detail?.banned) {
          setBanInfo({
            banned: true,
            reason: detail.reason || "Violation des règles du royaume",
            until: detail.until || null,
          });
          setUserState(null);
        } else if (status === 401) {
          setToken(null);
          setUserState(null);
        }
      } else if (!err?.response) {
        // Network error (Safari offline, timeout) — do not wipe the session.
        console.warn("Auth check network error", err?.message);
      } else {
        console.warn("Auth check failed", status);
        setToken(null);
        setUserState(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // ── Browser/tab close: mark session as closing + send beacon ─────────────
  // `beforeunload` works on desktop ; `pagehide` is the reliable signal on
  // iOS/iPad/Android (where beforeunload often doesn't fire). sendBeacon cannot
  // set Authorization headers, so the token is sent in the body.
  useEffect(() => {
    const signalClose = () => {
      const token = getToken();
      if (!token) return;
      sessionStorage.setItem(AUTH_CLOSE_FLAG, "1");
      const blob = new Blob([JSON.stringify({ token })], { type: "application/json" });
      navigator.sendBeacon?.(`${API_URL}/auth/tab-close`, blob);
    };
    const onPageHide = (e) => {
      // persisted=true → page is going into the bfcache (mobile app-switch), not a close.
      if (e.persisted) return;
      signalClose();
    };
    const onPageShow = (e) => {
      // Restored from bfcache (came back to the tab) → cancel any pending close.
      if (e.persisted && getToken()) {
        sessionStorage.removeItem(AUTH_CLOSE_FLAG);
        api.post("/auth/tab-reactivate").catch(() => {});
      }
    };
    window.addEventListener("beforeunload", signalClose);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("beforeunload", signalClose);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  // ── Heartbeat + idle auto-logout ─────────────────────────────────────────
  // The heartbeat only fires while the page is visible AND the user has
  // interacted recently. When the user is idle (or the browser is closed),
  // heartbeats stop → the server-side idle timeout closes the session, and the
  // client below logs out locally. Works identically on iPad, mobile and PC.
  useEffect(() => {
    if (!user?.user_id) return undefined;

    const markActivity = () => { lastActivityRef.current = Date.now(); };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((ev) => window.addEventListener(ev, markActivity, { passive: true }));
    const onVisible = () => { if (document.visibilityState === "visible") markActivity(); };
    document.addEventListener("visibilitychange", onVisible);

    const ping = () => {
      if (document.visibilityState === "hidden") return;
      if (Date.now() - lastActivityRef.current > IDLE_MS) return;
      api.post("/auth/heartbeat").catch(() => {});
    };
    ping();
    const pingId = setInterval(ping, 45000);

    const idleId = setInterval(async () => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor < IDLE_MS) return;
      clearInterval(pingId);
      clearInterval(idleId);
      try { await api.post("/auth/logout"); } catch { /* session may already be gone */ }
      setToken(null);
      setUserState(null);
      toast.info(`Session fermée après ${IDLE_MINUTES} min d'inactivité.`);
      window.location.href = "/login";
    }, 15000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, markActivity));
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(pingId);
      clearInterval(idleId);
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
      if (err?.response?.status === 401) {
        setToken(null);
        setUserState(null);
      } else if (err?.response?.status === 403 && detail?.banned) {
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

    try {
      const { data } = await api.get("/maintenance/status");
      if (data.enabled && !data.beta_access) {
        window.location.replace("/maintenance");
        return "/maintenance";
      }
    } catch {
      /* MaintenanceGate handles redirect on next navigation */
    }
    return "/";
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, refresh, logout, checkAuth, banInfo, setBanInfo }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
