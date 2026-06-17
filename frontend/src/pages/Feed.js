/**
 * NEXORIA — Feed / Tableau de bord (actualités + widgets jeu)
 */
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Flame, Newspaper, ArrowRight, Trophy, Sparkles, Radio,
  Scroll, ShoppingBag, Castle, Map, Zap, Coins, Target, ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import { useI18n } from "@/contexts/I18nContext";
import HeroName from "@/components/HeroName";
import { OnlinePlayersPanel } from "@/components/cms/DashboardPanels";
import CommunityChallengesWidget from "@/components/CommunityChallengesWidget";
import { PremiumCard } from "@/components/ui-premium";
import { useRealmPulseStats } from "@/hooks/useRealmPulseStats";
import "./feed.css";

const FEATURED_NEWS = 3;

const CAT_LABELS = {
  event: "pub.news.cat.event",
  update: "pub.news.cat.update",
  community: "pub.news.cat.community",
  announce: "pub.news.cat.announce",
};

const CAT_BANNERS = {
  event: "/assets/banners/events.webp",
  update: "/assets/banners/admin.webp",
  community: "/assets/banners/guilds.webp",
  announce: "/assets/banners/shop.webp",
};

const CAT_ICONS = {
  event: "⚔",
  update: "📜",
  community: "👥",
  announce: "🗺",
};

const QUICK_LINKS = [
  { to: "/quests", labelKey: "nav.quests", icon: Scroll, color: "#A855F7" },
  { to: "/shop", labelKey: "nav.shop", icon: ShoppingBag, color: "#EAB308" },
  { to: "/oracle", labelKey: "nav.oracle", icon: Sparkles, color: "#06B6D4" },
  { to: "/kingdom", labelKey: "nav.kingdom", icon: Castle, color: "#F59E0B" },
  { to: "/events", labelKey: "nav.events", icon: Flame, color: "#EF4444" },
];

function FeaturedNewsCard({ article, index, t, lead = false }) {
  const cat = article.category || "announce";
  const catKey = CAT_LABELS[cat] || CAT_LABELS.announce;
  const image = article.image_url || CAT_BANNERS[cat] || CAT_BANNERS.announce;
  const icon = CAT_ICONS[cat] || CAT_ICONS.announce;
  const summary = (article.content || "").trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={lead ? "feed-news-card--lead" : undefined}
    >
      <Link
        to={`/news/${article.news_id}`}
        className="feed-news-card"
        data-testid={`feed-featured-news-${article.news_id}`}
      >
        <div className="feed-news-card-media" style={{ backgroundImage: `url(${image})` }}>
          <div className="feed-news-card-shade" />
        </div>
        <div className="feed-news-card-body">
          <span className="feed-news-cat">{t(catKey)}</span>
          <h3 className="feed-news-card-title">{article.title}</h3>
          {summary && <p className="feed-news-card-excerpt">{summary}</p>}
        </div>
        <span className="feed-news-card-icon" aria-hidden>{icon}</span>
      </Link>
    </motion.div>
  );
}

function NewsListItem({ article, index, t }) {
  const cat = article.category || "announce";
  const catKey = CAT_LABELS[cat] || CAT_LABELS.announce;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="feed-news-row"
      data-testid={`feed-news-${article.news_id}`}
    >
      <div className="feed-news-row-body">
        <span className="feed-news-row-cat">{t(catKey)}</span>
        <h3 className="feed-news-row-title">{article.title}</h3>
      </div>
      <Link
        to={`/news/${article.news_id}`}
        className="feed-news-row-btn"
        data-testid={`feed-news-read-${article.news_id}`}
      >
        {t("feed.news.read")}
        <ArrowRight className="w-3 h-3 inline ml-1" />
      </Link>
    </motion.div>
  );
}

function QuickActionsWidget() {
  const { t } = useI18n();
  return (
    <div className="feed-widget-panel" data-testid="feed-quick-actions">
      <div className="feed-widget-title text-violet-300">
        <Target className="w-3 h-3" /> {t("feed.quick_access")}
      </div>
      <div className="feed-quick-grid">
        {QUICK_LINKS.map(({ to, labelKey, icon: Icon, color }) => (
          <Link key={to} to={to} className="feed-quick-link">
            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
            <span className="truncate">{t(labelKey)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DailyQuestsWidget({ quests }) {
  const { t } = useI18n();
  const daily = quests.filter((q) => q.type === "daily").slice(0, 3);
  if (daily.length === 0) return null;

  return (
    <div className="feed-widget-panel" data-testid="feed-daily-quests">
      <div className="feed-widget-title text-emerald-300">
        <Scroll className="w-3 h-3" /> {t("feed.daily_quests")}
      </div>
      {daily.map((q) => {
        const pct = Math.min(100, (q.progress / q.target) * 100);
        return (
          <div key={q.quest_id || q.user_id_quest_id} className="feed-quest-item">
            <div className="feed-quest-head">
              <span className="truncate">{q.name}</span>
              <span className="shrink-0 text-zinc-500">{q.progress}/{q.target}</span>
            </div>
            <div className="feed-quest-track">
              <div
                className="feed-quest-fill"
                style={{ width: `${q.completed ? 100 : pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <Link to="/quests" className="feed-widget-link text-emerald-300 hover:text-emerald-200">
        {t("feed.all_quests")} <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const { openNexus } = useNexusSocket();
  const { t } = useI18n();
  const navigate = useNavigate();
  const {
    siteOnline, visits, events, signups, updatedAt,
  } = useRealmPulseStats();
  const [news, setNews] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [communityChallenges, setCommunityChallenges] = useState([]);
  const [quests, setQuests] = useState([]);

  useEffect(() => {
    api.get("/news", { params: { limit: 20 } })
      .then((r) => setNews(r.data || []))
      .catch(() => setNews([]));
    api.get("/leaderboard/xp").then((r) => setLeaderboard(r.data.slice(0, 5))).catch(() => {});
    api.get("/community-challenges").then((r) => setCommunityChallenges(r.data || [])).catch(() => {});
    api.get("/quests").then((r) => setQuests(r.data || [])).catch(() => {});
  }, []);

  const featured = news.slice(0, FEATURED_NEWS);
  const moreNews = news.slice(FEATURED_NEWS);
  const xpPct = user?.xp_pct ?? 0;

  const enterNexus = () => {
    openNexus?.();
    navigate("/nexus");
  };

  return (
    <div className="feed-page" data-testid="feed-page">
      <header className="feed-header">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--nx-accent)] font-bold mb-1">
            {t("feed.kicker")}
          </p>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white">
            {t("feed.greeting")}, <HeroName user={user} size="lg" showIcon={false} className="inline" />
          </h1>
        </div>
        <div className="feed-live-badge">
          <Radio className="w-3 h-3 animate-pulse" />
          {t("feed.live")}
        </div>
      </header>

      <div className="feed-dashboard">
        <div className="feed-main">
          <section className="feed-hero-bar" data-testid="feed-hero-widget">
            <div className="feed-hero-info">
              <div className="feed-hero-class">{user?.class_name}</div>
              <div className="feed-hero-meta">
                <span>Niv. <strong>{user?.level}</strong></span>
                <span>{user?.rank}</span>
                <span className="flex items-center gap-1 text-amber-300/90">
                  <Coins className="w-3 h-3" /> {user?.aether?.toLocaleString()} Écus
                </span>
              </div>
              <div className="feed-hero-xp">
                <div className="feed-hero-xp-track">
                  <div className="feed-hero-xp-fill" style={{ width: `${Math.min(100, xpPct)}%` }} />
                </div>
                <div className="feed-hero-xp-labels">
                  <span>{user?.xp?.toLocaleString()} XP</span>
                  <span>{Math.round(xpPct)}%</span>
                </div>
              </div>
            </div>
            <div className="feed-hero-actions">
              <button type="button" onClick={enterNexus} className="feed-hero-nexus-btn" data-testid="feed-enter-nexus">
                <Map className="w-3.5 h-3.5" /> Entrer dans le Nexus
              </button>
              <Link to="/hero" className="feed-hero-link">
                Voir ma fiche <ChevronRight className="w-3 h-3 inline" />
              </Link>
            </div>
          </section>

          <section data-testid="feed-featured-news-section">
            <div className="feed-section-head">
              <h2 className="feed-section-title">
                <Newspaper className="w-3.5 h-3.5 text-cyan-400" />
                {t("feed.news.kicker")} · {t("feed.news.section")}
              </h2>
              {news.length > 0 && (
                <span className="feed-section-count">{news.length} article{news.length > 1 ? "s" : ""}</span>
              )}
            </div>

            {news.length === 0 ? (
              <div className="feed-news-empty" data-testid="feed-news-empty">
                {t("feed.news.empty")}
              </div>
            ) : (
              <>
                {featured.length > 0 && (
                  <div className="feed-news-featured">
                    {featured.map((n, i) => (
                      <FeaturedNewsCard key={n.news_id} article={n} index={i} t={t} lead={i === 0} />
                    ))}
                  </div>
                )}
                {moreNews.length > 0 && (
                  <div className="feed-news-list">
                    <div className="feed-section-head" style={{ marginBottom: "0.65rem" }}>
                      <h3 className="feed-section-title">{t("feed.news.more")}</h3>
                      <span className="feed-section-count">{moreNews.length}</span>
                    </div>
                    {moreNews.map((n, i) => (
                      <NewsListItem key={n.news_id} article={n} index={i} t={t} />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <aside className="feed-sidebar">
          <div className="feed-widget-panel" data-testid="dashboard-stats">
            <div className="feed-widget-title text-cyan-300">
              <Zap className="w-3 h-3" />
              Pulsation du royaume
              <span className="feed-stat-live" title="Mise à jour en direct" />
            </div>
            <div className="feed-stats-grid">
              <div className="feed-stat-mini">
                <div className="feed-stat-mini-value feed-stat-mini-value--live" key={`site-${siteOnline}-${updatedAt}`}>
                  {siteOnline}
                </div>
                <div className="feed-stat-mini-label">{t("feed.stat.online")}</div>
              </div>
              <div className="feed-stat-mini">
                <div className="feed-stat-mini-value feed-stat-mini-value--live" key={`visits-${visits}-${updatedAt}`}>
                  {visits}
                </div>
                <div className="feed-stat-mini-label">{t("feed.stat.visits")}</div>
              </div>
              <div className="feed-stat-mini">
                <div className="feed-stat-mini-value feed-stat-mini-value--live" key={`events-${events}-${updatedAt}`}>
                  {events}
                </div>
                <div className="feed-stat-mini-label">{t("feed.stat.events")}</div>
              </div>
              <div className="feed-stat-mini">
                <div className="feed-stat-mini-value feed-stat-mini-value--live" key={`signups-${signups}-${updatedAt}`}>
                  {signups}
                </div>
                <div className="feed-stat-mini-label">{t("feed.stat.signups")}</div>
              </div>
            </div>
          </div>

          <QuickActionsWidget />
          <DailyQuestsWidget quests={quests} />

          <CommunityChallengesWidget challenges={communityChallenges} limit={3} />

          <PremiumCard tone="gold" testid="mini-leaderboard" className="!border-[var(--nx-border)] !bg-[var(--nx-surface)]">
            <div className="text-[10px] uppercase tracking-widest text-yellow-300 font-bold mb-3 flex items-center gap-1.5">
              <Trophy className="w-3 h-3" /> {t("feed.leaderboard")}
            </div>
            <div className="space-y-1">
              {leaderboard.map((u, i) => (
                <Link
                  to={`/profile/${u.username}`}
                  key={u.user_id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                  data-testid={`mini-leaderboard-${i}`}
                >
                  <span className={`font-mono-stat font-bold w-5 text-xs ${i === 0 ? "text-yellow-300" : "text-zinc-500"}`}>
                    #{i + 1}
                  </span>
                  <span className="text-sm flex-1 truncate">
                    <HeroName user={u} size="sm" showIcon={false} />
                  </span>
                  <span className="font-mono-stat text-xs text-[var(--nx-secondary)]">{u.level}</span>
                </Link>
              ))}
            </div>
            <Link to="/leaderboards" className="block mt-3 text-[10px] uppercase tracking-widest font-bold text-yellow-300 hover:text-yellow-200">
              {t("feed.leaderboard_link")} →
            </Link>
          </PremiumCard>

          <OnlinePlayersPanel />
        </aside>
      </div>
    </div>
  );
}
