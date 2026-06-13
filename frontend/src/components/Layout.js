import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import {
  ScrollText, User as UserIcon, Network, Castle, Gem, Crosshair, Eye,
  Trophy, Flame, Shield, LogOut, ShoppingBag, Settings as SettingsIcon, Globe, Globe2, MessageSquare, Mail, Users
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
  { to: "/nexus",        tkey: "nav.nexus",        icon: Globe2,     testid: "nav-nexus" },
  { to: "/guilds",       tkey: "nav.guilds",       icon: Castle,     testid: "nav-guilds" },
  { to: "/forum",        tkey: "nav.forum",        icon: MessageSquare, testid: "nav-forum" },
  { to: "/friends",      tkey: "nav.friends",      icon: Users,      testid: "nav-friends" },
  { to: "/tickets",      tkey: "nav.tickets",      icon: Mail,       testid: "nav-tickets" },
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

      {/* Discord floating button - bottom right (above mobile nav) */}
      <a
        href={process.env.REACT_APP_DISCORD_URL || "https://discord.gg/RC5QjcWDCH"}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="discord-floating-btn"
        className="fixed right-4 bottom-24 lg:bottom-16 z-40 w-12 h-12 rounded-full flex items-center justify-center group transition-all hover:scale-110"
        style={{
          background: "linear-gradient(135deg, #5865F2 0%, #404EED 100%)",
          boxShadow: "0 6px 20px rgba(88,101,242,0.45), 0 0 0 1px rgba(255,255,255,0.06) inset",
        }}
        title="Rejoindre le Discord NEXORIA"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor" aria-hidden>
          <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      </a>

      {/* Global copyright footer */}
      <footer className="hidden lg:block fixed bottom-2 left-1/2 -translate-x-1/2 z-30 text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-mono-stat pointer-events-none select-none" data-testid="global-copyright">
        © {new Date().getFullYear()} NEXORIA · Codex du Voyageur
      </footer>
    </div>
  );
}
