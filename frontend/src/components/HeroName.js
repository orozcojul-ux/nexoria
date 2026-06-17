import React from "react";
import { Crown, ShieldCheck, Gem } from "lucide-react";
import { getRankStyle, rankFromLevel } from "@/lib/rank-styles";
import RankBadge from "@/components/RankBadge";

const VIP_NAME_STYLE = {
  background: "linear-gradient(92deg,#fde68a,#fbbf24 40%,#a855f7)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  textShadow: "0 0 12px rgba(251,191,36,0.4)",
};

function VipMark() {
  return (
    <Gem
      className="w-3 h-3 shrink-0"
      style={{ color: "#fbbf24", filter: "drop-shadow(0 0 5px rgba(251,191,36,0.7))" }}
      aria-label="VIP Nexus"
    />
  );
}

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

  const isVip = !!user.is_vip;

  const roleCfg = ROLE_CONFIG[role];
  if (roleCfg) {
    return (
      <span
        className={`font-display font-bold inline-flex items-center gap-1 ${sizeCls} ${className} ${isVip ? "nexoria-vip-name" : ""}`}
        title={isVip ? "VIP Nexus" : undefined}
      >
        {showIcon && (
          <roleCfg.icon
            className="w-3 h-3 shrink-0"
            style={{ color: roleCfg.color, filter: `drop-shadow(0 0 4px ${roleCfg.color}99)` }}
          />
        )}
        <span className={isVip ? "" : `${roleCfg.text} ${roleCfg.glow}`} style={isVip ? VIP_NAME_STYLE : undefined}>
          {username}
        </span>
        {isVip && <VipMark />}
      </span>
    );
  }

  const rankStyle = getRankStyle(rank);
  return (
    <span
      className={`font-display font-bold inline-flex items-center gap-1.5 ${sizeCls} ${className} ${isVip ? "nexoria-vip-name" : ""}`}
      title={isVip ? `${rank} · VIP Nexus` : rank}
      data-rank={rank}
    >
      <RankBadge rank={rank} size={size === "xl" ? "md" : size === "lg" ? "sm" : "xs"} />
      <span
        className={isVip ? "" : `${rankStyle.text} ${rankStyle.glow}`}
        style={isVip ? VIP_NAME_STYLE : { color: rankStyle.color }}
      >
        {username}
      </span>
      {isVip && <VipMark />}
    </span>
  );
}
