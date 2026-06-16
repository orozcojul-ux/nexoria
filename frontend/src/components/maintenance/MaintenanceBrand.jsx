import React from "react";
import { NexoriaLogoMark } from "@/components/maintenance/NexoriaLogoMark";

export default function MaintenanceBrand({ tagline }) {
  const line = (tagline || "L'ASCENSION COMMENCE").trim();

  return (
    <div className="maint-brand" data-testid="maintenance-brand">
      <div className="maint-brand-mark" aria-hidden>
        <NexoriaLogoMark size={42} />
      </div>
      <div className="min-w-0">
        <div className="maint-brand-name">NEXORIA</div>
        <p className="maint-brand-tagline">{line}</p>
      </div>
    </div>
  );
}
