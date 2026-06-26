import React from "react";
import FlagIcon from "@/components/FlagIcon";
import { useI18n } from "@/contexts/I18nContext";
import { countryFlagCode, countryFlagEmoji } from "@/lib/countries";
import styles from "./HeroCard.module.css";

export default function HeroCountryBadge({ user, size = "md" }) {
  const { t } = useI18n();
  const code = user?.country_code;
  if (!code) return null;

  const flagCode = user?.country_flag_iso ?? countryFlagCode(code);
  const emoji = user?.country_flag ?? countryFlagEmoji(code);
  const label = t(`country.${code}`);

  return (
    <span
      className={`${styles.countryBadge}${size === "lg" ? ` ${styles.countryBadgeLg}` : ""}`}
      title={label}
      aria-label={label}
      data-testid="hero-country-badge"
    >
      {flagCode ? (
        <FlagIcon code={flagCode} size={size === "lg" ? "lg" : "sm"} />
      ) : (
        <span className={styles.countryBadgeEmoji} aria-hidden>{emoji || "🌍"}</span>
      )}
    </span>
  );
}
