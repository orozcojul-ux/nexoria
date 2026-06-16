import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Activity } from "lucide-react";

function formatRelativeTime(iso) {
  if (!iso) return "À l'instant";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Récemment";
  const diffMin = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function globalPhase(percent) {
  if (percent >= 85) return { label: "Finalisation", hint: "Le Nexus rouvre très bientôt." };
  if (percent >= 50) return { label: "Synchronisation", hint: "Les Sentinelles stabilisent les systèmes." };
  return { label: "Stabilisation", hint: "Phase initiale — fondations en cours." };
}

export default function MaintenanceGlobalProgress({ systems, updatedAt, subtitle }) {
  const { overall, phase } = useMemo(() => {
    const values = Object.values(systems || {})
      .map((s) => Number(s?.progress))
      .filter((n) => Number.isFinite(n));
    const avg = values.length
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 0;
    return { overall: Math.max(0, Math.min(100, avg)), phase: globalPhase(avg) };
  }, [systems]);

  return (
    <div className="maint-panel" data-testid="maintenance-global-progress">
      <h2 className="maint-panel-title">Avancement global</h2>

      <div className="maint-global-head">
        <div className="maint-global-ring" style={{ "--pct": overall }}>
          <span className="maint-global-pct">{overall}%</span>
        </div>
        <div className="min-w-0">
          <p className="maint-global-phase">
            <Activity className="w-3.5 h-3.5 inline -mt-0.5 mr-1 text-cyan-300" />
            {phase.label}
          </p>
          <p className="maint-global-hint">{subtitle?.trim() || phase.hint}</p>
        </div>
      </div>

      <div className="maint-global-bar" aria-hidden>
        <motion.div
          className="maint-global-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${overall}%` }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </div>

      <p className="maint-global-updated">
        <Clock className="w-3 h-3 inline -mt-px mr-1" />
        Dernière actualisation : {formatRelativeTime(updatedAt)}
      </p>
    </div>
  );
}
