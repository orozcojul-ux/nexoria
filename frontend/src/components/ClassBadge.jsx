import React, { useState } from "react";
import { getClassImageSrc, RANK_BADGE_SIZES } from "@/lib/badge-assets";

export default function ClassBadge({
  classId,
  color = "#9D4CDD",
  size = "md",
  variant = "default",
  className = "",
}) {
  const [failed, setFailed] = useState(false);
  const src = getClassImageSrc(classId);
  const px = RANK_BADGE_SIZES[size] || RANK_BADGE_SIZES.md;

  const isMedallion = variant === "medallion";

  if (failed) {
    return (
      <span
        className={`${isMedallion ? "rounded-full" : "rounded-xl"} ${className}`}
        style={{
          width: px,
          height: px,
          display: "inline-block",
          background:
            "radial-gradient(ellipse at 50% 32%, rgba(255,255,255,0.07), rgba(7,8,26,0.92))",
          border: `1px solid ${color}55`,
          boxShadow: `0 0 12px ${color}55, inset 0 0 16px rgba(0,0,0,0.45)`,
        }}
        data-testid={`class-badge-${classId}`}
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className={`${isMedallion ? "rounded-full object-cover" : "rounded-xl object-cover"} ${className}`}
      width={px}
      height={px}
      style={{
        width: px,
        height: px,
        objectPosition: "center top",
        filter: isMedallion
          ? `drop-shadow(0 4px 16px ${color}88) drop-shadow(0 0 ${Math.max(10, px * 0.2)}px ${color}55)`
          : `drop-shadow(0 0 ${Math.max(6, px * 0.25)}px ${color}66)`,
      }}
      draggable={false}
      data-testid={`class-badge-${classId}`}
    />
  );
}
