import React, { useState } from "react";
import { getClassImageSrc } from "@/lib/badge-assets";

/**
 * Premium class portrait. Centered, fixed-size, light glow.
 * Falls back to a styled empty frame if the image (or default.png) is missing.
 */
export default function ClassImage({
  classId,
  color = "#9D4CDD",
  size = 64,
  rounded = true,
  glow = true,
  className = "",
  style = {},
  alt = "",
}) {
  const [failed, setFailed] = useState(false);
  const src = getClassImageSrc(classId);
  const px = typeof size === "number" ? `${size}px` : size;

  const frameStyle = {
    width: px,
    height: px,
    borderRadius: rounded ? "14px" : "0",
    background:
      "radial-gradient(ellipse at 50% 32%, rgba(255,255,255,0.07) 0%, rgba(7,8,26,0.92) 70%)",
    border: `1px solid ${color}55`,
    boxShadow: glow
      ? `0 0 12px ${color}55, inset 0 0 18px rgba(0,0,0,0.45)`
      : "inset 0 0 18px rgba(0,0,0,0.45)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flex: "0 0 auto",
    ...style,
  };

  return (
    <span
      className={className}
      style={frameStyle}
      data-testid={`class-image-${classId || "unknown"}`}
    >
      {!failed && (
        <img
          src={src}
          alt={alt}
          draggable={false}
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
            filter: glow ? `drop-shadow(0 0 6px ${color}66)` : "none",
          }}
        />
      )}
    </span>
  );
}
