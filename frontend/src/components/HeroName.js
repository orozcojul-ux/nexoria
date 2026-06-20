import React from "react";
import { Crown, ShieldCheck, Gem, Sparkles } from "lucide-react";
import { getRankStyle, rankFromLevel } from "@/lib/rank-styles";
import { getStaffVisuals } from "@/lib/staff-roles";
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

const STAFF_ICON = {
  supreme: Crown,
  admin: Sparkles,
  moderator: ShieldCheck,
};

const STAFF_TEXT = {
  supreme: "bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400",
  admin: "bg-clip-text text-transparent bg-gradient-to-r from-violet-300 via-purple-400 to-violet-500",
  moderator: "bg-clip-text text-transparent bg-gradient-to-r from-orange-300 to-orange-500",
};

/**
 * Username with staff role colors (priority) or RPG rank colors everywhere.
 */
export default function HeroName({ user, className = "", showIcon = true, size = "sm", nameColor = null }) {
  if (!user) return null;
  const role = user.role || user.author_role;
  const username = user.username || user.author_username || "Anonyme";
  const rank = user.rank || rankFromLevel(user.level);
  const sizeCls = { xs: "text-xs", sm: "text-sm", base: "text-base", lg: "text-lg", xl: "text-xl" }[size] || "text-sm";

  const isVip = !!user.is_vip;
  const customNameStyle = nameColor
    ? { color: nameColor, textShadow: `0 0 10px ${nameColor}66` }
    : null;

  const staffVisuals = getStaffVisuals(user);
  const staffKey = user.is_nexus_supreme ? "supreme" : (staffVisuals?.id || null);
  const roleCfg = staffVisuals
    ? {
        color: staffVisuals.color,
        label: staffVisuals.label,
        icon: STAFF_ICON[staffKey] || STAFF_ICON[staffVisuals.id] || Sparkles,
        text: STAFF_TEXT[staffKey] || STAFF_TEXT[staffVisuals.id] || "",
        glow: staffVisuals.glow,
      }
    : null;
  if (roleCfg) {
    return (
      <span
        className={`font-display font-bold inline-flex items-center gap-1 ${sizeCls} ${className} ${isVip && !nameColor ? "nexoria-vip-name" : ""}`}
        title={isVip ? "VIP Nexus" : undefined}
      >
        {showIcon && (
          <roleCfg.icon
            className="w-3 h-3 shrink-0"
            style={{ color: nameColor || roleCfg.color, filter: `drop-shadow(0 0 4px ${nameColor || roleCfg.color}99)` }}
          />
        )}
        <span
          className={customNameStyle ? "" : roleCfg.text}
          style={customNameStyle || { color: roleCfg.color, textShadow: `0 0 8px ${roleCfg.glow}` }}
        >
          {username}
        </span>
        {isVip && !nameColor && <VipMark />}
      </span>
    );
  }

  const rankStyle = getRankStyle(rank);
  return (
    <span
      className={`font-display font-bold inline-flex items-center gap-1.5 ${sizeCls} ${className} ${isVip && !nameColor ? "nexoria-vip-name" : ""}`}
      title={isVip ? `${rank} · VIP Nexus` : rank}
      data-rank={rank}
    >
      <RankBadge rank={rank} size={size === "xl" ? "md" : size === "lg" ? "sm" : "xs"} />
      <span
        className={customNameStyle ? "" : (isVip ? "" : `${rankStyle.text} ${rankStyle.glow}`)}
        style={customNameStyle || (isVip ? VIP_NAME_STYLE : { color: rankStyle.color })}
      >
        {username}
      </span>
      {isVip && !nameColor && <VipMark />}
    </span>
  );
}
