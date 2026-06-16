import React, { useMemo } from "react";
import { drawPixelBanner } from "@/lib/pixelArtUi";

export default function PixelBanner({ theme = "violet", width = 800, height = 280, className = "", children }) {
  const src = useMemo(() => drawPixelBanner(width, height, theme), [theme, width, height]);
  return (
    <div className={`relative overflow-hidden pixel-art ${className}`}>
      <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ imageRendering: "pixelated" }} />
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0613]/90 via-transparent to-transparent" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
