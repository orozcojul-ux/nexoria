import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useHeroCard } from "@/contexts/HeroCardContext";
import api from "@/lib/api";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import {
  LayoutDashboard, Castle, Trophy, UserCheck, Calendar,
  Sword, Gem, ShoppingBag, LogOut, Eye, Sparkles,
  ScrollText, UserPlus, Settings, MessageSquare,
  Coins, Shield,
} from "lucide-react";
import Logo from "@/components/Logo";
import { buildPlayerNav } from "@/i18n/nav-config";
import { useI18n } from "@/contexts/I18nContext";
import LastConnection from "@/components/LastConnection";
import { getTitleLabel } from "@/lib/title-labels";
import { getUserAvatarUrl } from "@/lib/user-avatar";

const PURPLE = "#7B2FF7";
const PURPLE_GLOW = "rgba(123, 47, 247, 0.45)";

/* ─── Player sidebar built via buildPlayerNav() + i18n ─── */

function CrystalLogo({ t }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: "radial-gradient(circle at 40% 35%, rgba(123,47,247,0.55) 0%, rgba(60,20,120,0.25) 55%, transparent 75%)",
          boxShadow: `0 0 28px ${PURPLE_GLOW}, inset 0 0 12px rgba(123,47,247,0.25)`,
        }}
      >
        <Logo size={32} withText={false} />
      </div>
      <div className="min-w-0">
        <div className="font-display font-black text-[15px] tracking-[0.12em] text-white leading-tight">
          NEXORIA
        </div>
        <div className="text-[8px] uppercase tracking-[0.42em] text-violet-400/55 font-semibold mt-0.5">
          {t("sidebar.tagline")}
        </div>
      </div>
    </div>
  );
}

function UserCard({ user, t }) {
  const { openHeroCard } = useHeroCard();
  const xpPercent = user.xp_pct ?? 0;
  const avatarSrc = getUserAvatarUrl(user);
  return (
    <button
      type="button"
      onClick={() => openHeroCard(user.user_id)}
      className="block mx-3 mb-1 w-[calc(100%-24px)] text-left"
      data-testid="sidebar-user-card"
    >
      <div
        className="rounded-xl p-3 border transition-all hover:border-violet-500/35"
        style={{
          background: "linear-gradient(145deg, rgba(20,14,35,0.95) 0%, rgba(10,8,18,0.98) 100%)",
          borderColor: "rgba(123, 47, 247, 0.22)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.35)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div
              className="w-11 h-11 rounded-lg overflow-hidden flex items-center justify-center font-bold text-base"
              style={{
                background: "linear-gradient(135deg, #4c1d95, #7c3aed)",
                boxShadow: `0 0 14px ${PURPLE_GLOW}`,
              }}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-white">{user.username?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0c0a14]"
              style={{ boxShadow: "0 0 6px rgba(74,222,128,0.85)" }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate" data-testid="sidebar-username">
              {user.username}
            </div>
            <div className="text-[11px] text-amber-400/95 font-medium truncate">
              {getTitleLabel(user)}
            </div>
            <div className="text-[9px] uppercase tracking-wider font-semibold mt-0.5">
              <LastConnection user={user} online onlineClassName="text-emerald-400/90" offlineClassName="text-zinc-500" />
            </div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono-stat text-zinc-400">
          <span>
            {t("sidebar.level_short")} <span className="text-violet-200" data-testid="sidebar-level">{user.level}</span>
          </span>
          <span className="text-yellow-400/95 flex items-center gap-0.5" data-testid="sidebar-aether">
            <Coins className="w-3 h-3" />
            {user.aether ?? 0}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] font-mono-stat text-zinc-500">
          <span className="text-violet-300/80">{Math.floor(xpPercent)}% XP</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${xpPercent}%`,
              background: `linear-gradient(90deg, ${PURPLE}, #a855f7)`,
              boxShadow: `0 0 10px ${PURPLE_GLOW}`,
            }}
          />
        </div>
      </div>
    </button>
  );
}

function NavIconBox({ Icon, active }) {
  return (
    <span
      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-all"
      style={{
        background: active ? "rgba(123, 47, 247, 0.35)" : "rgba(255,255,255,0.04)",
        boxShadow: active ? `0 0 10px ${PURPLE_GLOW}` : "none",
      }}
    >
      <Icon
        className="w-3.5 h-3.5"
        style={{ color: active ? "#e9d5ff" : "rgba(167, 139, 250, 0.65)" }}
        strokeWidth={active ? 2.25 : 1.75}
      />
    </span>
  );
}

function SidebarLegendButton({ labelKey, icon: Icon, testid }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("nexoria:open-legend"))}
      data-testid={testid}
      className="nexoria-nav-link group flex items-center gap-2.5 mx-2 px-2.5 py-2 rounded-[10px] text-[13px] font-medium transition-all text-zinc-400 hover:text-amber-200 hover:bg-amber-500/[0.06] w-[calc(100%-16px)]"
    >
      <span
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        style={{ background: "rgba(245,158,11,0.12)", boxShadow: "0 0 10px rgba(245,158,11,0.15)" }}
      >
        <Icon className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
      </span>
      <span className="flex-1 truncate text-left">{t(labelKey)}</span>
    </button>
  );
}

function SidebarHeroCardButton({ labelKey, icon: Icon, testid }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { openHeroCard } = useHeroCard();
  return (
    <button
      type="button"
      onClick={() => user?.user_id && openHeroCard(user.user_id)}
      data-testid={testid}
      className="nexoria-nav-link group flex items-center gap-2.5 mx-2 px-2.5 py-2 rounded-[10px] text-[13px] font-medium transition-all text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] w-[calc(100%-16px)]"
    >
      <NavIconBox Icon={Icon} active={false} />
      <span className="flex-1 truncate text-left">{t(labelKey)}</span>
    </button>
  );
}

function SidebarLink({ to, label, labelKey, icon: Icon, testid, badge, end, hash, openNexusOnClick, openHeroCardSelf }) {
  const { t } = useI18n();
  const displayLabel = labelKey ? t(labelKey) : label;
  const resolvedBadge = badge;
  const dest = hash ? { pathname: to, hash } : to;
  const resolveActive = () => {
    if (openHeroCardSelf) return () => false;
    if (hash) return (_, loc) => loc.pathname === to && loc.hash === hash;
    if (end) return undefined;
    return (_, loc) => loc.pathname === to && !loc.hash;
  };

  if (openHeroCardSelf) {
    return <SidebarHeroCardButton labelKey={labelKey} icon={Icon} testid={testid} />;
  }

  return (
    <NavLink
      to={dest}
      end={end}
      data-testid={testid}
      isActive={resolveActive()}
      onClick={() => { if (openNexusOnClick) window.dispatchEvent(new CustomEvent("nexoria:open-nexus")); }}
      className={({ isActive }) =>
        `nexoria-nav-link group flex items-center gap-2.5 mx-2 px-2.5 py-2 rounded-[10px] text-[13px] font-medium transition-all relative ${
          isActive ? "nexoria-nav-link--active text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <NavIconBox Icon={Icon} active={isActive} />
          <span className="flex-1 truncate">{displayLabel}</span>
          {resolvedBadge > 0 && (
            <span
              className="min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: PURPLE, boxShadow: `0 0 8px ${PURPLE_GLOW}` }}
            >
              {resolvedBadge > 9 ? "9+" : resolvedBadge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function GodModeToggle({ enabled, onToggle, t }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      data-testid="godmode-toggle"
      className="w-full mx-auto max-w-[calc(100%-16px)] flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all"
      style={{
        borderColor: enabled ? "rgba(123,47,247,0.45)" : "rgba(255,255,255,0.08)",
        background: enabled ? "rgba(123,47,247,0.12)" : "rgba(255,255,255,0.02)",
      }}
    >
      <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-violet-200/90">
        <Sparkles className="w-3.5 h-3.5 text-violet-300" style={{ filter: `drop-shadow(0 0 6px ${PURPLE_GLOW})` }} />
        {t("sidebar.godmode")}
      </span>
      <span className="flex items-center gap-2">
        <span className={`text-[9px] uppercase tracking-widest font-bold ${enabled ? "text-emerald-400" : "text-zinc-600"}`}>
          {enabled ? t("sidebar.godmode_on") : t("sidebar.godmode_off")}
        </span>
        <span
          className="relative w-9 h-5 rounded-full transition-all"
          style={{ background: enabled ? PURPLE : "rgba(255,255,255,0.1)" }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
            style={{ left: enabled ? "18px" : "2px" }}
          />
        </span>
      </span>
    </button>
  );
}

function SupportFooter({ t }) {
  return (
    <div className="px-3 pt-1">
      <div className="text-[8px] uppercase tracking-[0.35em] text-zinc-600 font-bold text-center mb-2">
        {t("sidebar.support")}
      </div>
      <NavLink
        to="/shop"
        data-testid="sidebar-support-cta"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110"
        style={{
          background: `linear-gradient(90deg, ${PURPLE} 0%, #9333ea 50%, #7c3aed 100%)`,
          boxShadow: `0 4px 20px ${PURPLE_GLOW}, inset 0 1px 0 rgba(255,255,255,0.15)`,
        }}
      >
        <ShoppingBag className="w-4 h-4" />
        {t("nav.shop")}
      </NavLink>
    </div>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const ns = useNexusSocket();
  const [godMode, setGodMode] = useState(() => localStorage.getItem("nexoria_godmode") === "1");
  const [pendingFriends, setPendingFriends] = useState(0);

  const loadPendingFriends = () => {
    api.get("/friends/requests/count")
      .then((r) => setPendingFriends(r.data?.count || 0))
      .catch(() => {});
  };

  useEffect(() => {
    if (!user) return;
    loadPendingFriends();
    const onUpdate = () => loadPendingFriends();
    window.addEventListener("nexoria:friends-updated", onUpdate);
    return () => window.removeEventListener("nexoria:friends-updated", onUpdate);
  }, [user]);

  useEffect(() => {
    if (!ns?.pushNotif) return;
    if (["friend_request", "friend_accepted"].includes(ns.pushNotif.kind)) {
      loadPendingFriends();
    }
  }, [ns?.pushNotif]);

  if (!user) return null;

  const isStaff = user.role === "admin" || user.role === "moderator";
  const navSections = buildPlayerNav();

  const toggleGodMode = () => {
    const next = !godMode;
    setGodMode(next);
    localStorage.setItem("nexoria_godmode", next ? "1" : "0");
    window.dispatchEvent(new CustomEvent("nexoria:godmode", { detail: { enabled: next } }));
    if (next) {
      navigate("/nexus");
      window.dispatchEvent(new CustomEvent("nexoria:open-nexus"));
    }
  };

  return (
    <aside
      className="hidden lg:flex flex-col w-[272px] sticky top-0 h-screen z-20 shrink-0"
      style={{
        background: "linear-gradient(180deg, #0c0a16 0%, #08060f 50%, #0a0812 100%)",
        borderRight: "1px solid rgba(123, 47, 247, 0.14)",
        boxShadow: "4px 0 40px rgba(0,0,0,0.5)",
      }}
      data-testid="sidebar"
    >
      {/* Logo */}
      <div className="px-4 pt-5 pb-3 border-b" style={{ borderColor: "rgba(123,47,247,0.1)" }}>
        <NavLink to="/feed" data-testid="logo-link">
          <CrystalLogo t={t} />
        </NavLink>
      </div>

      <UserCard user={user} t={t} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto nexoria-sidebar-scroll py-2 space-y-4">
        {navSections.map((section) => (
          <div key={section.titleKey}>
            <div className="px-4 mb-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-zinc-600">
              {t(section.titleKey)}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                item.openLegend ? (
                  <SidebarLegendButton
                    key={`${section.titleKey}-${item.labelKey}`}
                    {...item}
                  />
                ) : item.openHeroCardSelf ? (
                  <SidebarHeroCardButton
                    key={`${section.titleKey}-${item.labelKey}`}
                    {...item}
                  />
                ) : (
                  <SidebarLink
                    key={`${section.titleKey}-${item.labelKey}`}
                    {...item}
                    badge={item.dynamicBadge === "friends" ? pendingFriends : item.badge}
                  />
                )
              ))}
            </div>
          </div>
        ))}

        <div className="px-2 space-y-0.5">
          <SidebarLink to="/settings" labelKey="nav.settings" icon={Settings} testid="nav-settings" />
        </div>
      </nav>

      {/* Footer */}
      <div className="py-3 border-t space-y-2.5" style={{ borderColor: "rgba(123,47,247,0.1)" }}>
        {isStaff && (
          <NavLink
            to="/admin"
            data-testid="sidebar-admin-panel"
            className="mx-3 flex items-center justify-center gap-1.5 py-1.5 text-[9px] uppercase tracking-[0.2em] font-semibold text-zinc-600 hover:text-amber-400/90 border border-transparent hover:border-amber-500/20 rounded-lg transition-colors"
          >
            <Shield className="w-3 h-3" />
            {t("nav.admin_panel")}
          </NavLink>
        )}
        {isStaff && <GodModeToggle enabled={godMode} onToggle={toggleGodMode} t={t} />}
        <SupportFooter t={t} />
        <button
          type="button"
          onClick={async () => { const dest = await logout(); if (dest !== "/maintenance") navigate(dest); }}
          data-testid="logout-btn"
          className="mx-3 w-[calc(100%-24px)] flex items-center justify-center gap-1.5 py-1.5 text-[10px] uppercase tracking-widest font-semibold text-zinc-600 hover:text-red-400/90 transition-colors"
        >
          <LogOut className="w-3 h-3" />
          {t("sidebar.logout")}
        </button>
      </div>
    </aside>
  );
}
