import React from "react";

// Reusable NEXORIA logo using the uploaded PNG (with cosmic glow)
export default function Logo({ size = 28, withText = true, className = "" }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src="/logo.png"
        alt="NEXORIA"
        width={size}
        height={size}
        className="object-contain drop-shadow-[0_0_10px_rgba(157,76,221,0.6)]"
        style={{ filter: "drop-shadow(0 0 6px rgba(0,229,255,0.5))" }}
      />
      {withText && (
        <span className="font-display font-black text-xl bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-400 tracking-tight">
          NEXORIA
        </span>
      )}
    </div>
  );
}
