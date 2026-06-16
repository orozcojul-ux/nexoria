import React, { useEffect, useState } from "react";

function remainingMs(openAt) {
  const target = new Date(openAt).getTime();
  if (Number.isNaN(target)) return null;
  return target - Date.now();
}

export default function MaintenanceCountdown({ openAt }) {
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
    { value: Math.floor(total / 86400000), label: "Jours" },
    { value: Math.floor((total % 86400000) / 3600000), label: "Heures" },
    { value: Math.floor((total % 3600000) / 60000), label: "Min" },
    { value: Math.floor((total % 60000) / 1000), label: "Sec" },
  ];

  return (
    <div className="maint-countdown" data-testid="maintenance-countdown">
      <span className="maint-countdown-label">
        {isOpen ? "Ouverture imminente" : "Ouverture prévue dans"}
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
