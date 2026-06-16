import React, { useMemo } from "react";
import { getHeroAvatarDataURL } from "@/lib/NexusPixelArt";

/** Avatar pixel partagé — identique au sprite in-game */
export default function HeroPixelAvatar({ user, size = 40, className = "", style = {} }) {
  const classId = user?.class_id || "explorer";
  const role = user?.role || "user";
  const src = useMemo(() => getHeroAvatarDataURL(classId, role), [classId, role]);

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className={className}
        style={{ width: size, height: size, objectFit: "cover", borderRadius: "0.4rem", ...style }}
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={`pixel-art ${className}`}
      style={{
        width: size,
        height: Math.round(size * 1.4),
        imageRendering: "pixelated",
        objectFit: "contain",
        ...style,
      }}
    />
  );
}
