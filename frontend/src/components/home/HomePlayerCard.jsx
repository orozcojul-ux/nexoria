import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Coins, Map } from "lucide-react";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import { useI18n } from "@/i18n/LanguageProvider";
import { translateClassName } from "@/lib/translate-class";
import HeroPixelAvatar from "@/components/HeroPixelAvatar";
import HeroCardOpener from "@/components/HeroCardOpener";
import UserCountryFlag from "@/components/UserCountryFlag";

export default function HomePlayerCard({ user }) {
  const { openNexus } = useNexusSocket();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const username = user?.username || t("feed.default_hero");
  const xpPct = Math.min(100, user?.xp_pct ?? 0);
  const fmt = locale || "fr-FR";

  const enterNexus = () => {
    openNexus?.();
    navigate("/nexus");
  };

  return (
    <motion.div
      className="feed-player-card"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.08 }}
      data-testid="feed-hero-widget"
    >
      <div className="feed-player-top">
        <div className="feed-player-avatar">
          <HeroPixelAvatar user={user} size={72} />
        </div>
        <div className="feed-player-info">
          <div className="feed-player-name inline-flex items-center gap-1.5">
            {username}
            <UserCountryFlag user={user} size="sm" />
          </div>
          <div className="feed-player-class">{translateClassName(t, user?.class_name)}</div>
          <div className="feed-player-meta">
            <span>{t("feed.level_short")} <strong>{user?.level ?? "—"}</strong></span>
            {user?.rank && <span>{user.rank}</span>}
            <span className="feed-player-ecus">
              <Coins className="w-3 h-3" />
              {(user?.aether ?? 0).toLocaleString(fmt)} {t("common.aether")}
            </span>
          </div>
        </div>
      </div>
      <div className="feed-player-xp">
        <div className="feed-player-xp-track">
          <div className="feed-player-xp-fill" style={{ width: `${xpPct}%` }} />
        </div>
        <div className="feed-player-xp-labels">
          <span>{(user?.xp ?? 0).toLocaleString(fmt)} {t("common.xp")}</span>
          <span>{Math.round(xpPct)}%</span>
        </div>
      </div>
      <div className="feed-player-actions">
        <button type="button" className="feed-nexus-btn" onClick={enterNexus}>
          <Map className="w-3.5 h-3.5" /> {t("feed.enter_nexus")}
        </button>
        <HeroCardOpener userId={user?.user_id} username={username} className="feed-hero-link">
          {t("feed.view_profile")} <ChevronRight className="w-3 h-3 inline" />
        </HeroCardOpener>
      </div>
    </motion.div>
  );
}
