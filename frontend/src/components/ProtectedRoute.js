import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import MaintenanceBootShell from "@/components/maintenance/MaintenanceBootShell";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <MaintenanceBootShell />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
