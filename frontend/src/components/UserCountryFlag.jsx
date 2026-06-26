import React from "react";
import FlagIcon from "@/components/FlagIcon";
import { countryFlagCode, countryFlagEmoji } from "@/lib/countries";

const FLAG_ICON_SIZE = {
  xs: "xs",
  sm: "xs",
  base: "sm",
  lg: "sm",
  xl: "sm",
};

/** Small inline country flag for usernames — subtle, not oversized. */
export default function UserCountryFlag({ user, size = "xs", className = "" }) {
  const code = user?.country_code;
  if (!code) return null;

  const flagCode = user?.country_flag_iso ?? countryFlagCode(code);
  const emoji = user?.country_flag ?? countryFlagEmoji(code);
  const iconSize = FLAG_ICON_SIZE[size] || "xs";

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 align-middle opacity-90 ${className}`}
      aria-hidden
      data-testid="user-country-flag"
    >
      {flagCode ? (
        <FlagIcon code={flagCode} size={iconSize} />
      ) : (
        <span className="text-[11px] leading-none">{emoji || "🌍"}</span>
      )}
    </span>
  );
}
