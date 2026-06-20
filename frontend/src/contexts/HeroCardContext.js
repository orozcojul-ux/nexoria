import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { toast } from "sonner";
import api, { getToken } from "@/lib/api";
import HeroCard from "@/components/HeroCard";

const HeroCardContext = createContext(null);

export function HeroCardProvider({ children }) {
  const [userId, setUserId] = useState(null);
  const [open, setOpen] = useState(false);
  const [onWhisper, setOnWhisper] = useState(null);

  const closeHeroCard = useCallback(() => {
    setOpen(false);
    setUserId(null);
    setOnWhisper(null);
  }, []);

  const openHeroCard = useCallback((id, options) => {
    if (!id) return;
    if (!getToken()) {
      toast.error("Connectez-vous pour voir les cartes héros");
      return;
    }
    setUserId(String(id));
    const whisperFn = options?.onWhisper;
    // React traite les fonctions passées à setState comme des updaters —
    // il faut renvoyer la callback via une fonction updater pour la stocker.
    if (typeof whisperFn === "function") {
      setOnWhisper(() => whisperFn);
    } else {
      setOnWhisper(null);
    }
    setOpen(true);
  }, []);

  const openHeroCardByUsername = useCallback(async (username, options) => {
    const name = (username || "").trim();
    if (!name) return;
    if (!getToken()) {
      toast.error("Connectez-vous pour voir les cartes héros");
      return;
    }
    try {
      const { data } = await api.get(`/profile/${encodeURIComponent(name)}`);
      if (data?.hidden) {
        toast.info("Ce profil n'est pas visible.");
        return;
      }
      const uid = data?.profile?.user_id;
      if (!uid) {
        toast.error("Héros introuvable");
        return;
      }
      openHeroCard(uid, options);
    } catch {
      toast.error("Héros introuvable");
    }
  }, [openHeroCard]);

  const value = useMemo(
    () => ({ openHeroCard, openHeroCardByUsername, closeHeroCard }),
    [openHeroCard, openHeroCardByUsername, closeHeroCard],
  );

  return (
    <HeroCardContext.Provider value={value}>
      {children}
      <HeroCard userId={userId} open={open} onClose={closeHeroCard} onWhisper={onWhisper} />
    </HeroCardContext.Provider>
  );
}

export function useHeroCard() {
  const ctx = useContext(HeroCardContext);
  if (!ctx) {
    throw new Error("useHeroCard must be used within HeroCardProvider");
  }
  return ctx;
}
