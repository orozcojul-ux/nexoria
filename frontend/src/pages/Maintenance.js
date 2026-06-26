import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Database, Globe, Crosshair, Languages,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n/LanguageProvider";
import MaintenanceBootShell from "@/components/maintenance/MaintenanceBootShell";
import MaintenanceBrand from "@/components/maintenance/MaintenanceBrand";
import MaintenanceGlobalProgress from "@/components/maintenance/MaintenanceGlobalProgress";
import MaintenanceDiscordCommunity from "@/components/maintenance/MaintenanceDiscordCommunity";
import MaintenanceStaffGate from "@/components/maintenance/MaintenanceStaffGate";
import MaintenanceAnticipationPanel from "@/components/maintenance/MaintenanceAnticipationPanel";
import MaintenanceCountdown from "@/components/maintenance/MaintenanceCountdown";
import MaintenanceLanguageSelector from "@/components/maintenance/MaintenanceLanguageSelector";
import { normalizeMaintenanceSystems } from "@/lib/maintenance-content";
import { resolveMaintenanceTextI18n, resolveMaintenanceSystemsI18n } from "@/lib/maintenance-i18n";
import { stripHtml } from "@/lib/stripHtml";
import "@/pages/Maintenance.css";

const BG_URL = `${process.env.PUBLIC_URL || ""}/maintenance-bg.jpg`;

const SYSTEM_ORDER = ["database", "site", "international", "server"];
const SYSTEM_ICONS = { database: Database, site: Globe, international: Languages, server: Crosshair };

const DEFAULT_SYSTEMS = normalizeMaintenanceSystems();

function OrnatePanel({ title, children, className = "" }) {
  return (
    <div className={`maint-panel ${className}`}>
      {title && <h2 className="maint-panel-title">{title}</h2>}
      {children}
    </div>
  );
}

function SystemsPanel({ systems, title }) {
  return (
    <OrnatePanel title={title}>
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
    </OrnatePanel>
  );
}

export default function Maintenance() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [statusData, setStatusData] = useState(null);
  const discordError = searchParams.get("error");

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await api.get("/maintenance/status");
      setStatusData(data);
      if (!data.enabled) {
        navigate("/feed", { replace: true });
      } else if (data.beta_access || user?.beta_access) {
        navigate("/feed", { replace: true });
      }
    } catch {
      setStatusData({ enabled: true, html: {}, systems: DEFAULT_SYSTEMS });
    }
  }, [navigate, user?.beta_access]);

  useEffect(() => {
    loadStatus();
    const id = setInterval(loadStatus, 15000);
    return () => clearInterval(id);
  }, [loadStatus]);

  const systems = useMemo(
    () => resolveMaintenanceSystemsI18n(statusData?.systems, t),
    [statusData?.systems, t],
  );

  const text = useMemo(
    () => resolveMaintenanceTextI18n(statusData?.html, t),
    [statusData?.html, t],
  );

  if (!statusData) {
    return <MaintenanceBootShell label={t("maintenance.loading")} />;
  }

  return (
    <div className="maintenance-page" data-testid="maintenance-page">
      <MaintenanceLanguageSelector />

      <div className="maintenance-bg" style={{ backgroundImage: `url(${BG_URL})` }} aria-hidden />
      <div className="maintenance-bg-overlay" aria-hidden />
      <div className="maintenance-glow" aria-hidden />

      <div className="maintenance-shell">
        <header className="maint-header" data-testid="maintenance-header">
          <MaintenanceBrand tagline={text.brand_tagline} />
          <div className="maint-status-pill">
            <span className="maint-status-dot" />
            <span className="maint-badge-text">{text.badge}</span>
          </div>
        </header>

        <motion.section
          className="maint-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="maint-hero-title" data-testid="maintenance-title">
            {text.title_line1}
            {text.title_line2 ? (
              <>
                <br />
                {text.title_line2}
              </>
            ) : null}
          </h1>
          <p className="maint-hero-body" data-testid="maintenance-message">
            {text.body}
          </p>
          {text.body_sub && (
            <p className="maint-hero-sub" data-testid="maintenance-subtitle">
              {text.body_sub}
            </p>
          )}
          <MaintenanceCountdown openAt={statusData?.open_at} />
        </motion.section>

        <motion.div
          className="maint-panels"
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <div className="maint-panels-row">
            <div className="maint-panels-col maint-panels-col--status">
              <SystemsPanel systems={systems} title={t("maintenance.systems.title")} />
              <MaintenanceGlobalProgress
                systems={systems}
                updatedAt={statusData?.updated_at}
                subtitle={statusData?.subtitle}
              />
            </div>
            <div className="maint-panels-col maint-panels-col--signup">
              <MaintenanceAnticipationPanel />
              <MaintenanceDiscordCommunity />
            </div>
          </div>
        </motion.div>

        <div className="maint-spacer" />

        <footer className="maint-footer" data-testid="maintenance-footer">
          <p className="maint-footer-text">{text.footer}</p>
        </footer>
      </div>

      <MaintenanceStaffGate discordError={discordError} />
    </div>
  );
}
