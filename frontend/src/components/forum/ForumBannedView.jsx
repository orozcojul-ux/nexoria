import React from "react";
import BanishmentScreen from "@/components/BanishmentScreen";

/** Exclusion du forum uniquement — le reste du site reste accessible. */
export default function ForumBannedView({ banInfo }) {
  return (
    <BanishmentScreen
      variant="forum"
      banInfo={banInfo}
      backTo="/feed"
      backLabel="Retour à l'accueil"
      testid="forum-banned-screen"
    />
  );
}
