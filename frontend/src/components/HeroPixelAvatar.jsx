import React, { useMemo } from "react";
import { getHeroAvatarDataURL } from "@/lib/NexusPixelArt";
import { getUserAvatarUrl } from "@/lib/user-avatar";

/** Avatar pixel partagé — identique au sprite in-game */
export default function HeroPixelAvatar({ user, size = 40, className = "", style = {} }) {
  const classId = user?.class_id || "explorer";
  const role = user?.role || "user";
  const pixelSrc = useMemo(() => getHeroAvatarDataURL(classId, role), [classId, role]);
  const avatarSrc = getUserAvatarUrl(user);

  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt=""
        className={className}
        style={{ width: size, height: size, objectFit: "cover", borderRadius: "0.4rem", ...style }}
      />
    );
  }

  return (
    <img
      src={pixelSrc}
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
