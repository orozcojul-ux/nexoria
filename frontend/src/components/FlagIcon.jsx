import React, { useState } from "react";

/** Small flag image — works on Windows where emoji flags often fail to render. */
export default function FlagIcon({ code = "fr", size = "sm", className = "" }) {
  const iso = (code || "fr").toLowerCase();
  const dims = size === "lg" ? { w: 24, h: 18 } : { w: 16, h: 12 };
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-[2px] bg-white/10 text-[8px] font-bold uppercase text-zinc-400 shrink-0 ${className}`}
        style={{ width: dims.w, height: dims.h }}
        aria-hidden
      >
        {iso.slice(0, 2)}
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/${dims.w}x${dims.h}/${iso}.png`}
      srcSet={`https://flagcdn.com/${dims.w * 2}x${dims.h * 2}/${iso}.png 2x`}
      alt=""
      aria-hidden
      width={dims.w}
      height={dims.h}
      onError={() => setFailed(true)}
      className={`inline-block rounded-[2px] object-cover shadow-sm shrink-0 ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}
