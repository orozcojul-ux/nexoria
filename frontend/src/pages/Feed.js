/**
 * NEXORIA — Page d'accueil / Dashboard (Feed)
 */
import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useRealmPulseStats } from "@/hooks/useRealmPulseStats";
import {
  HomeHero,
  HomeFeaturedCards,
  HomeNewsList,
  HOME_FEATURED_NEWS_LIMIT,
  HomeOnlineHeroes,
  HomeNexusWheelBanner,
  HomeRealmPulse,
  HomeQuickAccess,
  HomeDailyQuests,
  HomeTopHeroes,
  HomePlayerCard,
  HomeRealmChallenges,
} from "@/components/home";
import "./feed.css";

const PUBLIC = process.env.PUBLIC_URL || "";
const FEED_BG = `${PUBLIC}/assets/backgrounds/nexoria-castle.webp`;

export default function Feed() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { siteOnline, visits, events, signups, updatedAt } = useRealmPulseStats();
  const [news, setNews] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [communityChallenges, setCommunityChallenges] = useState([]);
  const [quests, setQuests] = useState([]);

  useEffect(() => {
    api.get("/news", { params: { limit: 20 } }).then((r) => setNews(r.data || [])).catch(() => {});
    api.get("/leaderboard/xp").then((r) => setLeaderboard((r.data || []).slice(0, 5))).catch(() => {});
    api.get("/community-challenges").then((r) => setCommunityChallenges(r.data || [])).catch(() => {});
    api.post("/quests/daily-login").catch(() => {})
      .then(() => api.get("/quests"))
      .then((r) => setQuests(r.data || []))
      .catch(() => {});
  }, []);

  const dailyQ = quests.filter((q) => q.type === "daily").slice(0, 3);
  const username = user?.username || "Héros";

  return (
    <div className="feed-page" data-testid="feed-page">
      <div className="feed-bg" aria-hidden style={{ backgroundImage: `url(${FEED_BG})` }} />

      <div className="feed-inner">
        <HomeHero
          username={username}
          className={user?.class_name}
          level={user?.level}
          rank={user?.rank}
        />

        <HomeNexusWheelBanner />

        <div className="feed-grid">
          <div className="feed-col">
            <HomeFeaturedCards news={news} t={t} />
            <HomeNewsList news={news} t={t} skip={HOME_FEATURED_NEWS_LIMIT} />
            <HomeOnlineHeroes />
          </div>

          <div className="feed-col-center">
            <HomeRealmPulse
              siteOnline={siteOnline}
              visits={visits}
              events={events}
              signups={signups}
              updatedAt={updatedAt}
            />
            <HomeQuickAccess />
            <HomeDailyQuests quests={dailyQ} />
            <HomeTopHeroes leaderboard={leaderboard} />
          </div>

          <div className="feed-col-right">
            <HomePlayerCard user={user} />
            <HomeRealmChallenges challenges={communityChallenges} />
          </div>
        </div>
      </div>
    </div>
  );
}
