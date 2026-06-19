import React from "react";
import "@/styles/maintenance-soft.css";

/** Sticky banner — does not block taps on content below (Safari-safe). */
export default function MaintenanceSoftBanner() {
  return (
    <div className="maint-soft-banner" role="status" data-testid="maintenance-soft-banner">
      <p className="maint-soft-banner-text">
        Royaume en maintenance — certaines fonctionnalités peuvent être limitées.
      </p>
    </div>
  );
}
