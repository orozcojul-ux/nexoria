import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Database, Globe, Crosshair,
} from "lucide-react";
import DiscordFab from "@/components/DiscordFab";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import MaintenanceBrand from "@/components/maintenance/MaintenanceBrand";
import MaintenanceGlobalProgress from "@/components/maintenance/MaintenanceGlobalProgress";
import MaintenanceStaffGate from "@/components/maintenance/MaintenanceStaffGate";
import MaintenanceBetaGate from "@/components/maintenance/MaintenanceBetaGate";
import MaintenanceCountdown from "@/components/maintenance/MaintenanceCountdown";
import { resolveMaintenanceText, normalizeMaintenanceSystems } from "@/lib/maintenance-content";
import { stripHtml } from "@/lib/stripHtml";
import "@/pages/Maintenance.css";

const DISCORD_URL = process.env.REACT_APP_DISCORD_URL || "https://discord.gg/RC5QjcWDCH";
const BG_URL = `${process.env.PUBLIC_URL || ""}/maintenance-bg.jpg`;

const SYSTEM_ORDER = ["database", "site", "server"];
const SYSTEM_ICONS = { database: Database, site: Globe, server: Crosshair };

const DEFAULT_SYSTEMS = normalizeMaintenanceSystems();

function OrnatePanel({ title, children, className = "" }) {
  return (
    <div className={`maint-panel ${className}`}>
      {title && <h2 className="maint-panel-title">{title}</h2>}
      {children}
    </div>
  );
}

function SystemsPanel({ systems }) {
  return (
    <OrnatePanel title="État des systèmes">
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
  const [statusData, setStatusData] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await api.get("/maintenance/status");
      setStatusData(data);
      if (!data.enabled) navigate("/feed");
      else if (data.beta_access) navigate("/");
    } catch {
      setStatusData({ enabled: true, html: {}, systems: DEFAULT_SYSTEMS });
    }
  }, [navigate]);

  useEffect(() => {
    loadStatus();
    const id = setInterval(loadStatus, 15000);
    return () => clearInterval(id);
  }, [loadStatus]);

  const systems = normalizeMaintenanceSystems(statusData?.systems);

  const text = resolveMaintenanceText(statusData?.html);

  return (
    <div className="maintenance-page" data-testid="maintenance-page">
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
          <SystemsPanel systems={systems} />
          <MaintenanceGlobalProgress
            systems={systems}
            updatedAt={statusData?.updated_at}
            subtitle={statusData?.subtitle}
          />

          <div className="maint-discord-panel">
            <p className="maint-discord-title">Rejoignez la communauté</p>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="maint-discord-btn"
              data-testid="maintenance-discord-btn"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
                <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              {text.discord_label}
            </a>
          </div>

          <MaintenanceBetaGate />
        </motion.div>

        <div className="maint-spacer" />

        <footer className="maint-footer" data-testid="maintenance-footer">
          <p className="maint-footer-text">{text.footer}</p>
        </footer>
      </div>

      <MaintenanceStaffGate />

      <DiscordFab className="right-4 bottom-8" testid="maintenance-discord-fab" />
    </div>
  );
}
