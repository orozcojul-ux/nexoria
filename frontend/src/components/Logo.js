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
        className="object-contain"
        style={{ filter: "drop-shadow(0 0 10px rgba(123,47,247,0.65)) drop-shadow(0 0 4px rgba(0,229,255,0.35))" }}
      />
      {withText && (
        <span className="font-display font-black text-xl bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-400 tracking-tight">
          NEXORIA
        </span>
      )}
    </div>
  );
}
