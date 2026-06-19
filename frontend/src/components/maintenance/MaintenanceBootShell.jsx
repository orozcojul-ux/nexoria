import React from "react";
import "@/styles/maintenance-soft.css";

/** Lightweight loader — never leave a blank screen (Safari mobile). */
export default function MaintenanceBootShell({ label = "Chargement du royaume…" }) {
  return (
    <div className="maint-boot-shell" aria-busy="true" data-testid="maintenance-boot-shell">
      <div className="maint-boot-spinner">{label}</div>
    </div>
  );
}
