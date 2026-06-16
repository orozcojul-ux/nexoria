import React from "react";

const YEAR = new Date().getFullYear();

/** Pied de page copyright Nexoria — réutilisable sur toutes les pages. */
export default function NexoriaCopyright({ className = "", compact = false }) {
  return (
    <footer
      className={`text-center ${compact ? "py-3" : "py-5"} ${className}`}
      data-testid="nexoria-copyright"
    >
      <p className={`${compact ? "text-[9px]" : "text-[10px]"} uppercase tracking-[0.35em] text-zinc-600 font-semibold`}>
        © {YEAR} Nexoria — Tous droits réservés
      </p>
      {!compact && (
        <p className="text-[9px] text-zinc-700 mt-1 tracking-widest">
          Univers MMORPG social · Forge ta légende
        </p>
      )}
    </footer>
  );
}
