import React from "react";
import { getRankBadgeSrc, resolveRank, RANK_BADGE_SIZES } from "@/lib/badge-assets";
import { getRankStyle } from "@/lib/rank-styles";

/**
 * Medallion de rang RPG — tailles calibrées pour sidebar, profil, légende, etc.
 */
export default function RankBadge({
  rank,
  user,
  level,
  size = "sm",
  className = "",
  showLabel = false,
  title,
  testid,
}) {
  const resolved = resolveRank(rank ?? user, level ?? user?.level);
  const src = getRankBadgeSrc(resolved);
  const px = RANK_BADGE_SIZES[size] || RANK_BADGE_SIZES.sm;
  const style = getRankStyle(resolved);

  return (
    <span
      className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}
      title={title || resolved}
      data-testid={testid || `rank-badge-${resolved}`}
      data-rank={resolved}
    >
      <img
        src={src}
        alt=""
        width={px}
        height={px}
        className="rounded-full object-cover"
        style={{
          width: px,
          height: px,
          filter: `drop-shadow(0 0 ${Math.max(4, px * 0.2)}px ${style.color}88)`,
        }}
        draggable={false}
      />
      {showLabel && (
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: style.color }}>
          {resolved}
        </span>
      )}
    </span>
  );
}
