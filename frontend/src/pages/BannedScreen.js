import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import BanishmentScreen from "@/components/BanishmentScreen";

/** Exclusion globale du site — distincte du ban forum. */
export default function BannedScreen({ banInfo }) {
  const { logout } = useAuth();
  return (
    <BanishmentScreen
      variant="site"
      banInfo={banInfo}
      onLogout={logout}
      testid="banned-screen"
    />
  );
}
