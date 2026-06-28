import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMaintenance } from "@/contexts/MaintenanceContext";
import MaintenanceBootShell from "@/components/maintenance/MaintenanceBootShell";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const maint = useMaintenance();
  if (loading || maint.loading) return <MaintenanceBootShell />;
  if (!user) {
    if (maint.enabled) return <Navigate to="/maintenance" replace />;
    return <Navigate to="/login" replace />;
  }
  return children;
}
