import React from "react";
import { getClassBadgeSrc, RANK_BADGE_SIZES } from "@/lib/badge-assets";

export default function ClassBadge({
  classId,
  color = "#9D4CDD",
  size = "md",
  variant = "default",
  className = "",
}) {
  const src = getClassBadgeSrc(classId);
  const px = RANK_BADGE_SIZES[size] || RANK_BADGE_SIZES.md;
  if (!src) return null;

  const isMedallion = variant === "medallion";

  return (
    <img
      src={src}
      alt=""
      className={`${isMedallion ? "object-contain" : "rounded-xl object-cover"} ${className}`}
      width={px}
      height={px}
      style={{
        width: px,
        height: px,
        filter: isMedallion
          ? `drop-shadow(0 4px 16px ${color}88) drop-shadow(0 0 ${Math.max(10, px * 0.2)}px ${color}55)`
          : `drop-shadow(0 0 ${Math.max(6, px * 0.25)}px ${color}66)`,
      }}
      draggable={false}
      data-testid={`class-badge-${classId}`}
    />
  );
}
