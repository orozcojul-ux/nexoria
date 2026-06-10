import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#030305] flex items-center justify-center">
      <div className="text-cyan-400 font-mono animate-pulse">Chargement...</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
