import React from "react";
import { useI18n } from "@/i18n/LanguageProvider";
import "@/styles/maintenance-soft.css";

/** Lightweight loader — never leave a blank screen (Safari mobile). */
export default function MaintenanceBootShell({ label }) {
  const { t } = useI18n();
  const text = label || t("maintenance.boot");

  return (
    <div className="maint-boot-shell" aria-busy="true" data-testid="maintenance-boot-shell">
      <div className="maint-boot-spinner">{text}</div>
    </div>
  );
}
