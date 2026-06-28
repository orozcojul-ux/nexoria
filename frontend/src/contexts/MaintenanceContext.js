import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

/** Routes reachable during maintenance (OAuth callback + maintenance page only). */
export const MAINTENANCE_BYPASS_ROUTES = new Set([
  "/maintenance",
  "/auth/discord/callback",
  "/conditions",
  "/confidentialite",
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
        const { data } = await api.get("/maintenance/status");
        setState({
          loading: false,
          enabled: Boolean(data.enabled),
          soft_mode: data.soft_mode !== false,
          block_public: Boolean(data.block_public),
          beta_access: Boolean(data.beta_access),
        });
      } catch {
        // API indisponible — ne pas bloquer le site (évite écran blanc / lock total).
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

export function isMaintenanceBypassRoute(pathname) {
  return MAINTENANCE_BYPASS_ROUTES.has(pathname);
}

/** @deprecated use isMaintenanceBypassRoute */
export function isMaintenancePublicRoute(pathname) {
  return isMaintenanceBypassRoute(pathname);
}
