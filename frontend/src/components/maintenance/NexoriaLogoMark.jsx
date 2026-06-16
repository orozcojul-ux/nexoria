import React from "react";

/** Emblème NEXORIA — boussole dorée (style mockup maintenance) */
export function NexoriaLogoMark({ size = 44, className = "" }) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <defs>
        <linearGradient id={`${id}-gold`} x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF4D6" />
          <stop offset="0.35" stopColor="#E8C97A" />
          <stop offset="0.7" stopColor="#C9A565" />
          <stop offset="1" stopColor="#8B6914" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="32" cy="32" r="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgba(255,244,214,0.35)" />
          <stop offset="1" stopColor="rgba(201,165,101,0)" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#${id}-glow)`} />
      <circle cx="32" cy="32" r="28" stroke={`url(#${id}-gold)`} strokeWidth="1.2" opacity="0.5" />
      <path
        d="M32 8 L35.5 26 L32 22 L28.5 26 Z M32 56 L35.5 38 L32 42 L28.5 38 Z M8 32 L26 35.5 L22 32 L26 28.5 Z M56 32 L38 35.5 L42 32 L38 28.5 Z M14.5 14.5 L27 27 L23.5 23.5 L27 20 Z M49.5 14.5 L37 27 L40.5 23.5 L37 20 Z M14.5 49.5 L27 37 L23.5 40.5 L27 44 Z M49.5 49.5 L37 37 L40.5 40.5 L37 44 Z"
        fill={`url(#${id}-gold)`}
      />
      <path d="M32 18 L37 32 L32 28 L27 32 Z" fill="#FFF8E7" opacity="0.95" />
      <rect x="29" y="29" width="6" height="6" transform="rotate(45 32 32)" fill="#FFF8E7" />
      <circle cx="32" cy="32" r="3" fill="#F5E6B8" />
    </svg>
  );
}
