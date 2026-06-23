import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Activity } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatMaintRelativeTime } from "@/lib/maintenance-i18n";

function globalPhase(percent, t) {
  if (percent >= 85) {
    return {
      label: t("maintenance.global.phase.finalization"),
      hint: t("maintenance.global.hint.finalization"),
    };
  }
  if (percent >= 50) {
    return {
      label: t("maintenance.global.phase.sync"),
      hint: t("maintenance.global.hint.sync"),
    };
  }
  return {
    label: t("maintenance.global.phase.stabilization"),
    hint: t("maintenance.global.hint.stabilization"),
  };
}

export default function MaintenanceGlobalProgress({ systems, updatedAt, subtitle }) {
  const { t, fmtDate } = useI18n();

  const { overall, phase } = useMemo(() => {
    const values = Object.values(systems || {})
      .map((s) => Number(s?.progress))
      .filter((n) => Number.isFinite(n));
    const avg = values.length
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 0;
    return { overall: Math.max(0, Math.min(100, avg)), phase: globalPhase(avg, t) };
  }, [systems, t]);

  return (
    <div className="maint-panel maint-global-panel" data-testid="maintenance-global-progress">
      <h2 className="maint-panel-title maint-global-title">{t("maintenance.global.title")}</h2>

      <div className="maint-global-compact">
        <div className="maint-global-ring" style={{ "--pct": overall }}>
          <span className="maint-global-pct">{overall}%</span>
        </div>
        <div className="maint-global-body">
          <p className="maint-global-phase">
            <Activity className="maint-global-phase-icon" strokeWidth={2} aria-hidden />
            {phase.label}
          </p>
          <p className="maint-global-hint">{subtitle?.trim() || phase.hint}</p>
          <div className="maint-global-bar" aria-hidden>
            <motion.div
              className="maint-global-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${overall}%` }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            />
          </div>
          <p className="maint-global-updated">
            <Clock className="maint-global-updated-icon" strokeWidth={2} aria-hidden />
            {formatMaintRelativeTime(updatedAt, t, fmtDate)}
          </p>
        </div>
      </div>
    </div>
  );
}
