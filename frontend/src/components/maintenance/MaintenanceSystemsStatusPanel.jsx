import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity, Clock, Database, Globe, Crosshair, Languages,
} from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatMaintRelativeTime } from "@/lib/maintenance-i18n";
import { stripHtml } from "@/lib/stripHtml";

const SYSTEM_ORDER = ["database", "site", "international", "server"];
const SYSTEM_ICONS = { database: Database, site: Globe, international: Languages, server: Crosshair };

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

export default function MaintenanceSystemsStatusPanel({ systems, updatedAt, subtitle }) {
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
    <div className="maint-panel maint-systems-panel" data-testid="maintenance-systems-status">
      <h2 className="maint-panel-title">{t("maintenance.systems.title")}</h2>

      <section
        className="maint-global-summary"
        aria-label={t("maintenance.global.title")}
        data-testid="maintenance-global-progress"
      >
        <p className="maint-global-summary-label">{t("maintenance.global.title")}</p>
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
      </section>

      <div className="maint-systems-divider" aria-hidden />

      <ul className="maint-systems-list" data-testid="maintenance-systems">
        {SYSTEM_ORDER.map((key) => {
          const sys = systems[key];
          if (!sys) return null;
          const Icon = SYSTEM_ICONS[key];
          const progress = Math.max(0, Math.min(100, Number(sys.progress) || 0));
          const label = stripHtml(sys.label) || sys.label;

          return (
            <li key={key} className="maint-system-item">
              <div className="maint-system-head">
                <Icon className="maint-system-icon" strokeWidth={1.75} />
                <span className="maint-system-label">{label}</span>
                <span className="maint-system-pct">{progress}%</span>
                <span className="maint-system-dot" aria-hidden />
              </div>
              <div className="maint-system-bar" aria-hidden>
                <motion.div
                  className="maint-system-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
