import React from "react";

/** Encadre visuellement une zone cible (optionnel — réservé extensions futures). */
export default function TutorialHighlight({ active, children, className = "" }) {
  if (!active) return children;
  return (
    <div className={`relative ring-2 ring-amber-400/50 ring-offset-2 ring-offset-[#0c0614] rounded-xl ${className}`}>
      {children}
    </div>
  );
}
