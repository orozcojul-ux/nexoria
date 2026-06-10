import React from "react";

// Reusable SVG ornaments inspired by ancient grimoires + cosmic runes
export function CornerOrnament({ className = "", flip = false, color = "rgba(0,229,255,0.5)" }) {
  return (
    <svg
      viewBox="0 0 60 60"
      className={`${className} ${flip ? "scale-x-[-1]" : ""}`}
      style={{ pointerEvents: "none" }}
    >
      <g fill="none" stroke={color} strokeWidth="1" strokeLinecap="round">
        <path d="M2 2 L2 30" />
        <path d="M2 2 L30 2" />
        <path d="M2 2 L18 18" opacity="0.6" />
        <circle cx="2" cy="2" r="2.5" fill={color} opacity="0.8" />
        <path d="M14 2 L14 8 M2 14 L8 14" opacity="0.5" />
      </g>
    </svg>
  );
}

export function RuneDivider({ className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      <svg viewBox="0 0 60 12" className="w-16 h-3">
        <g fill="none" stroke="rgba(0,229,255,0.7)" strokeWidth="0.8">
          <circle cx="6" cy="6" r="2.5" />
          <path d="M14 6 L22 6" />
          <path d="M30 1 L30 11 M25 6 L35 6 M26 2 L34 10 M34 2 L26 10" opacity="0.8" />
          <path d="M38 6 L46 6" />
          <circle cx="54" cy="6" r="2.5" />
        </g>
      </svg>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
    </div>
  );
}

export function OrnatePanel({ children, className = "", glowColor = "cyan", title }) {
  const colorMap = {
    cyan: "rgba(0,229,255,0.5)",
    violet: "rgba(157,76,221,0.5)",
    gold: "rgba(255,215,0,0.5)",
    crimson: "rgba(239,68,68,0.5)",
  };
  const c = colorMap[glowColor] || colorMap.cyan;
  return (
    <div className={`relative glass rounded-2xl ${className}`} style={{ borderColor: c.replace(/[\d.]+\)$/, "0.2)") }}>
      <CornerOrnament className="absolute top-1 left-1 w-6 h-6" color={c} />
      <CornerOrnament className="absolute top-1 right-1 w-6 h-6" flip color={c} />
      <CornerOrnament className="absolute bottom-1 left-1 w-6 h-6 scale-y-[-1]" color={c} />
      <CornerOrnament className="absolute bottom-1 right-1 w-6 h-6 scale-y-[-1]" flip color={c} />
      {title && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#030305] border border-current rounded-full text-[10px] uppercase tracking-[0.3em] font-bold font-display" style={{ color: c.replace("0.5)", "0.9)") }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

// Hexagonal seal — used as page identifier
export function RuneSeal({ icon: Icon, color = "#00E5FF", size = 40, className = "" }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" className="absolute inset-0">
        <polygon
          points="20,2 36,11 36,29 20,38 4,29 4,11"
          fill="none"
          stroke={color}
          strokeWidth="1"
          opacity="0.6"
        />
        <polygon
          points="20,7 31,13 31,27 20,33 9,27 9,13"
          fill={color}
          opacity="0.08"
        />
      </svg>
      {Icon && <Icon className="w-1/2 h-1/2 relative z-10" style={{ color, filter: `drop-shadow(0 0 6px ${color})` }} />}
    </div>
  );
}

// Decorative arcane circle for hero cards
export function ArcaneCircle({ className = "", color = "#9D4CDD" }) {
  return (
    <svg viewBox="0 0 200 200" className={`absolute pointer-events-none opacity-30 ${className}`}>
      <defs>
        <radialGradient id="rg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="80%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <g fill="none" stroke={color} strokeWidth="0.5">
        <circle cx="100" cy="100" r="90" opacity="0.6" />
        <circle cx="100" cy="100" r="80" opacity="0.3" />
        <circle cx="100" cy="100" r="60" strokeDasharray="2 4" opacity="0.4" />
        <polygon points="100,15 174,142 26,142" opacity="0.3" />
        <polygon points="100,185 26,58 174,58" opacity="0.3" />
      </g>
      {/* runes around the circle */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x = 100 + Math.cos(angle) * 90;
        const y = 100 + Math.sin(angle) * 90;
        return <circle key={i} cx={x} cy={y} r="1.5" fill={color} opacity="0.7" />;
      })}
    </svg>
  );
}
