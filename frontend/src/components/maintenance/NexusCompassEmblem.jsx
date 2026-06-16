import React from "react";

export function NexusCompassEmblem({ size = 44 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <defs>
        <linearGradient id="nexGold" x1="24" y1="2" x2="24" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5E6B8" />
          <stop offset="0.45" stopColor="#D4A853" />
          <stop offset="1" stopColor="#9A6B2F" />
        </linearGradient>
        <linearGradient id="nexGoldGlow" x1="24" y1="14" x2="24" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF8E7" />
          <stop offset="1" stopColor="#C9A565" />
        </linearGradient>
      </defs>
      <path
        d="M24 4 L27 18 L24 14 L21 18 Z M24 44 L27 30 L24 34 L21 30 Z M4 24 L18 27 L14 24 L18 21 Z M44 24 L30 27 L34 24 L30 21 Z M9.5 9.5 L19 19 L16 16 L19 13 Z M38.5 9.5 L29 19 L32 16 L29 13 Z M9.5 38.5 L19 29 L16 32 L19 35 Z M38.5 38.5 L29 29 L32 32 L29 35 Z"
        fill="url(#nexGold)"
        opacity="0.95"
      />
      <path d="M24 12 L28 24 L24 20 L20 24 Z" fill="url(#nexGoldGlow)" />
      <rect x="22" y="22" width="4" height="4" transform="rotate(45 24 24)" fill="#FFF8E7" />
      <circle cx="24" cy="24" r="21" stroke="url(#nexGold)" strokeWidth="0.6" opacity="0.35" />
    </svg>
  );
}
