import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";

/** Page légale : avec Layout si connecté, sinon shell autonome (LegalDocument gère le footer). */
export default function LegalRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return children;
  if (user) return <Layout>{children}</Layout>;
  return children;
}
