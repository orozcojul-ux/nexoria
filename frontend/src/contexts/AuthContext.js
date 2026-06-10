import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { setToken, getToken } from "@/lib/api";

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
    if (!getToken()) { setLoading(false); return; }
    try {
      const { data } = await api.get("/auth/me");
      setUserState(data);
      setBanInfo(null);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 403 && detail?.banned) {
        // ban detected — keep user state, show ban screen
        setBanInfo(detail);
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

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUserState(data);
      setBanInfo(null);
      return data;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 403 && detail?.banned) {
        setBanInfo(detail);
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
    <AuthContext.Provider value={{ user, setUser, loading, refresh, logout, checkAuth, banInfo }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
