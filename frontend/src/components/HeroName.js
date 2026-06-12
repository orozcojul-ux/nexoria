import React from "react";
import { Crown, ShieldCheck } from "lucide-react";

/**
 * Display a username with role-based color/icon.
 * Used everywhere a username appears (feed, comments, leaderboards, profile cards, chat).
 */
export default function HeroName({ user, className = "", showIcon = true, size = "sm" }) {
  if (!user) return null;
  const role = user.role || user.author_role;
  const username = user.username || user.author_username || "Anonyme";

  const config = {
    admin: { color: "#FFD700", label: "Sage", icon: Crown,
             glow: "drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]",
             text: "bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500" },
    moderator: { color: "#F97316", label: "Mod", icon: ShieldCheck,
                 glow: "drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]",
                 text: "bg-clip-text text-transparent bg-gradient-to-r from-orange-300 to-orange-500" },
  }[role];

  const sizeCls = { xs: "text-xs", sm: "text-sm", base: "text-base", lg: "text-lg" }[size] || "text-sm";

  if (!config) {
    return <span className={`font-display font-bold ${sizeCls} ${className}`}>{username}</span>;
  }

  return (
    <span className={`font-display font-bold inline-flex items-center gap-1 ${sizeCls} ${className}`}>
      {showIcon && <config.icon className="w-3 h-3" style={{ color: config.color, filter: `drop-shadow(0 0 4px ${config.color}99)` }} />}
      <span className={`${config.text} ${config.glow}`}>{username}</span>
    </span>
  );
}
