import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Home, Star, Shield, Trophy, Calendar, Diamond as DiamondIcon,
  MessageCircle, Headphones, Users, BookOpen, User, Package, Scroll, Store,
  Menu, ChevronUp, ChevronDown, LayoutDashboard, LogOut, Settings,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHeroCard } from "@/contexts/HeroCardContext";
import { useI18n } from "@/contexts/I18nContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import api from "@/lib/api";
import { getTitleLabel } from "@/lib/title-labels";
import { getUserAvatarUrl } from "@/lib/user-avatar";
import { buildAdminSidebarNav, getActiveAdminTab } from "@/lib/admin-nav";
import styles from "./NexoriaDrawer.module.css";

/* ---- Sections joueur (routes réelles du projet) ---- */
const PLAYER_NAV = [
  {
    titleKey: "sidebar.section.main",
    fallback: "Menu Principal",
    items: [
      { to: "/feed", labelKey: "nav.home", fallback: "Accueil", icon: Home, testid: "nav-feed", end: true },
      { to: "/classes", labelKey: "nav.classes", fallback: "Classes", icon: Star, testid: "nav-classes" },
      { to: "/guilds", labelKey: "nav.guilds", fallback: "Guildes", icon: Shield, testid: "nav-guilds" },
      { to: "/leaderboards", labelKey: "nav.rankings", fallback: "Classements", icon: Trophy, testid: "nav-leaderboards" },
      { to: "/events", labelKey: "nav.events", fallback: "Événements", icon: Calendar, testid: "nav-events" },
      { to: "/oracle", labelKey: "nav.oracle", fallback: "Oracle", icon: DiamondIcon, testid: "nav-oracle" },
    ],
  },
  {
    titleKey: "sidebar.section.community",
    fallback: "Communauté",
    items: [
      { to: "/forum", labelKey: "nav.forum", fallback: "Forum", icon: MessageCircle, testid: "nav-forum" },
      { to: "/tickets", labelKey: "nav.tickets", fallback: "Service Client", icon: Headphones, testid: "nav-tickets" },
      { to: "/friends", labelKey: "nav.friends", fallback: "Amis", icon: Users, testid: "nav-friends", badgeKey: "friends" },
      { openLegend: true, labelKey: "sidebar.guide", fallback: "Guide du jeu", icon: BookOpen, testid: "sidebar-guide-btn" },
    ],
  },
  {
    titleKey: "sidebar.section.customize",
    fallback: "Personnalisation",
    items: [
      { openHeroCardSelf: true, labelKey: "nav.profile", fallback: "Carte héros", icon: User, testid: "nav-hero" },
      { to: "/settings", labelKey: "nav.settings", fallback: "Modifier le profil", icon: Settings, testid: "nav-settings" },
      { to: "/inventory", labelKey: "nav.inventory", fallback: "Inventaire", icon: Package, testid: "nav-inventory" },
      { to: "/quests", labelKey: "nav.quests", fallback: "Quêtes", icon: Scroll, testid: "nav-quests" },
    ],
  },
  {
    titleKey: "sidebar.section.shop",
    fallback: "Boutique",
    items: [
      { to: "/shop", labelKey: "nav.shop", fallback: "Boutique", icon: Store, testid: "nav-shop" },
    ],
  },
];

/* ---- SVG décoratifs ---- */
function CornerSVG({ className }) {
  return (
    <svg className={className} viewBox="0 0 50 50" fill="none" aria-hidden="true">
      <g fill="#c8960a" stroke="#8a6a1a" strokeWidth="1">
        <path d="M3 3 L33 3 L33 6 L3 6 Z" />
        <path d="M3 3 L6 3 L6 33 L3 33 Z" />
        <path d="M10 5 L15 10 L10 15 L5 10 Z" />
      </g>
    </svg>
  );
}

function Diamond({ size = 16, fill = "#c8960a", stroke = "#8a6a1a", strokeWidth = 1, className, style }) {
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} style={style} aria-hidden="true">
      <path d={`M${c} 1 L${size - 1} ${c} L${c} ${size - 1} L1 ${c} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
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

  const menuRef = useRef(null);
  const trackRef = useRef(null);
  const [thumb, setThumb] = useState({ top: 20, height: 60, visible: false });

  const tr = useCallback((key, fallback) => {
    const v = t(key);
    return v && v !== key ? v : (fallback ?? v);
  }, [t]);

  const isStaff = user?.role === "admin" || user?.role === "moderator";
  const isAdmin = user?.role === "admin";
  const useCmsNav = isStaff && location.pathname.startsWith("/admin");
  const sections = useCmsNav ? buildAdminSidebarNav({ isAdmin }) : PLAYER_NAV;

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

  /* ---- Scrollbar décorative fonctionnelle ---- */
  const updateThumb = useCallback(() => {
    const el = menuRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const trackTop = 20;
    const trackH = track.clientHeight;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight + 2) {
      setThumb((p) => ({ ...p, visible: false }));
      return;
    }
    const ratio = clientHeight / scrollHeight;
    const thumbH = Math.max(30, trackH * ratio);
    const maxScroll = scrollHeight - clientHeight;
    const top = trackTop + (trackH - thumbH) * (scrollTop / maxScroll);
    setThumb({ top, height: thumbH, visible: true });
  }, []);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(updateThumb);
    const onResize = () => updateThumb();
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", onResize); };
  }, [updateThumb, isOpen, useCmsNav, pendingFriends, openReports]);

  const scrollMenu = (delta) => {
    menuRef.current?.scrollBy({ top: delta, behavior: "smooth" });
  };

  const onThumbDrag = (e) => {
    e.preventDefault();
    const el = menuRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const startY = e.clientY;
    const startScroll = el.scrollTop;
    const trackH = track.clientHeight;
    const move = (ev) => {
      const dy = ev.clientY - startY;
      el.scrollTop = startScroll + (dy / trackH) * el.scrollHeight;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (!user) return null;

  const xpPercent = Math.min(100, Math.max(0, user.xp_pct ?? 0));
  const avatarSrc = getUserAvatarUrl(user);

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

  const goControlCenter = () => {
    navigate("/admin");
    // on garde le drawer ouvert : il bascule automatiquement sur la nav du panneau admin
  };

  const handleItemClick = (item) => {
    if (item.openLegend) window.dispatchEvent(new CustomEvent("nexoria:open-legend"));
    onClose?.();
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
        <CornerSVG className={`${styles.corner} ${styles.cornerTL}`} />
        <CornerSVG className={`${styles.corner} ${styles.cornerTR}`} />
        <CornerSVG className={`${styles.corner} ${styles.cornerBL}`} />
        <CornerSVG className={`${styles.corner} ${styles.cornerBR}`} />

        {/* ===== HEADER PROFIL ===== */}
        <div className={styles.header}>
          <div className={styles.logoWrap}>
            <div className={styles.logoCircle}>
              {avatarSrc ? (
                <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              ) : (
                <svg width="50" height="50" viewBox="0 0 50 50" aria-hidden="true" style={{ filter: "drop-shadow(0 0 6px #00d4ff)" }}>
                  <path d="M25 4 L46 25 L25 46 L4 25 Z" fill="rgba(0,180,220,0.1)" stroke="#00d4ff" strokeWidth="2" />
                  <path d="M25 14 L36 25 L25 36 L14 25 Z" fill="none" stroke="#00d4ff" strokeWidth="1.2" opacity="0.7" />
                </svg>
              )}
              <span className={styles.logoText}>Nexoria</span>
            </div>
            <Diamond size={12} fill="#7c3aed" stroke="#a855f7" className={`${styles.logoSideDiamond} ${styles.logoSideLeft}`} />
            <Diamond size={12} fill="#7c3aed" stroke="#a855f7" className={`${styles.logoSideDiamond} ${styles.logoSideRight}`} />
          </div>

          <div className={styles.heroInfo}>
            <div className={styles.heroName} data-testid="sidebar-username">{user.username}</div>
            <div className={styles.heroRank}>{getTitleLabel(user)}</div>
            <div className={styles.heroStatus}>
              <span className={styles.statusDot} />
              <span className={styles.statusText}>{tr("sidebar.online", "EN LIGNE")}</span>
            </div>
            <div className={styles.heroLevel}>
              <span className={styles.levelLabel}>
                {tr("sidebar.level_short", "Niv.")} <span data-testid="sidebar-level">{user.level}</span>
              </span>
              <span className={styles.xpBar}>
                <span className={styles.xpFill} style={{ width: `${xpPercent}%` }} />
                <span className={styles.xpText}>XP</span>
              </span>
            </div>
          </div>

          <Diamond size={20} fill="#7c3aed" stroke="#a855f7" className={styles.headerCornerDiamond} />
          <Diamond size={16} fill="#c8960a" stroke="#8a6a1a" className={styles.headerBottomDiamond} />
        </div>

        {/* ===== SCROLLBAR DÉCORATIVE (fonctionnelle) ===== */}
        <div className={styles.decoScroll}>
          <button type="button" className={styles.decoArrowTop} onClick={() => scrollMenu(-160)} aria-label="Défiler vers le haut">
            <ChevronUp className="w-4 h-4" />
          </button>
          <div className={styles.decoTrack} ref={trackRef} />
          {thumb.visible && (
            <div
              className={styles.decoThumb}
              style={{ top: thumb.top, height: thumb.height }}
              onPointerDown={onThumbDrag}
              role="scrollbar"
              aria-orientation="vertical"
              aria-controls="nexoria-drawer-menu"
            />
          )}
          <Diamond size={20} fill="#1a1040" stroke="#7c3aed" strokeWidth={1.5} className={styles.decoCenterDiamond} />
          <button type="button" className={styles.decoArrowBottom} onClick={() => scrollMenu(160)} aria-label="Défiler vers le bas">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* ===== MENU ===== */}
        <nav className={styles.menu} ref={menuRef} onScroll={updateThumb} id="nexoria-drawer-menu">
          {useCmsNav && (
            <NavLink to="/feed" className={styles.item} data-testid="nav-cms-back-feed" onClick={onClose}>
              <span className={styles.itemIcon}><LayoutDashboard className="w-full h-full" strokeWidth={1.8} /></span>
              <span className={styles.itemLabel}>{tr("sidebar.back_feed", "Retour au jeu")}</span>
            </NavLink>
          )}

          {sections.map((section) => (
            <div key={section.titleKey}>
              <div className={styles.divider}>
                <span className={styles.dividerLine} />
                <span className={styles.dividerLabel}>{tr(section.titleKey, section.fallback)}</span>
                <span className={styles.dividerLine} />
              </div>

              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);
                const badge = item.badgeKey === "friends"
                  ? pendingFriends
                  : item.dynamicBadge === "open_reports"
                    ? openReports
                    : item.dynamicBadge === "friends"
                      ? pendingFriends
                      : 0;
                const label = tr(item.labelKey, item.fallback);

                const inner = (
                  <>
                    <span className={styles.itemIcon}><Icon className="w-full h-full" strokeWidth={1.8} /></span>
                    <span className={styles.itemLabel}>{label}</span>
                    {badge > 0 && <span className={styles.itemBadge}>{badge > 9 ? "9+" : badge}</span>}
                    {active && <Diamond size={10} fill="#00d4ff" stroke="none" className={styles.itemActiveDiamond} />}
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
              })}
            </div>
          ))}
        </nav>

        {/* ===== FOOTER ===== */}
        <div className={styles.footer}>
          {useCmsNav ? (
            <button type="button" className={styles.controlBtn} onClick={() => { navigate("/feed"); onClose?.(); }} data-testid="drawer-back-game">
              <Diamond size={14} fill="#c8960a" stroke="#f5c842" className={styles.controlDiamond} />
              <span className={styles.controlText}>Retour au jeu</span>
              <Diamond size={14} fill="#c8960a" stroke="#f5c842" className={styles.controlDiamond} />
            </button>
          ) : (
            <button type="button" className={styles.controlBtn} onClick={goControlCenter} data-testid="drawer-control-center">
              <Diamond size={14} fill="#c8960a" stroke="#f5c842" className={styles.controlDiamond} />
              <span className={styles.controlText}>Centre de Contrôle</span>
              <Diamond size={14} fill="#c8960a" stroke="#f5c842" className={styles.controlDiamond} />
            </button>
          )}

          {isStaff && (
            <div className={styles.godMode}>
              <span className={styles.godModeTitle}>{tr("sidebar.godmode", "Mode Dieu")}</span>
              <div className={styles.godModeRow}>
                <span className={styles.godLabelOff}>Désactivé</span>
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
                <span className={styles.godLabelOn}>Activé</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={async () => { const dest = await logout(); if (dest !== "/maintenance") navigate(dest); onClose?.(); }}
            data-testid="logout-btn"
            className={styles.logout}
          >
            <LogOut className="w-3.5 h-3.5" /> {tr("sidebar.logout", "Déconnexion")}
          </button>
        </div>
      </aside>
    </>
  );
}
