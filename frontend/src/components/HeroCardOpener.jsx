import React from "react";
import { useHeroCard } from "@/contexts/HeroCardContext";

/** Ouvre la carte héros au clic (remplace les liens /profile et /hero). */
export default function HeroCardOpener({
  username,
  userId,
  children,
  className = "",
  onOpen,
  testid,
  ...rest
}) {
  const { openHeroCard, openHeroCardByUsername } = useHeroCard();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onOpen?.();
    if (userId) {
      openHeroCard(userId);
      return;
    }
    if (username) {
      openHeroCardByUsername(username);
    }
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      data-testid={testid}
      {...rest}
    >
      {children}
    </button>
  );
}
