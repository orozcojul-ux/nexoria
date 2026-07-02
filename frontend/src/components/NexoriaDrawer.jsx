import React, { useEffect, useState, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LogOut, Settings, Menu, X, Shield, ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHeroCard } from "@/contexts/HeroCardContext";
import { useI18n } from "@/contexts/I18nContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import api from "@/lib/api";
import Logo from "@/components/Logo";
import { buildPlayerNav } from "@/i18n/nav-config";
import { buildAdminSidebarNav, getActiveAdminTab } from "@/lib/admin-nav";
import styles from "./NexoriaDrawer.module.css";

function CornerSVG({ className }) {
  const off = 3;
  const th = 2.4;
  const bar = 22;
  const dia = 7;
  const dc = off + dia / 2 + 1;
  return (
    <svg className={className} width={36} height={36} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <g fill="#c8960a" stroke="#7a5a10" strokeWidth="1">
        <path d={`M${off} ${off} h${bar} v${th} h${-bar} Z`} />
        <path d={`M${off} ${off} v${bar} h${th} v${-bar} Z`} />
        <path d={`M${dc} ${dc - dia / 2} L${dc + dia / 2} ${dc} L${dc} ${dc + dia / 2} L${dc - dia / 2} ${dc} Z`} />
      </g>
    </svg>
  );
}

function Diamond({ size = 10, fill = "#c8960a", stroke = "#8a6a1a", className, style }) {
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} style={style} aria-hidden="true">
      <path
        d={`M${c} 1 L${size - 1} ${c} L${c} ${size - 1} L1 ${c} Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth="1"
      />
    </svg>
  );
}

function WingedCrest({ className }) {
  return (
    <svg width={22} height={18} viewBox="0 0 34 26" fill="none" aria-hidden="true" className={className}>
      <g stroke="#00d4ff" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 4 L21 8 L17 20 L13 8 Z" />
        <path d="M21 8 C26 7 30 9 33 13 C28 12 24 12 21 14" />
        <path d="M13 8 C8 7 4 9 1 13 C6 12 10 12 13 14" />
      </g>
      <path d="M17 2 L20 6 L17 10 L14 6 Z" fill="#c8960a" stroke="#7a5a10" strokeWidth="0.8" />
    </svg>
  );
}

export default function NexoriaDrawer({ isOpen, onClose, onOpen }) {
  const { user, logout } = useAuth();
  const { openHeroCard } = useHeroCard();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const ns = useNexusSocket();
  const [godMode, setGodMode] = useState(() => localStorage.getItem("nexoria_godmode") === "1");
  const [pendingFriends, setPendingFriends] = useState(0);
  const [openReports, setOpenReports] = useState(0);
  const [nariaPending, setNariaPending] = useState(0);

  const tr = useCallback((key, fallback) => {
    const v = t(key);
    return v && v !== key ? v : (fallback ?? v);
  }, [t]);

  const isStaff = user?.role === "admin" || user?.role === "moderator";
  const isAdmin = user?.role === "admin";
  const isAdminPanel = isStaff && location.pathname === "/admin";
  const sections = isAdminPanel
    ? buildAdminSidebarNav({ isAdmin })
    : buildPlayerNav();

  const loadPendingFriends = useCallback(() => {
    api.get("/friends/requests/count")
      .then((r) => setPendingFriends(r.data?.count || 0))
      .catch(() => {});
  }, []);

  const loadStaffPulse = useCallback(() => {
    if (!isStaff) return;
    api.get("/admin/pulse")
      .then((r) => {
        setOpenReports(r.data?.open_reports ?? 0);
        setNariaPending(r.data?.naria_pending ?? 0);
      })
      .catch(() => {});
  }, [isStaff]);

  useEffect(() => {
    if (!user) return undefined;
    loadPendingFriends();
    loadStaffPulse();
    const onUpdate = () => loadPendingFriends();
    const onStaffAlert = () => loadStaffPulse();
    const onMetrics = () => loadStaffPulse();
    window.addEventListener("nexoria:friends-updated", onUpdate);
    window.addEventListener("nexoria:staff-alert", onStaffAlert);
    window.addEventListener("nexoria:staff-metrics-changed", onMetrics);
    return () => {
      window.removeEventListener("nexoria:friends-updated", onUpdate);
      window.removeEventListener("nexoria:staff-alert", onStaffAlert);
      window.removeEventListener("nexoria:staff-metrics-changed", onMetrics);
    };
  }, [user, loadPendingFriends, loadStaffPulse]);

  useEffect(() => {
    if (!ns?.pushNotif) return;
    if (["friend_request", "friend_accepted"].includes(ns.pushNotif.kind)) loadPendingFriends();
  }, [ns?.pushNotif, loadPendingFriends]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && isOpen) onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!user) return null;

  const isItemActive = (item) => {
    if (item.adminTab) {
      return location.pathname === "/admin" && getActiveAdminTab(location.search) === item.adminTab;
    }
    if (!item.to) return false;
    if (item.end) return location.pathname === item.to;
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  };

  const toggleGodMode = () => {
    const next = !godMode;
    setGodMode(next);
    localStorage.setItem("nexoria_godmode", next ? "1" : "0");
    window.dispatchEvent(new CustomEvent("nexoria:godmode", { detail: { enabled: next } }));
    if (next) {
      navigate("/nexus");
      window.dispatchEvent(new CustomEvent("nexoria:open-nexus"));
      onClose?.();
    }
  };

  const handleItemClick = () => onClose?.();

  const resolveBadge = (item) => {
    if (item.dynamicBadge === "friends" || item.badgeKey === "friends") return pendingFriends;
    if (item.dynamicBadge === "open_reports") return openReports;
    if (item.dynamicBadge === "naria_pending") return nariaPending;
    return item.badge ?? 0;
  };

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const active = isItemActive(item);
    const badge = resolveBadge(item);
    const label = tr(item.labelKey, item.fallback);

    const inner = (
      <>
        <span className={styles.itemIconWrap}>
          <span className={styles.itemIcon}>
            <Icon className="w-full h-full" strokeWidth={1.8} />
          </span>
        </span>
        <span className={styles.itemLabel}>{label}</span>
        {badge > 0 && (
          <span className={styles.itemBadge}>{badge > 9 ? "9+" : badge}</span>
        )}
        {active && <Diamond size={8} fill="#00d4ff" stroke="none" className={styles.itemActiveDiamond} />}
      </>
    );

    if (item.openLegend) {
      return (
        <button
          key={item.testid}
          type="button"
          className={`${styles.item} ${item.highlight ? styles.itemGuide : ""}`}
          data-testid={item.testid}
          onClick={() => {
            window.dispatchEvent(new CustomEvent("nexoria:open-legend"));
            onClose?.();
          }}
        >
          {inner}
        </button>
      );
    }

    if (item.openHeroCardSelf) {
      return (
        <button
          key={item.testid}
          type="button"
          className={styles.item}
          data-testid={item.testid}
          onClick={() => {
            if (user?.user_id) openHeroCard(user.user_id);
            onClose?.();
          }}
        >
          {inner}
        </button>
      );
    }

    return (
      <NavLink
        key={item.testid || item.to}
        to={item.to}
        data-testid={item.testid}
        className={`${styles.item} ${active ? styles.itemActive : ""}`}
        onClick={handleItemClick}
      >
        {inner}
      </NavLink>
    );
  };

  return (
    <>
      <button
        type="button"
        className={styles.toggle}
        onClick={onOpen}
        data-testid="drawer-toggle"
        aria-label={tr("drawer.openMenu", "Open menu")}
      >
        <Menu className="w-5 h-5" />
      </button>

      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ""}`}
        onClick={onClose}
        data-testid="drawer-overlay"
      />

      <aside
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}
        data-testid="sidebar"
        aria-hidden={!isOpen}
      >
        <span className={`${styles.aura} ${styles.auraTop}`} aria-hidden />
        <span className={`${styles.aura} ${styles.auraBottom}`} aria-hidden />

        <CornerSVG className={`${styles.corner} ${styles.cornerTL}`} />
        <CornerSVG className={`${styles.corner} ${styles.cornerTR}`} />
        <CornerSVG className={`${styles.corner} ${styles.cornerBL}`} />
        <CornerSVG className={`${styles.corner} ${styles.cornerBR}`} />

        <div className={styles.head}>
          <div className={styles.logoFrame}>
            <Logo size={34} withText={false} />
          </div>

          <div className={styles.crestRow}>
            <span className={styles.crestRule} />
            <WingedCrest className={styles.crest} />
            <span className={styles.crestTitle}>NEXORIA</span>
            <WingedCrest className={styles.crest} />
            <span className={styles.crestRule} />
          </div>

          <p className={styles.crestTag}>
            {isAdminPanel
              ? tr("admin.subtitle", "Administration du royaume")
              : tr("sidebar.tagline", "L'univers t'attend")}
          </p>

          <Diamond size={14} fill="#7c3aed" stroke="#a855f7" className={styles.headDiamond} />

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label={tr("drawer.closeMenu", "Close menu")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={styles.menuRail} aria-hidden>
          <Diamond size={12} fill="#1a1040" stroke="#7c3aed" strokeWidth={1.5} className={styles.railDiamond} />
        </div>

        <nav className={styles.menu} id="nexoria-drawer-menu">
          {isAdminPanel && (
            <div className={styles.section}>
              <NavLink
                to="/feed"
                className={`${styles.item} ${styles.adminBackLink}`}
                data-testid="drawer-admin-back"
                onClick={onClose}
              >
                <span className={styles.itemIconWrap}>
                  <span className={styles.itemIcon}>
                    <ArrowLeft className="w-full h-full" strokeWidth={1.8} />
                  </span>
                </span>
                <span className={styles.itemLabel}>{tr("sidebar.back_to_game", "Retour au royaume")}</span>
              </NavLink>
            </div>
          )}

          {sections.map((section) => (
            <div key={section.titleKey} className={styles.section}>
              <div className={styles.divider}>
                <span className={styles.dividerLine} />
                <Diamond size={8} fill="#8a6a1a" stroke="#c8960a" />
                <span className={styles.dividerLabel}>{tr(section.titleKey, section.fallback)}</span>
                <Diamond size={8} fill="#8a6a1a" stroke="#c8960a" />
                <span className={styles.dividerLine} />
              </div>
              <div className={styles.sectionItems}>
                {section.items.map(renderNavItem)}
              </div>
            </div>
          ))}

          {!isAdminPanel && (
            <div className={`${styles.section} ${styles.sectionLast}`}>
              <div className={styles.divider}>
                <span className={styles.dividerLine} />
                <Diamond size={8} fill="#7c3aed" stroke="#a855f7" />
                <span className={styles.dividerLabel}>{tr("nav.settings", "Paramètres")}</span>
                <Diamond size={8} fill="#7c3aed" stroke="#a855f7" />
                <span className={styles.dividerLine} />
              </div>
              <div className={styles.sectionItems}>
                <NavLink
                  to="/settings"
                  className={`${styles.item} ${location.pathname === "/settings" ? styles.itemActive : ""}`}
                  data-testid="nav-settings"
                  onClick={onClose}
                >
                  <span className={styles.itemIconWrap}>
                    <span className={styles.itemIcon}>
                      <Settings className="w-full h-full" strokeWidth={1.8} />
                    </span>
                  </span>
                  <span className={styles.itemLabel}>{tr("nav.settings", "Paramètres")}</span>
                  {location.pathname === "/settings" && (
                    <Diamond size={8} fill="#00d4ff" stroke="none" className={styles.itemActiveDiamond} />
                  )}
                </NavLink>
              </div>
            </div>
          )}
        </nav>

        <div className={styles.footer}>
          <Diamond size={12} fill="#c8960a" stroke="#f5c842" className={styles.footerDiamond} />

          {isStaff && !isAdminPanel && (
            <NavLink
              to="/admin"
              className={styles.adminLink}
              data-testid="drawer-admin-panel"
              onClick={onClose}
            >
              <Shield className="w-3 h-3" />
              {tr("nav.admin_panel", "Centre de contrôle")}
            </NavLink>
          )}

          {isStaff && (
            <div className={styles.godMode}>
              <span className={styles.godModeTitle}>{tr("sidebar.godmode", "Mode Dieu")}</span>
              <div className={styles.godModeRow}>
                <span className={styles.godLabelOff}>{tr("sidebar.godmode_off", "Off")}</span>
                <button
                  type="button"
                  className={`${styles.switch} ${godMode ? styles.switchOn : ""}`}
                  onClick={toggleGodMode}
                  data-testid="godmode-toggle"
                  role="switch"
                  aria-checked={godMode}
                  aria-label={tr("sidebar.godmode", "God Mode")}
                >
                  <span className={styles.switchThumb} />
                </button>
                <span className={styles.godLabelOn}>{tr("sidebar.godmode_on", "On")}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={async () => {
              const dest = await logout();
              if (dest !== "/maintenance") navigate(dest);
              onClose?.();
            }}
            data-testid="logout-btn"
            className={styles.logout}
          >
            <LogOut className="w-3.5 h-3.5" />
            {tr("sidebar.logout", "Déconnexion")}
          </button>
        </div>
      </aside>
    </>
  );
}
