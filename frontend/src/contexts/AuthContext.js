import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { setToken, getToken } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((u) => {
    if (u?.session_token) setToken(u.session_token);
    setUserState(u);
  }, []);

  const checkAuth = useCallback(async () => {
    // Skip /me if we're handling Google OAuth callback hash
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUserState(data);
    } catch (err) {
      console.warn("Auth check failed, clearing token", err?.response?.status);
      setToken(null);
      setUserState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUserState(data);
      return data;
    } catch (err) {
      console.error("Refresh failed", err);
      setUserState(null);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.warn("Logout request failed (clearing token anyway)", err?.message);
    }
    setToken(null);
    setUserState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, refresh, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
