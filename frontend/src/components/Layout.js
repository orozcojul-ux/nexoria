import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import {
  ScrollText, User as UserIcon, Network, Castle, Gem, Crosshair, Eye,
  Trophy, Flame, Shield, LogOut, ShoppingBag, Settings as SettingsIcon, Globe, MessageSquare
} from "lucide-react";
import StarField from "./StarField";
import Logo from "./Logo";
import NotificationsBell from "./NotificationsBell";
import LanguageSwitcher from "./LanguageSwitcher";

const NAV = [
  { to: "/feed",         tkey: "nav.feed",         icon: ScrollText, testid: "nav-feed" },
  { to: "/hero",         tkey: "nav.hero",         icon: UserIcon,   testid: "nav-hero" },
  { to: "/skills",       tkey: "nav.skills",       icon: Network,    testid: "nav-skills" },
  { to: "/kingdom",      tkey: "nav.kingdom",      icon: Castle,     testid: "nav-kingdom" },
  { to: "/inventory",    tkey: "nav.inventory",    icon: Gem,        testid: "nav-inventory" },
  { to: "/quests",       tkey: "nav.quests",       icon: Crosshair,  testid: "nav-quests" },
  { to: "/oracle",       tkey: "nav.oracle",       icon: Eye,        testid: "nav-oracle" },
  { to: "/leaderboards", tkey: "nav.leaderboards", icon: Trophy,     testid: "nav-leaderboards" },
  { to: "/legends",      tkey: "nav.legends",      icon: Flame,      testid: "nav-legends" },
  { to: "/world",        tkey: "nav.world",        icon: Globe,      testid: "nav-world" },
  { to: "/guilds",       tkey: "nav.guilds",       icon: Castle,     testid: "nav-guilds" },
  { to: "/forum",        tkey: "nav.forum",        icon: MessageSquare, testid: "nav-forum" },
  { to: "/shop",         tkey: "nav.shop",         icon: ShoppingBag, testid: "nav-shop" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  if (!user) return children;

  const xpPercent = user.xp_pct ?? 0;

  return (
    <div className="min-h-screen bg-[#030305] text-white flex relative">
      <StarField density={120} />

      <aside className="hidden lg:flex flex-col w-64 border-r border-cyan-500/10 bg-gradient-to-b from-[#08080E]/95 to-[#050508]/95 backdrop-blur-xl sticky top-0 h-screen z-20">
        <div className="p-5 border-b border-cyan-500/10">
          <NavLink to="/feed" data-testid="logo-link">
            <Logo size={32} />
          </NavLink>
          <div className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 mt-1 font-bold">Codex du voyageur</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, tkey, icon: Icon, testid }) => (
            <NavLink key={to} to={to} data-testid={testid}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm relative ${isActive ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_14px_rgba(0,229,255,0.15)]" : "text-zinc-400 hover:text-white hover:bg-white/[0.03] border border-transparent"}`
              }>
              {({ isActive }) => (<>
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-cyan-400 shadow-[0_0_6px_rgba(0,229,255,0.8)]" />}
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-display tracking-wide">{t(tkey)}</span>
              </>)}
            </NavLink>
          ))}

          <NavLink to="/settings" data-testid="nav-settings"
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm mt-3 ${isActive ? "bg-white/5 text-white border border-white/10" : "text-zinc-500 hover:text-white hover:bg-white/[0.03] border border-transparent"}`}>
            <SettingsIcon className="w-4 h-4" />
            <span className="font-display tracking-wide">{t("nav.settings")}</span>
          </NavLink>

          {(user.role === "admin" || user.role === "moderator") && (
            <NavLink to="/admin" data-testid="nav-admin"
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm ${isActive ? "bg-violet-500/10 text-violet-300 border border-violet-500/40" : "text-violet-300/60 hover:text-violet-200 hover:bg-violet-500/5 border border-transparent"}`}>
              <Shield className="w-4 h-4" />
              <span className="font-display tracking-wide">{t("nav.admin")}</span>
            </NavLink>
          )}
        </nav>

        <div className="p-4 border-t border-cyan-500/10">
          <div className="rounded-xl bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10 border border-cyan-500/20 p-3 relative overflow-hidden" data-testid="sidebar-user-card">
            <div className="absolute -top-8 -right-8 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-bold text-xs ring-1 ring-cyan-500/40 overflow-hidden">
                  {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : user.username[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-display font-bold truncate" data-testid="sidebar-username">{user.username}</div>
                  <div className="text-[9px] uppercase tracking-[0.25em] text-cyan-400 font-bold">{user.rank}</div>
                </div>
              </div>
              <div className="text-[10px] font-mono-stat text-zinc-400 flex justify-between mb-1.5">
                <span>{t("common.level")} <span className="text-cyan-300" data-testid="sidebar-level">{user.level}</span></span>
                <span className="text-yellow-400" data-testid="sidebar-aether">{user.aether} ✦</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.6)]" style={{ width: `${xpPercent}%` }} />
              </div>
              <button onClick={async () => { await logout(); navigate("/"); }}
                className="mt-3 w-full text-[10px] uppercase tracking-widest text-zinc-500 hover:text-red-400 flex items-center justify-center gap-1 py-1.5 rounded border border-white/5 hover:border-red-500/30 transition-all"
                data-testid="logout-btn">
                <LogOut className="w-3 h-3" /> {t("common.logout")}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#0A0A0E]/95 backdrop-blur-xl border-b border-cyan-500/10 px-4 py-2.5 flex items-center justify-between">
        <NavLink to="/feed"><Logo size={24} /></NavLink>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <div className="text-xs font-mono-stat flex items-center gap-1.5">
            <span className="text-cyan-300">Niv. {user.level}</span>
            <span className="text-yellow-400">{user.aether}✦</span>
          </div>
        </div>
      </div>

      {/* Desktop top-right utility bar */}
      <div className="hidden lg:flex fixed top-3 right-4 z-30 items-center gap-2">
        <LanguageSwitcher compact />
        <NotificationsBell />
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0E]/95 backdrop-blur-xl border-t border-cyan-500/10 grid grid-cols-5 py-2">
        {NAV.slice(0, 5).map(({ to, icon: Icon, testid, tkey }) => (
          <NavLink key={to} to={to} data-testid={`mobile-${testid}`}
            className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 py-1 transition-all ${isActive ? "text-cyan-400" : "text-zinc-500"}`}>
            <Icon className="w-5 h-5" />
            <span className="text-[8px] uppercase tracking-wider font-bold">{t(tkey).split(" ")[0]}</span>
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 min-w-0 pt-14 lg:pt-0 pb-20 lg:pb-0 relative z-10">{children}</main>
    </div>
  );
}
