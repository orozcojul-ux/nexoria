import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Shield, ArrowRight, Ticket, Radio, Flag } from "lucide-react";
import api from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { adminHref, getActiveAdminTab } from "@/lib/admin-nav";
import "./StaffAdminDock.css";

export default function StaffAdminDock({ shortcuts, role, openReports: openReportsProp }) {
  const { t } = useI18n();
  const [pulse, setPulse] = useState(null);
  const isAdmin = role === "admin";

  useEffect(() => {
    const load = () => {
      api.get("/admin/pulse")
        .then((r) => setPulse(r.data))
        .catch(() => setPulse(null));
    };
    load();
    const id = setInterval(load, 30000);
    const onStaffAlert = () => load();
    const onMetrics = () => load();
    window.addEventListener("nexoria:staff-alert", onStaffAlert);
    window.addEventListener("nexoria:staff-metrics-changed", onMetrics);
    return () => {
      clearInterval(id);
      window.removeEventListener("nexoria:staff-alert", onStaffAlert);
      window.removeEventListener("nexoria:staff-metrics-changed", onMetrics);
    };
  }, []);

  const openTickets = pulse?.open_tickets ?? 0;
  const openReports = openReportsProp ?? pulse?.open_reports ?? 0;
  const nariaPending = pulse?.naria_pending ?? 0;
  const nexusOpen = pulse?.online_open !== false;
  const maintenance = pulse?.maintenance_enabled === true;

  return (
    <div className="staff-dock" data-testid="sidebar-admin-panel">
      <div className="staff-dock-head">
        <span className={`staff-dock-role${isAdmin ? " staff-dock-role--admin" : ""}`}>
          <Shield className="w-3 h-3" />
          {isAdmin ? t("sidebar.staff_role.admin") : t("sidebar.staff_role.mod")}
        </span>
        <div className="staff-dock-alerts">
          {openReports > 0 && (
            <span className="staff-dock-alert staff-dock-alert--report" title={t("admin.tab.reports")}>
              <Flag className="w-2.5 h-2.5" />
              {openReports}
            </span>
          )}
          {nariaPending > 0 && (
            <span className="staff-dock-alert staff-dock-alert--mod" title={t("admin.tab.moderation")}>
              <Shield className="w-2.5 h-2.5" />
              {nariaPending}
            </span>
          )}
          {openTickets > 0 && (
            <span className="staff-dock-alert" title={t("admin.tab.tickets")}>
              <Ticket className="w-2.5 h-2.5" />
              {openTickets}
            </span>
          )}
          <span
            className={`staff-dock-alert${maintenance ? "" : " staff-dock-alert--ok"}`}
            title={maintenance ? t("staff.status.maintenance") : nexusOpen ? t("staff.status.nexus_open") : t("staff.status.nexus_closed")}
          >
            <Radio className="w-2.5 h-2.5" />
            {maintenance ? t("staff.status.maint_short") : nexusOpen ? t("staff.status.on") : t("staff.status.off")}
          </span>
        </div>
      </div>

      <div className="staff-dock-grid">
        {shortcuts.map(({ tab, labelKey, icon: Icon, testid, to }) => (
          <NavLink
            key={tab}
            to={to}
            data-testid={testid}
            isActive={(_, loc) => loc.pathname === "/admin" && getActiveAdminTab(loc.search) === tab}
            className={({ isActive }) => `staff-dock-tile${isActive ? " staff-dock-tile--active" : ""}`}
          >
            <span className="staff-dock-tile-icon">
              <Icon className="w-3.5 h-3.5" style={{ color: isAdmin ? "#fcd34d" : "#c4b5fd" }} />
            </span>
            <span className="staff-dock-tile-label">{t(labelKey)}</span>
            {tab === "tickets" && openTickets > 0 && (
              <span className="staff-dock-badge">{openTickets > 9 ? "9+" : openTickets}</span>
            )}
            {tab === "reports" && openReports > 0 && (
              <span className="staff-dock-badge staff-dock-badge--report">{openReports > 9 ? "9+" : openReports}</span>
            )}
          </NavLink>
        ))}
      </div>

      <NavLink to={adminHref("pulse")} className="staff-dock-cta" data-testid="nav-admin-all">
        {t("sidebar.admin_full")}
        <ArrowRight className="w-3.5 h-3.5" />
      </NavLink>
    </div>
  );
}
