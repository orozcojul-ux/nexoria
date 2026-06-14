import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Users, Castle, Trophy, UserCheck,
  Globe2, MapPin, Calendar, Skull, Sparkles,
  Sword, Crosshair, Award, Gem, ShoppingBag,
  MessageSquare, Mail, Newspaper,
  Shield, Settings as SettingsIcon, LogOut, Eye, ScrollText,
} from "lucide-react";
import StarField from "./StarField";
import Logo from "./Logo";
import NotificationsBell from "./NotificationsBell";
import LanguageSwitcher from "./LanguageSwitcher";

const CATEGORIES = [
  {
    title: "Tableau de bord",
    items: [
      { to: "/feed", label: "Vue d'ensemble", icon: LayoutDashboard, testid: "nav-feed" },
    ],
  },
  {
    title: "Gestion joueurs",
    items: [
      { to: "/hero",         label: "Mon héros",   icon: UserCheck, testid: "nav-hero" },
      { to: "/friends",      label: "Joueurs",     icon: Users,     testid: "nav-friends" },
      { to: "/guilds",       label: "Guildes",     icon: Castle,    testid: "nav-guilds" },
      { to: "/leaderboards", label: "Classements", icon: Trophy,    testid: "nav-leaderboards" },
    ],
  },
  {
    title: "Monde",
    items: [
      { to: "/nexus",  label: "Nexus Online",   icon: Globe2,    testid: "nav-nexus" },
      { to: "/world",  label: "Salles",         icon: MapPin,    testid: "nav-world" },
      { to: "/events", label: "Événements",     icon: Calendar,  testid: "nav-events" },
      { to: "/legends",label: "Boss Mondiaux",  icon: Skull,     testid: "nav-legends" },
      { to: "/quests", label: "Failles & Quêtes", icon: Sparkles,testid: "nav-quests" },
    ],
  },
  {
    title: "Contenu",
    items: [
      { to: "/classes",   label: "Classes",   icon: Sword,        testid: "nav-classes" },
      { to: "/skills",    label: "Compétences", icon: Crosshair,  testid: "nav-skills" },
      { to: "/inventory", label: "Inventaire", icon: Gem,         testid: "nav-inventory" },
      { to: "/oracle",    label: "Oracle",    icon: Eye,          testid: "nav-oracle" },
      { to: "/shop",      label: "Boutique",  icon: ShoppingBag,  testid: "nav-shop" },
    ],
  },
  {
    title: "Communauté",
    items: [
      { to: "/forum",   label: "Tribune",    icon: ScrollText,    testid: "nav-forum" },
      { to: "/tickets", label: "Messagerie", icon: Mail,          testid: "nav-tickets" },
      { to: "/kingdom", label: "Royaume",    icon: Castle,        testid: "nav-kingdom" },
    ],
  },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return children;

  const xpPercent = user.xp_pct ?? 0;
  const discordUrl = process.env.REACT_APP_DISCORD_URL || "https://discord.gg/RC5QjcWDCH";

  return (
    <div className="min-h-screen bg-[#030305] text-white flex relative">
      <StarField density={120} />

      {/* ===== SIDEBAR ===== */}
      <aside
        className="hidden lg:flex flex-col w-72 sticky top-0 h-screen z-20 border-r border-violet-500/15 backdrop-blur-xl"
        style={{
          background:
            "linear-gradient(180deg, rgba(15,8,32,0.96) 0%, rgba(10,6,19,0.96) 60%, rgba(8,4,16,0.97) 100%)",
          boxShadow: "inset -1px 0 0 rgba(157,76,221,0.08), 4px 0 24px rgba(0,0,0,0.5)",
        }}
        data-testid="sidebar"
      >
        {/* === LOGO === */}
        <div className="px-5 pt-4 pb-3 border-b border-violet-500/10">
          <NavLink to="/feed" data-testid="logo-link" className="flex items-center gap-2">
            <Logo size={32} withText={false} />
            <span className="font-display font-black text-base tracking-[0.25em] bg-gradient-to-r from-violet-300 via-cyan-200 to-violet-300 bg-clip-text text-transparent">
              NEXORIA
            </span>
          </NavLink>
        </div>

        {/* === USER PROFILE CARD === */}
        <div className="px-3 pt-3 pb-2">
          <div
            className="relative rounded-xl p-3 overflow-hidden border border-violet-400/25"
            style={{
              background:
                "linear-gradient(135deg, rgba(157,76,221,0.12) 0%, rgba(0,229,255,0.06) 100%)",
              boxShadow: "0 0 24px rgba(157,76,221,0.18), inset 0 0 12px rgba(0,229,255,0.06)",
            }}
            data-testid="sidebar-user-card"
          >
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-40 bg-violet-500/40 pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-28 h-28 rounded-full blur-3xl opacity-30 bg-cyan-500/40 pointer-events-none" />
            <div className="relative flex items-center gap-3">
              <NavLink to="/hero" className="shrink-0 relative">
                <div
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-display font-black text-base ring-2 ring-violet-400/60 overflow-hidden"
                  style={{ boxShadow: "0 0 16px rgba(157,76,221,0.65)" }}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user.username?.[0]?.toUpperCase()
                  )}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-[#0F0820]"
                  style={{ boxShadow: "0 0 6px rgba(74,222,128,0.9)" }}
                  title="En ligne"
                />
              </NavLink>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-[0.25em] text-violet-300 font-bold mb-0.5">
                  Bienvenue
                </div>
                <div className="font-display font-black text-base text-white truncate" data-testid="sidebar-username">
                  {user.username}
                </div>
              </div>
            </div>

            <div className="relative mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] font-bold">
              <span className="text-cyan-300" data-testid="sidebar-rank">{user.rank || "Voyageur"}</span>
              <span className="text-yellow-300" data-testid="sidebar-aether">{user.aether ?? 0} ✦</span>
            </div>

            <div className="relative mt-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono-stat mb-1">
                <span className="text-zinc-400">Niveau <span className="text-cyan-300 font-bold" data-testid="sidebar-level">{user.level}</span></span>
                <span className="text-zinc-500">{Math.floor(xpPercent)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden border border-violet-400/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-400"
                  style={{ width: `${xpPercent}%`, boxShadow: "0 0 10px rgba(0,229,255,0.7)" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* === NAV CATEGORIES === */}
        <nav className="flex-1 px-3 pt-2 pb-3 space-y-4 overflow-y-auto sidebar-scroll">
          {CATEGORIES.map((cat) => (
            <div key={cat.title}>
              <div className="text-[9px] uppercase tracking-[0.35em] text-zinc-500 font-bold px-2 mb-1.5 flex items-center gap-2">
                <span className="h-px flex-none w-2 bg-violet-500/40" />
                <span>{cat.title}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-violet-500/30 to-transparent" />
              </div>
              <div className="space-y-0.5">
                {cat.items.map((it) => (
                  <NavItem key={it.to} {...it} />
                ))}
              </div>
            </div>
          ))}

          {/* External / utility */}
          <div>
            <div className="text-[9px] uppercase tracking-[0.35em] text-zinc-500 font-bold px-2 mb-1.5 flex items-center gap-2">
              <span className="h-px flex-none w-2 bg-violet-500/40" />
              <span>Liens</span>
              <span className="h-px flex-1 bg-gradient-to-r from-violet-500/30 to-transparent" />
            </div>
            <div className="space-y-0.5">
              <a
                href={discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="nav-discord"
                className="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-indigo-500/10 border border-transparent hover:border-indigo-400/30 transition-all"
              >
                <MessageSquare className="w-4 h-4 shrink-0 text-indigo-400" />
                <span className="font-display tracking-wide">Discord</span>
              </a>
              <NavLink to="/settings" data-testid="nav-settings"
                className={({ isActive }) => navItemClass(isActive)}>
                {({ isActive }) => (
                  <>
                    {isActive && <ActiveBar />}
                    <SettingsIcon className="w-4 h-4 shrink-0" />
                    <span className="font-display tracking-wide">Paramètres</span>
                  </>
                )}
              </NavLink>
              {(user.role === "admin" || user.role === "moderator") && (
                <NavLink to="/admin" data-testid="nav-admin"
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative ${
                      isActive
                        ? "text-yellow-200 bg-yellow-500/10 border border-yellow-400/40 shadow-[0_0_14px_rgba(252,211,77,0.25)]"
                        : "text-yellow-300/70 hover:text-yellow-200 hover:bg-yellow-500/5 border border-transparent hover:border-yellow-400/20"
                    }`
                  }
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span className="font-display tracking-wide">Panel Admin</span>
                </NavLink>
              )}
            </div>
          </div>
        </nav>

        {/* === LOGOUT === */}
        <div className="p-3 border-t border-violet-500/10">
          <button
            onClick={async () => { await logout(); navigate("/"); }}
            data-testid="logout-btn"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/5 text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500 hover:text-red-300 hover:border-red-400/40 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ===== MOBILE TOP BAR ===== */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#0A0A0E]/95 backdrop-blur-xl border-b border-violet-500/15 px-4 py-2.5 flex items-center justify-between">
        <NavLink to="/feed" className="flex items-center gap-2"><Logo size={24} withText={false} /><span className="font-display font-black text-xs tracking-[0.3em] text-white">NEXORIA</span></NavLink>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <div className="text-[10px] font-mono-stat flex items-center gap-1.5">
            <span className="text-cyan-300">Niv. {user.level}</span>
            <span className="text-yellow-400">{user.aether}✦</span>
          </div>
        </div>
      </div>

      {/* ===== DESKTOP TOP-RIGHT UTILITY BAR ===== */}
      <div className="hidden lg:flex fixed top-3 right-4 z-30 items-center gap-2">
        <LanguageSwitcher compact />
        <NotificationsBell />
      </div>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0E]/95 backdrop-blur-xl border-t border-violet-500/15 grid grid-cols-5 py-2">
        {[
          { to: "/feed", icon: LayoutDashboard, label: "Accueil" },
          { to: "/nexus", icon: Globe2, label: "Nexus" },
          { to: "/quests", icon: Sparkles, label: "Quêtes" },
          { to: "/shop", icon: ShoppingBag, label: "Boutique" },
          { to: "/hero", icon: UserCheck, label: "Héros" },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} data-testid={`mobile-nav-${to.slice(1)}`}
            className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 py-1 transition-all ${isActive ? "text-cyan-400" : "text-zinc-500"}`}>
            <Icon className="w-5 h-5" />
            <span className="text-[8px] uppercase tracking-wider font-bold">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ===== MAIN ===== */}
      <main className="flex-1 min-w-0 pt-14 lg:pt-0 pb-20 lg:pb-0 relative z-10">{children}</main>

      {/* ===== DISCORD FLOATING ===== */}
      <a
        href={discordUrl}
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

      <footer
        className="hidden lg:block fixed bottom-2 left-1/2 -translate-x-1/2 z-30 text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-mono-stat pointer-events-none select-none"
        data-testid="global-copyright"
      >
        © {new Date().getFullYear()} NEXORIA · Codex du Voyageur
      </footer>
    </div>
  );
}

function navItemClass(isActive) {
  return `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative ${
    isActive
      ? "text-violet-200 bg-violet-500/15 border border-violet-400/40 shadow-[0_0_18px_rgba(157,76,221,0.30)]"
      : "text-zinc-400 hover:text-white hover:bg-violet-500/[0.06] border border-transparent hover:border-violet-400/20"
  }`;
}

function ActiveBar() {
  return (
    <span
      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-gradient-to-b from-violet-400 to-cyan-400"
      style={{ boxShadow: "0 0 8px rgba(157,76,221,0.9)" }}
    />
  );
}

function NavItem({ to, label, icon: Icon, testid }) {
  return (
    <NavLink to={to} data-testid={testid} className={({ isActive }) => navItemClass(isActive)}>
      {({ isActive }) => (
        <>
          {isActive && <ActiveBar />}
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-violet-300" : "text-zinc-500 group-hover:text-violet-300"}`}
          />
          <span className="font-display tracking-wide truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}
