import React, { useEffect, useState } from "react";
import { useI18n } from "@/i18n/LanguageProvider";

function remainingMs(openAt) {
  const target = new Date(openAt).getTime();
  if (Number.isNaN(target)) return null;
  return target - Date.now();
}

export default function MaintenanceCountdown({ openAt }) {
  const { t } = useI18n();
  const [ms, setMs] = useState(() => (openAt ? remainingMs(openAt) : null));

  useEffect(() => {
    if (!openAt) {
      setMs(null);
      return undefined;
    }
    setMs(remainingMs(openAt));
    const id = setInterval(() => setMs(remainingMs(openAt)), 1000);
    return () => clearInterval(id);
  }, [openAt]);

  if (!openAt || ms === null) return null;

  const isOpen = ms <= 0;
  const total = Math.max(0, ms);
  const units = [
    { value: Math.floor(total / 86400000), label: t("maintenance.countdown.days") },
    { value: Math.floor((total % 86400000) / 3600000), label: t("maintenance.countdown.hours") },
    { value: Math.floor((total % 3600000) / 60000), label: t("maintenance.countdown.min") },
    { value: Math.floor((total % 60000) / 1000), label: t("maintenance.countdown.sec") },
  ];

  return (
    <div className="maint-countdown" data-testid="maintenance-countdown">
      <span className="maint-countdown-label">
        {isOpen ? t("maintenance.countdown.open_soon") : t("maintenance.countdown.opens_in")}
      </span>
      {!isOpen && (
        <div className="maint-countdown-grid">
          {units.map((u) => (
            <div key={u.label} className="maint-countdown-cell">
              <span className="maint-countdown-num">{String(u.value).padStart(2, "0")}</span>
              <span className="maint-countdown-unit">{u.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
