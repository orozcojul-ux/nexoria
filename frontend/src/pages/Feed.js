/**
 * NEXORIA — Feed / Dashboard Dark Fantasy Premium
 * 3-column MMORPG layout: Left (news) · Center (widgets) · Right (player card + quests + challenges)
 */
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import {
  Flame, Newspaper, ArrowRight, Trophy, Sparkles, Map,
  Scroll, ShoppingBag, Castle, Zap, Coins, Target, ChevronRight,
  Crown, Globe2,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import { useI18n } from "@/contexts/I18nContext";
import HeroName from "@/components/HeroName";
import { OnlinePlayersPanel } from "@/components/cms/DashboardPanels";
import { useRealmPulseStats } from "@/hooks/useRealmPulseStats";
import "./feed.css";

/* ─── Constants ──────────────────────────────────────────── */
const CAT_LABELS = {
  event:     "pub.news.cat.event",
  update:    "pub.news.cat.update",
  community: "pub.news.cat.community",
  announce:  "pub.news.cat.announce",
};
const CAT_BANNERS = {
  event:     "/assets/banners/events.webp",
  update:    "/assets/banners/admin.webp",
  community: "/assets/banners/guilds.webp",
  announce:  "/assets/banners/shop.webp",
};

const QUICK_LINKS = [
  { to: "/quests",      labelKey: "nav.quests",   icon: Scroll,      color: "#A855F7", bg: "rgba(168,85,247,0.14)" },
  { to: "/shop",        labelKey: "nav.shop",      icon: ShoppingBag, color: "#EAB308", bg: "rgba(234,179,8,0.12)"  },
  { to: "/oracle",      labelKey: "nav.oracle",    icon: Sparkles,    color: "#06B6D4", bg: "rgba(6,182,212,0.12)"  },
  { to: "/kingdom",     labelKey: "nav.kingdom",   icon: Castle,      color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  { to: "/events",      labelKey: "nav.events",    icon: Flame,       color: "#EF4444", bg: "rgba(239,68,68,0.12)"  },
  { to: "/leaderboards",labelKey: "nav.leaderboards", icon: Trophy,   color: "#F5C95B", bg: "rgba(245,201,91,0.12)" },
];

const CHALLENGE_ICON_MAP = {
  MessageSquare: LucideIcons.MessageSquare,
  ScrollText:    LucideIcons.ScrollText,
  Sparkles:      LucideIcons.Sparkles,
  Castle:        LucideIcons.Castle,
  Users:         LucideIcons.Users,
  Flame:         LucideIcons.Flame,
};

/* ─── Helpers ────────────────────────────────────────────── */
const fmtNum = (n) => (n == null ? "—" : Number(n).toLocaleString("fr-FR"));
const fmtScore = (n) => n == null ? "—" : n > 999 ? `${(n / 1000).toFixed(1)}k` : String(n);

const PUBLIC = process.env.PUBLIC_URL || "";
const FEED_BG = `${PUBLIC}/assets/backgrounds/nexoria-castle.webp`;

/* ─── Sub-components ─────────────────────────────────────── */
function PanelHead({ label, color = "#f5c95b", icon: Icon, count, extra }) {
  return (
    <div className="feed-panel-head">
      <div className="feed-panel-label" style={{ color }}>
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className="flex items-center gap-2">
        {extra}
        {count != null && <span className="feed-panel-count">{count}</span>}
      </div>
    </div>
  );
}

function FeaturedNewsCard({ article, index, t, lead = false }) {
  const cat = article.category || "announce";
  const image = article.image_url || CAT_BANNERS[cat] || CAT_BANNERS.announce;
  const summary = (article.content || "").trim();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      style={{ display: "flex", flexDirection: "column", minHeight: lead ? "15rem" : "9rem" }}
    >
      <Link
        to={`/news/${article.news_id}`}
        className="feed-news-card"
        style={{ flex: 1 }}
        data-testid={`feed-featured-news-${article.news_id}`}
      >
        <div className="feed-news-card-media" style={{ backgroundImage: `url(${image})` }}>
          <div className="feed-news-card-shade" />
        </div>
        <div className="feed-news-card-body">
          <span className="feed-news-badge">{t(CAT_LABELS[cat] || CAT_LABELS.announce)}</span>
          <h3 className="feed-news-card-title">{article.title}</h3>
          {summary && lead && <p className="feed-news-excerpt">{summary}</p>}
        </div>
      </Link>
    </motion.div>
  );
}

function NewsRow({ article, t }) {
  const cat = article.category || "announce";
  const image = article.image_url || CAT_BANNERS[cat] || CAT_BANNERS.announce;
  return (
    <Link
      to={`/news/${article.news_id}`}
      className="feed-news-row"
      data-testid={`feed-news-${article.news_id}`}
    >
      <div className="feed-news-row-img" style={{ backgroundImage: `url(${image})` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span className="feed-news-row-cat">{t(CAT_LABELS[cat] || CAT_LABELS.announce)}</span>
        <h3 className="feed-news-row-title">{article.title}</h3>
      </div>
      <span className="feed-news-row-btn">
        Lire <ArrowRight className="w-2.5 h-2.5 inline ml-0.5" />
      </span>
    </Link>
  );
}

function StatBox({ value, label, color = "feed-stat-val" }) {
  return (
    <div className="feed-stat-box">
      <div className={`feed-stat-val ${color}`} key={value}>{fmtNum(value)}</div>
      <div className="feed-stat-lbl">{label}</div>
    </div>
  );
}

function QuestItem({ quest }) {
  const pct = quest.completed ? 100 : Math.min(100, (quest.progress / quest.target) * 100);
  return (
    <div className="feed-quest-item" data-testid={`feed-quest-${quest.quest_id || quest.user_id_quest_id}`}>
      <div className="feed-quest-head">
        <span className="truncate" style={{ fontSize: "0.73rem" }}>{quest.name}</span>
        <span className="feed-quest-counter">{quest.progress}/{quest.target}</span>
      </div>
      <div className="feed-quest-track">
        <div
          className={`feed-quest-fill ${quest.completed ? "feed-quest-fill--done" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ChallengeCard({ challenge, index }) {
  const Icon = CHALLENGE_ICON_MAP[challenge.icon] || LucideIcons.Target;
  const tones = {
    violet: { border: "rgba(139,92,246,0.28)", icon: "rgba(168,85,247,0.15)", text: "#c084fc" },
    cyan:   { border: "rgba(0,212,255,0.22)",  icon: "rgba(0,212,255,0.12)",  text: "#22d3ee" },
    amber:  { border: "rgba(245,158,11,0.25)", icon: "rgba(245,158,11,0.12)", text: "#f59e0b" },
    gold:   { border: "rgba(245,201,91,0.25)", icon: "rgba(245,201,91,0.12)", text: "#f5c95b" },
    emerald:{ border: "rgba(52,211,153,0.25)", icon: "rgba(52,211,153,0.12)", text: "#4ade80" },
  };
  const t = tones[challenge.tone] || tones.violet;
  const pct = Math.min(100, challenge.percent ?? ((challenge.progress / Math.max(1, challenge.target)) * 100));
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="feed-challenge-card"
      style={{ borderColor: t.border }}
    >
      <div className="feed-challenge-top">
        <div className="feed-challenge-icon" style={{ background: t.icon, borderColor: t.border }}>
          <Icon className="w-3.5 h-3.5" style={{ color: t.text }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="feed-challenge-name">{challenge.name}</div>
          {challenge.description && (
            <div className="feed-challenge-desc" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {challenge.description}
            </div>
          )}
        </div>
      </div>
      {challenge.reward_label && (
        <div style={{ fontSize: "0.55rem", fontWeight: 700, color: "#f5c95b", letterSpacing: "0.06em" }}>
          🏆 {challenge.reward_label}
        </div>
      )}
      <div className="feed-challenge-prog">
        <div className="feed-challenge-track">
          <div className="feed-challenge-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${t.text}99,${t.text})` }} />
        </div>
        <span className="feed-challenge-pct" style={{ color: t.text }}>{Math.floor(pct)}%</span>
      </div>
    </motion.div>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export default function Feed() {
  const { user } = useAuth();
  const { openNexus } = useNexusSocket();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { siteOnline, visits, events, signups, updatedAt } = useRealmPulseStats();
  const [news, setNews] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [communityChallenges, setCommunityChallenges] = useState([]);
  const [quests, setQuests] = useState([]);

  useEffect(() => {
    api.get("/news", { params: { limit: 20 } }).then((r) => setNews(r.data || [])).catch(() => {});
    api.get("/leaderboard/xp").then((r) => setLeaderboard((r.data || []).slice(0, 5))).catch(() => {});
    api.get("/community-challenges").then((r) => setCommunityChallenges(r.data || [])).catch(() => {});
    api.get("/quests").then((r) => setQuests(r.data || [])).catch(() => {});
  }, []);

  const featured  = news.slice(0, 2);
  const moreNews  = news.slice(2);
  const dailyQ    = quests.filter((q) => q.type === "daily").slice(0, 3);
  const xpPct     = Math.min(100, user?.xp_pct ?? 0);

  const enterNexus = () => { openNexus?.(); navigate("/nexus"); };

  const username = user?.username || "Héros";
  const avatarUrl = user?.avatar_url;

  return (
    <div className="feed-page" data-testid="feed-page">
      {/* Background */}
      <div className="feed-bg" aria-hidden style={{ backgroundImage: `url(${FEED_BG})` }} />

      <div className="feed-inner">
        {/* ── Greeting ────────────────────────────────────── */}
        <motion.div
          className="feed-greeting"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="feed-kicker">✦ Tableau de Bord — NEXORIA</div>
          <h1 className="feed-title">
            Bonjour,{" "}
            <span className="feed-title-name">{username}</span> !
          </h1>
          <div className="feed-live-row">
            <div className="feed-live-badge">
              <span className="feed-live-dot" />
              En direct
            </div>
            <span style={{ fontSize: "0.58rem", color: "#52525b", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {user?.class_name} · Niv.{user?.level} · {user?.rank}
            </span>
          </div>
        </motion.div>

        {/* ── 3 columns ───────────────────────────────────── */}
        <div className="feed-grid">

          {/* ════ LEFT COLUMN — News ══════════════════════ */}
          <div className="feed-col">

            {/* Featured news */}
            <motion.div
              className="feed-panel"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <PanelHead
                label="À la une — Actualités du Royaume"
                icon={Newspaper}
                count={news.length > 0 ? `${news.length} article${news.length > 1 ? "s" : ""}` : undefined}
              />
              <div className="feed-panel-body">
                {news.length === 0 ? (
                  <div className="feed-empty" data-testid="feed-news-empty">
                    Les chroniques du royaume arrivent bientôt…
                  </div>
                ) : (
                  <div className="feed-featured-grid">
                    {featured.map((n, i) => (
                      <FeaturedNewsCard key={n.news_id} article={n} index={i} t={t} lead={i === 0} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* News list */}
            {moreNews.length > 0 && (
              <motion.div
                className="feed-panel"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
              >
                <PanelHead label="Actualités du Royaume" icon={Scroll} count={moreNews.length} />
                <div className="feed-panel-body">
                  <div className="feed-news-list">
                    {moreNews.map((n) => <NewsRow key={n.news_id} article={n} t={t} />)}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* ════ CENTER COLUMN — Widgets ════════════════ */}
          <div className="feed-col-center">

            {/* Nexus live button */}
            <motion.button
              type="button"
              className="feed-nexus-live-btn"
              onClick={enterNexus}
              data-testid="feed-enter-nexus"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Globe2 className="w-3.5 h-3.5" />
              ⚡ Nexus en direct — Entrer dans le monde
            </motion.button>

            {/* Realm pulse stats */}
            <motion.div
              className="feed-panel feed-panel--cyan"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.13 }}
              data-testid="dashboard-stats"
            >
              <PanelHead
                label="Pulsation du Royaume"
                color="#22d3ee"
                icon={Zap}
                extra={<span className="feed-live-dot" />}
              />
              <div className="feed-panel-body">
                <div className="feed-stats-grid">
                  <StatBox value={siteOnline} label="Sur le site"  color="feed-stat-val--cyan" key={`s-${siteOnline}-${updatedAt}`} />
                  <StatBox value={visits}     label="Visites 24h"  color="feed-stat-val--violet" key={`v-${visits}-${updatedAt}`} />
                  <StatBox value={events}     label="Événements"   color="feed-stat-val--gold" key={`e-${events}-${updatedAt}`} />
                  <StatBox value={signups}    label="Inscriptions" color="feed-stat-val--green" key={`i-${signups}-${updatedAt}`} />
                </div>
              </div>
            </motion.div>

            {/* Quick access */}
            <motion.div
              className="feed-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              data-testid="feed-quick-actions"
            >
              <PanelHead label="Accès Rapide" icon={Target} />
              <div className="feed-panel-body">
                <div className="feed-quick-grid">
                  {QUICK_LINKS.map(({ to, labelKey, icon: Icon, color, bg }) => (
                    <Link key={to} to={to} className="feed-quick-link" data-testid={`quick-link-${to}`}>
                      <div className="feed-quick-link-icon" style={{ background: bg, border: `1px solid ${color}40` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <span className="truncate">{t(labelKey)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Daily quests */}
            {dailyQ.length > 0 && (
              <motion.div
                className="feed-panel feed-panel--emerald"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.19 }}
                data-testid="feed-daily-quests"
              >
                <PanelHead label="Quêtes du Jour" color="#4ade80" icon={Scroll} />
                <div className="feed-panel-body">
                  {dailyQ.map((q) => <QuestItem key={q.quest_id || q.user_id_quest_id} quest={q} />)}
                  <Link to="/quests" className="feed-widget-more" style={{ color: "#4ade80" }}>
                    Toutes les quêtes <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Leaderboard */}
            <motion.div
              className="feed-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              data-testid="mini-leaderboard"
            >
              <PanelHead label="Top Héros" color="#f5c95b" icon={Trophy} />
              <div className="feed-panel-body">
                {leaderboard.length === 0 ? (
                  <div style={{ fontSize: "0.75rem", color: "#52525b", fontStyle: "italic", textAlign: "center", padding: "0.75rem 0" }}>
                    Chargement du classement…
                  </div>
                ) : (
                  leaderboard.map((u, i) => (
                    <Link
                      key={u.user_id}
                      to={`/profile/${u.username}`}
                      className="feed-lb-row"
                      data-testid={`mini-lb-${i}`}
                    >
                      <span className={`feed-lb-rank feed-lb-rank--${i + 1}`}>#{i + 1}</span>
                      <span className="feed-lb-name">
                        <HeroName user={u} size="sm" showIcon={false} />
                      </span>
                      <span className="feed-lb-score">{fmtScore(u.xp)} XP</span>
                    </Link>
                  ))
                )}
                <Link to="/leaderboards" className="feed-widget-more" style={{ color: "#f5c95b" }}>
                  Classement complet <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </motion.div>

            {/* Staff online */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <OnlinePlayersPanel />
            </motion.div>
          </div>

          {/* ════ RIGHT COLUMN — Player card + quests + challenges ═══ */}
          <div className="feed-col-right">

            {/* Player card */}
            <motion.div
              className="feed-player-card"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 }}
              data-testid="feed-hero-widget"
            >
              <div className="feed-player-top">
                <div className="feed-player-avatar">
                  {avatarUrl
                    ? <img src={avatarUrl} alt={username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : username[0]?.toUpperCase()
                  }
                </div>
                <div className="feed-player-info">
                  <div className="feed-player-name">{username}</div>
                  <div className="feed-player-class">{user?.class_name || "Héros"}</div>
                  <div className="feed-player-meta">
                    <span>Niv. <strong>{user?.level ?? "—"}</strong></span>
                    <span>{user?.rank}</span>
                    <span className="feed-player-ecus">
                      <Coins className="w-3 h-3" />
                      {(user?.aether ?? 0).toLocaleString()} Écus
                    </span>
                  </div>
                </div>
              </div>
              <div className="feed-player-xp">
                <div className="feed-player-xp-track">
                  <div className="feed-player-xp-fill" style={{ width: `${xpPct}%` }} />
                </div>
                <div className="feed-player-xp-labels">
                  <span>{(user?.xp ?? 0).toLocaleString()} XP</span>
                  <span>{Math.round(xpPct)}%</span>
                </div>
              </div>
              <div className="feed-player-actions">
                <button type="button" className="feed-nexus-btn" onClick={enterNexus}>
                  <Map className="w-3.5 h-3.5" /> Entrer dans le Nexus
                </button>
                <Link to="/hero" className="feed-hero-link">
                  Voir ma fiche <ChevronRight className="w-3 h-3 inline" />
                </Link>
              </div>
            </motion.div>

            {/* Quests right panel */}
            {dailyQ.length > 0 && (
              <motion.div
                className="feed-panel feed-panel--violet"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.14 }}
              >
                <PanelHead label="Quêtes du Jour" color="#c084fc" icon={Scroll} />
                <div className="feed-panel-body">
                  {dailyQ.map((q) => <QuestItem key={q.quest_id || q.user_id_quest_id} quest={q} />)}
                  <Link to="/quests" className="feed-widget-more" style={{ color: "#c084fc" }}>
                    Toutes les quêtes <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Community challenges */}
            {communityChallenges.length > 0 && (
              <motion.div
                className="feed-panel"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                data-testid="community-challenges-widget"
              >
                <PanelHead label="Défis du Royaume" icon={Crown} count={communityChallenges.length} />
                <div className="feed-panel-body">
                  <div className="feed-challenge-scroll">
                    {communityChallenges.map((c, i) => (
                      <ChallengeCard key={c.challenge_id} challenge={c} index={i} />
                    ))}
                  </div>
                  <Link to="/events" className="feed-widget-more" style={{ color: "#f5c95b" }}>
                    Tous les défis <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            )}
          </div>

        </div>{/* end feed-grid */}
      </div>{/* end feed-inner */}
    </div>
  );
}
