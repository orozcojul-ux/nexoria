import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useHeroCard } from "@/contexts/HeroCardContext";
import MaintenanceBootShell from "@/components/maintenance/MaintenanceBootShell";

/** Ancienne route /hero → ouvre sa propre carte héros. */
export default function HeroCardSelfRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openHeroCard } = useHeroCard();

  useEffect(() => {
    if (user?.user_id) {
      openHeroCard(user.user_id);
    }
    navigate("/feed", { replace: true });
  }, [user?.user_id, openHeroCard, navigate]);

  return <MaintenanceBootShell label="Ouverture de la carte héros…" />;
}
