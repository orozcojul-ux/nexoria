import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useHeroCard } from "@/contexts/HeroCardContext";
import MaintenanceBootShell from "@/components/maintenance/MaintenanceBootShell";

/** Anciennes URLs /profile/:username → ouvre la carte héros puis retour au feed. */
export default function ProfileCardRedirect() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { openHeroCardByUsername } = useHeroCard();

  useEffect(() => {
    let active = true;
    (async () => {
      await openHeroCardByUsername(username);
      if (active) navigate("/feed", { replace: true });
    })();
    return () => { active = false; };
  }, [username, openHeroCardByUsername, navigate]);

  return <MaintenanceBootShell label="Ouverture de la carte héros…" />;
}
