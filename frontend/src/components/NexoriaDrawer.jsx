import React, { useEffect, useState, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, LogOut, Settings, Menu, X, Shield,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHeroCard } from "@/contexts/HeroCardContext";
import { useI18n } from "@/contexts/I18nContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import api from "@/lib/api";
import Logo from "@/components/Logo";
import StaffAdminDock from "@/components/cms/StaffAdminDock";
import { buildPlayerNav } from "@/i18n/nav-config";
import {
  buildAdminSidebarNav,
  buildPlayerAdminShortcuts,
  getActiveAdminTab,
} from "@/lib/admin-nav";
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

  const tr = useCallback((key, fallback) => {
    const v = t(key);
    return v && v !== key ? v : (fallback ?? v);
  }, [t]);

  const isStaff = user?.role === "admin" || user?.role === "moderator";
  const isAdmin = user?.role === "admin";
  const useCmsNav = isStaff && location.pathname.startsWith("/admin");
  const sections = useCmsNav ? buildAdminSidebarNav({ isAdmin }) : buildPlayerNav();
  const adminShortcuts = !useCmsNav && isStaff ? buildPlayerAdminShortcuts({ isAdmin }) : [];

  const loadPendingFriends = useCallback(() => {
    api.get("/friends/requests/count")
      .then((r) => setPendingFriends(r.data?.count || 0))
      .catch(() => {});
  }, []);

  const loadOpenReports = useCallback(() => {
    if (!isStaff) return;
    api.get("/admin/pulse")
      .then((r) => setOpenReports(r.data?.open_reports ?? 0))
      .catch(() => {});
  }, [isStaff]);

  useEffect(() => {
    if (!user) return undefined;
    loadPendingFriends();
    loadOpenReports();
    const onUpdate = () => loadPendingFriends();
    const onStaff = () => loadOpenReports();
    window.addEventListener("nexoria:friends-updated", onUpdate);
    window.addEventListener("nexoria:staff-alert", onStaff);
    window.addEventListener("nexoria:staff-metrics-changed", onStaff);
    return () => {
      window.removeEventListener("nexoria:friends-updated", onUpdate);
      window.removeEventListener("nexoria:staff-alert", onStaff);
      window.removeEventListener("nexoria:staff-metrics-changed", onStaff);
    };
  }, [user, loadPendingFriends, loadOpenReports]);

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

  const handleItemClick = (item) => {
    if (item.openLegend) window.dispatchEvent(new CustomEvent("nexoria:open-legend"));
    onClose?.();
  };

  const resolveBadge = (item) => {
    if (item.dynamicBadge === "friends" || item.badgeKey === "friends") return pendingFriends;
    if (item.dynamicBadge === "open_reports") return openReports;
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
          className={styles.item}
          data-testid={item.testid}
          onClick={() => handleItemClick(item)}
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
        onClick={() => handleItemClick(item)}
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
        aria-label="Ouvrir le menu"
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
            <span className={styles.crestTitle}>
              NEXORIA
              {useCmsNav ? <span className={styles.crestCms}>{tr("sidebar.cms_v2", " CMS")}</span> : null}
            </span>
            <WingedCrest className={styles.crest} />
            <span className={styles.crestRule} />
          </div>

          <p className={styles.crestTag}>{tr("sidebar.tagline", "L'univers t'attend")}</p>

          <Diamond size={14} fill="#7c3aed" stroke="#a855f7" className={styles.headDiamond} />

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fermer le menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={styles.menuRail} aria-hidden>
          <Diamond size={12} fill="#1a1040" stroke="#7c3aed" strokeWidth={1.5} className={styles.railDiamond} />
        </div>

        <nav className={styles.menu} id="nexoria-drawer-menu">
          {useCmsNav && (
            <div className={styles.section}>
              <NavLink
                to="/feed"
                className={styles.backLink}
                data-testid="nav-cms-back-feed"
                onClick={onClose}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                {tr("sidebar.back_feed", "Retour au tableau de bord")}
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

          {!useCmsNav && isStaff && adminShortcuts.length > 0 && (
            <div className={styles.section}>
              <div className={styles.divider}>
                <span className={styles.dividerLine} />
                <Shield className={styles.dividerIcon} />
                <span className={styles.dividerLabel}>{tr("sidebar.section.staff", "Sentinelle")}</span>
                <Shield className={styles.dividerIcon} />
                <span className={styles.dividerLine} />
              </div>
              <div className={styles.staffDock}>
                <StaffAdminDock
                  shortcuts={adminShortcuts}
                  role={user.role}
                  openReports={openReports}
                />
              </div>
            </div>
          )}

          {!useCmsNav && (
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

          {isStaff && (
            <div className={styles.godMode}>
              <span className={styles.godModeTitle}>{tr("sidebar.godmode", "Mode Dieu")}</span>
              <div className={styles.godModeRow}>
                <span className={styles.godLabelOff}>Off</span>
                <button
                  type="button"
                  className={`${styles.switch} ${godMode ? styles.switchOn : ""}`}
                  onClick={toggleGodMode}
                  data-testid="godmode-toggle"
                  role="switch"
                  aria-checked={godMode}
                  aria-label="Mode Dieu"
                >
                  <span className={styles.switchThumb} />
                </button>
                <span className={styles.godLabelOn}>On</span>
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
