import React from "react";

const BASE = process.env.PUBLIC_URL || "";
/** Image principale (salle du trône) + repli sur l'ancien fond si absente. */
const HALL_URL = `${BASE}/assets/backgrounds/nexoria-hall.png`;
const FALLBACK_URL = `${BASE}/assets/backgrounds/nexoria-bg.webp`;

/**
 * Fond global Nexoria — wallpaper CONSTANT quel que soit le thème.
 * Le thème ne change que les contours/accents (var --nx-border / --nx-accent),
 * pas le fond d'écran. Voile sombre neutre léger juste pour la lisibilité.
 */
export default function SiteBackground({ variant = "app" }) {
  const veil = variant === "landing" ? 0.35 : 0.45;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
      data-testid="site-background"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url(${HALL_URL}), url(${FALLBACK_URL})` }}
      />
      {/* Voile sombre neutre (non teinté par le thème) pour garder le texte lisible */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, rgba(6,7,16,${veil}) 0%, rgba(4,5,13,${veil + 0.1}) 100%)`,
        }}
      />
      {/* Vignette douce sur les bords */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 38%, transparent 45%, rgba(3,4,12,0.6) 100%)" }}
      />
    </div>
  );
}
