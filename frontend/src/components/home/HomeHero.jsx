import React from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/i18n/LanguageProvider";
import UserCountryFlag from "@/components/UserCountryFlag";

export default function HomeHero({ user, username, className, level, rank }) {
  const { t } = useI18n();

  return (
    <motion.div
      className="feed-greeting"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      data-testid="home-hero"
    >
      <div className="feed-kicker">✦ {t("feed.dashboard_kicker")}</div>
      <h1 className="feed-title">
        {t("feed.greeting")},{" "}
        <span className="feed-title-name inline-flex items-center gap-2">
          {username}
          {user && <UserCountryFlag user={user} size="lg" />}
        </span>
        !
      </h1>
      {(className || level != null || rank) && (
        <div className="feed-live-row">
          <div className="feed-live-badge">
            <span className="feed-live-dot" />
            {t("feed.live_badge")}
          </div>
          <span className="feed-hero-meta">
            {[className, level != null ? `${t("feed.level_short")}${level}` : null, rank].filter(Boolean).join(" · ")}
          </span>
        </div>
      )}
    </motion.div>
  );
}
