import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home, User as UserIcon, Network, Castle, Package, ScrollText, Eye,
  Trophy, Flame, Shield, LogOut, Sparkles, Sword
} from "lucide-react";

const NAV = [
  { to: "/feed", label: "Feed", icon: Home, testid: "nav-feed" },
  { to: "/hero", label: "Mon Héros", icon: UserIcon, testid: "nav-hero" },
  { to: "/skills", label: "Compétences", icon: Network, testid: "nav-skills" },
  { to: "/kingdom", label: "Royaume", icon: Castle, testid: "nav-kingdom" },
  { to: "/inventory", label: "Inventaire", icon: Package, testid: "nav-inventory" },
  { to: "/quests", label: "Quêtes", icon: ScrollText, testid: "nav-quests" },
  { to: "/oracle", label: "Oracle", icon: Eye, testid: "nav-oracle" },
  { to: "/leaderboards", label: "Classements", icon: Trophy, testid: "nav-leaderboards" },
  { to: "/legends", label: "Hall des Légendes", icon: Flame, testid: "nav-legends" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return children;

  const xpNext = user.level < 999 ? Math.floor(100 * Math.pow(user.level + 1, 1.5)) : user.xp;
  const xpPercent = user.level < 999 ? Math.min(100, (user.xp / xpNext) * 100) : 100;

  return (
    <div className="min-h-screen bg-[#030305] text-white flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/5 bg-[#0A0A0E]/80 backdrop-blur-xl sticky top-0 h-screen">
        <div className="p-6 border-b border-white/5">
          <NavLink to="/feed" className="flex items-center gap-2" data-testid="logo-link">
            <Sword className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
            <span className="font-['Unbounded'] font-black text-xl bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-400 tracking-tight">
              NEXORIA
            </span>
          </NavLink>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon, testid }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                    : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span className="font-['Outfit']">{label}</span>
            </NavLink>
          ))}
          {user.role === "admin" && (
            <NavLink
              to="/admin"
              data-testid="nav-admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm mt-4 ${
                  isActive
                    ? "bg-violet-500/10 text-violet-300 border border-violet-500/40"
                    : "text-violet-300/60 hover:text-violet-200 hover:bg-violet-500/5 border border-transparent"
                }`
              }
            >
              <Shield className="w-4 h-4" />
              <span className="font-['Outfit']">Admin</span>
            </NavLink>
          )}
        </nav>

        {/* User card */}
        <div className="p-4 border-t border-white/5">
          <div className="rounded-xl bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10 border border-white/10 p-3" data-testid="sidebar-user-card">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-bold text-xs">
                {user.username[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" data-testid="sidebar-username">{user.username}</div>
                <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">{user.rank}</div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-zinc-400 flex justify-between">
              <span>Niv. <span className="text-cyan-300" data-testid="sidebar-level">{user.level}</span></span>
              <span className="text-yellow-400" data-testid="sidebar-aether">{user.aether} ✦</span>
            </div>
            <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.6)]"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <button
              onClick={async () => { await logout(); navigate("/"); }}
              className="mt-3 w-full text-xs text-zinc-400 hover:text-red-400 flex items-center justify-center gap-1 py-1.5 rounded border border-white/5 hover:border-red-500/30 transition-all"
              data-testid="logout-btn"
            >
              <LogOut className="w-3 h-3" /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#0A0A0E]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <NavLink to="/feed" className="flex items-center gap-2">
          <Sword className="w-5 h-5 text-cyan-400" />
          <span className="font-['Unbounded'] font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-400">NEXORIA</span>
        </NavLink>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-cyan-300">Niv. {user.level}</span>
          <span className="text-yellow-400">{user.aether}✦</span>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0E]/90 backdrop-blur-xl border-t border-white/5 grid grid-cols-5 py-2">
        {NAV.slice(0, 5).map(({ to, icon: Icon, testid }) => (
          <NavLink
            key={to}
            to={to}
            data-testid={`mobile-${testid}`}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center text-xs py-1 ${isActive ? "text-cyan-400" : "text-zinc-500"}`
            }
          >
            <Icon className="w-5 h-5" />
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 min-w-0 pt-14 lg:pt-0 pb-20 lg:pb-0">{children}</main>
    </div>
  );
}
