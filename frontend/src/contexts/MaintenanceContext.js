import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

/** Routes always reachable during maintenance (auth + landing + maintenance page). */
export const MAINTENANCE_PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/maintenance",
  "/auth/discord/callback",
]);

const DEFAULT_STATE = {
  loading: true,
  enabled: false,
  soft_mode: true,
  block_public: false,
  beta_access: false,
};

const MaintenanceContext = createContext(DEFAULT_STATE);

export function MaintenanceProvider({ children }) {
  const [state, setState] = useState(DEFAULT_STATE);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/system/maintenance");
        setState({
          loading: false,
          enabled: Boolean(data.enabled),
          soft_mode: data.soft_mode !== false,
          block_public: Boolean(data.block_public),
          beta_access: Boolean(data.beta_access),
        });
      } catch {
        setState((prev) => ({ ...prev, loading: false, enabled: false }));
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <MaintenanceContext.Provider value={state}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  return useContext(MaintenanceContext);
}

export function isMaintenancePublicRoute(pathname) {
  return MAINTENANCE_PUBLIC_ROUTES.has(pathname);
}
