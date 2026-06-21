import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Trophy } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";
import HeroName from "@/components/HeroName";
import HeroCardOpener from "@/components/HeroCardOpener";
import HomePanel from "./HomePanel";
import { fmtScore } from "./home-constants";

export default function HomeTopHeroes({ leaderboard = [] }) {
  const { t } = useI18n();

  return (
    <div className="feed-col-widget" data-testid="mini-leaderboard">
      <HomePanel label={t("feed.top_heroes")} color="var(--home-gold)" icon={Trophy}>
        {leaderboard.length === 0 ? (
          <div className="feed-empty feed-empty--compact">
            {t("feed.leaderboard_loading")}
          </div>
        ) : (
          leaderboard.map((u, i) => (
            <HeroCardOpener
              key={u.user_id}
              userId={u.user_id}
              username={u.username}
              className="feed-lb-row"
              data-testid={`mini-lb-${i}`}
            >
              <span className={`feed-lb-rank feed-lb-rank--${i + 1}`}>#{i + 1}</span>
              <span className="feed-lb-name">
                <HeroName user={u} size="sm" showIcon={false} />
              </span>
              <span className="feed-lb-score">{fmtScore(u.xp)} {t("common.xp")}</span>
            </HeroCardOpener>
          ))
        )}
        <Link to="/legends" className="feed-widget-more" style={{ color: "var(--home-gold)" }}>
          {t("feed.leaderboard_link")} <ChevronRight className="w-3 h-3" />
        </Link>
      </HomePanel>
    </div>
  );
}
