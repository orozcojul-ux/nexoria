import React from "react";
import { Crown, ShieldCheck } from "lucide-react";
import { getRankStyle, rankFromLevel } from "@/lib/rank-styles";
import RankBadge from "@/components/RankBadge";

const ROLE_CONFIG = {
  admin: {
    color: "#FFD700",
    label: "Sage",
    icon: Crown,
    glow: "drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]",
    text: "bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500",
  },
  moderator: {
    color: "#F97316",
    label: "Mod",
    icon: ShieldCheck,
    glow: "drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]",
    text: "bg-clip-text text-transparent bg-gradient-to-r from-orange-300 to-orange-500",
  },
};

/**
 * Username with staff role colors (priority) or RPG rank colors everywhere.
 */
export default function HeroName({ user, className = "", showIcon = true, size = "sm" }) {
  if (!user) return null;
  const role = user.role || user.author_role;
  const username = user.username || user.author_username || "Anonyme";
  const rank = user.rank || rankFromLevel(user.level);
  const sizeCls = { xs: "text-xs", sm: "text-sm", base: "text-base", lg: "text-lg", xl: "text-xl" }[size] || "text-sm";

  const roleCfg = ROLE_CONFIG[role];
  if (roleCfg) {
    return (
      <span className={`font-display font-bold inline-flex items-center gap-1 ${sizeCls} ${className}`}>
        {showIcon && (
          <roleCfg.icon
            className="w-3 h-3 shrink-0"
            style={{ color: roleCfg.color, filter: `drop-shadow(0 0 4px ${roleCfg.color}99)` }}
          />
        )}
        <span className={`${roleCfg.text} ${roleCfg.glow}`}>{username}</span>
      </span>
    );
  }

  const rankStyle = getRankStyle(rank);
  return (
    <span
      className={`font-display font-bold inline-flex items-center gap-1.5 ${sizeCls} ${className}`}
      title={rank}
      data-rank={rank}
    >
      <RankBadge rank={rank} size={size === "xl" ? "md" : size === "lg" ? "sm" : "xs"} />
      <span className={`${rankStyle.text} ${rankStyle.glow}`} style={{ color: rankStyle.color }}>
        {username}
      </span>
    </span>
  );
}
