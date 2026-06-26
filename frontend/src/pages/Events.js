/**
 * NEXORIA — Événements (chronique du monde).
 * Premium overview of scheduled events, world boss, seasons & dimensional rifts.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Flame, Calendar, Trophy, Zap, Globe2, Skull, Crown,
  ArrowRight, Sparkles, Clock, Target,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import StarField from "@/components/StarField";
import {
  PageShell,
  PremiumSection,
  PremiumCard,
  PremiumStat,
  PremiumButton,
} from "@/components/ui-premium";
import { usePageBanner } from "@/lib/page-banners";
import { useI18n } from "@/i18n/LanguageProvider";
import { translateChallenge } from "@/lib/translate-game";

const RIFT_THEME = {
  common:    { color: "#9CA3AF", glow: "rgba(156,163,175,0.5)" },
  rare:      { color: "#3B82F6", glow: "rgba(59,130,246,0.6)" },
  epic:      { color: "#A855F7", glow: "rgba(168,85,247,0.6)" },
  legendary: { color: "#EAB308", glow: "rgba(234,179,8,0.7)" },
  mythic:    { color: "#EF4444", glow: "rgba(239,68,68,0.75)" },
  divine:    { color: "#FBBF24", glow: "rgba(251,191,36,0.8)" },
  cosmic:    { color: "#00E5FF", glow: "rgba(0,229,255,0.9)" },
};

export default function Events() {
  const banner = usePageBanner("events");
  const { user } = useAuth();
  const { t, fmtDate } = useI18n();
  const [events, setEvents] = useState([]);
  const [communityChallenges, setCommunityChallenges] = useState([]);
  const [season, setSeason] = useState(null);
  const [rifts, setRifts] = useState([]);

  const timeRemaining = (iso) => {
    if (!iso) return null;
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return t("events.finished");
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatDate = (iso) => fmtDate(iso, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    api.get("/widgets/events").then((r) => setEvents(r.data || [])).catch(() => {});
    api.get("/community-challenges").then((r) => setCommunityChallenges(r.data || [])).catch(() => {});
    api.get("/seasons/current").then((r) => setSeason(r.data)).catch(() => {});
    api.get("/widgets/rifts-map").then((r) => setRifts(r.data || [])).catch(() => {});
  }, []);

  const featuredChallenge = communityChallenges[0];
  const featuredPct = featuredChallenge
    ? Math.min(100, featuredChallenge.percent ?? ((featuredChallenge.progress / featuredChallenge.target) * 100))
    : 0;
  const activeEvents = events.filter((e) => {
    if (!e.ends_at) return true;
    return new Date(e.ends_at).getTime() > Date.now();
  });

  return (
    <PageShell
      wide
      testid="events-page"
      banner={banner}
    >
      <StarField density={60} />
      <div className="space-y-8">

        {/* STATS */}
        <PremiumSection title={t("events.pulseTitle")} subtitle={t("events.pulseSub")} icon={Zap} tone="cyan">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <PremiumStat icon={Calendar} label={t("events.stat.events")} value={activeEvents.length} sub={t("events.stat.active")} tone="gold" testid="ev-stat-active" />
            <PremiumStat icon={Skull} label={t("events.stat.featured")} value={featuredChallenge ? `${Math.floor(featuredPct)}%` : "—"} sub={featuredChallenge ? translateChallenge(t, featuredChallenge).name : t("events.stat.none")} tone="red" testid="ev-stat-boss" />
            <PremiumStat icon={Crown} label={t("events.stat.season")} value={season?.name?.slice(0, 12) || "—"} sub={season ? timeRemaining(season.ends_at) : t("events.stat.inactive")} tone="violet" testid="ev-stat-season" />
            <PremiumStat icon={Sparkles} label={t("events.stat.rifts")} value={rifts.length} sub={t("events.stat.detected")} tone="emerald" testid="ev-stat-rifts" />
          </div>
        </PremiumSection>

        {season && (
          <PremiumSection title={t("events.seasonTitle")} icon={Crown} tone="gold">
            <SeasonBanner season={season} t={t} formatDate={formatDate} timeRemaining={timeRemaining} />
          </PremiumSection>
        )}

        {communityChallenges.length > 0 && (
          <PremiumSection title={t("events.challengesTitle")} subtitle={t("events.challengesSub")} icon={Target} tone="violet">
            <div className="grid gap-3 sm:grid-cols-2" data-testid="community-challenges-list">
              {communityChallenges.map((c, i) => (
                <motion.div
                  key={c.challenge_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <CommunityChallengePanel challenge={c} t={t} />
                </motion.div>
              ))}
            </div>
          </PremiumSection>
        )}

        <PremiumSection title={t("events.calendarTitle")} subtitle={t("events.calendarSub", { count: events.length })} icon={Calendar} tone="violet">
          {events.length === 0 ? (
            <PremiumCard tone="violet" hover={false} className="text-center py-10">
              <Calendar className="w-12 h-12 text-purple-400/60 mx-auto mb-3" />
              <p className="text-zinc-400 italic">{t("events.calendarEmpty")}</p>
              <p className="text-zinc-600 text-xs mt-1">{t("events.calendarEmptyHint")}</p>
            </PremiumCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="events-list">
              {events.map((ev, i) => (
                <motion.div
                  key={ev.event_id || i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <EventCard ev={ev} t={t} formatDate={formatDate} timeRemaining={timeRemaining} />
                </motion.div>
              ))}
            </div>
          )}
        </PremiumSection>

        <PremiumSection title={t("events.riftsTitle")} subtitle={t("events.riftsSub")} icon={Globe2} tone="cyan">
          {rifts.length === 0 ? (
            <PremiumCard tone="cyan" hover={false} className="text-center py-8">
              <Sparkles className="w-10 h-10 text-cyan-400/60 mx-auto mb-2" />
              <p className="text-zinc-400 italic">{t("events.riftsEmpty")}</p>
            </PremiumCard>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="rifts-list">
              {rifts.slice(0, 20).map((r, i) => {
                const theme = RIFT_THEME[r.rarity] || RIFT_THEME.common;
                return (
                  <motion.div
                    key={r.rift_id || i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="relative rounded-xl border p-3 bg-gradient-to-br from-black/40 to-[#0F0820]/60"
                    style={{ borderColor: `${theme.color}55`, boxShadow: `0 0 14px ${theme.glow}` }}
                    data-testid={`rift-${i}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: theme.color, boxShadow: `0 0 8px ${theme.color}` }} />
                      <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: theme.color }}>
                        {r.rarity || "—"}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-300 font-bold">{r.item_name || r.name || t("events.unknownItem")}</div>
                    <div className="text-[9px] text-zinc-500 mt-1">
                      <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                      {r.created_at ? formatDate(r.created_at) : "—"}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </PremiumSection>

        <PremiumCard tone="gold" className="text-center" hover={false}>
          <Trophy className="w-10 h-10 text-yellow-300 mx-auto mb-2" />
          <h2 className="font-display font-black text-2xl text-white mb-1">{t("events.ctaTitle")}</h2>
          <p className="text-zinc-400 text-sm mb-4 max-w-xl mx-auto">
            {t("events.ctaBody")}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/leaderboards">
              <PremiumButton variant="gold" size="lg" icon={Trophy} testid="cta-leaderboards">
                {t("events.ctaLeaderboard")}
              </PremiumButton>
            </Link>
            <Link to={user ? "/quests" : "/login"}>
              <PremiumButton variant="violet" size="lg" icon={Target} testid="cta-quests">
                {user ? t("events.ctaQuests") : t("events.ctaJoin")}
              </PremiumButton>
            </Link>
          </div>
        </PremiumCard>
      </div>
    </PageShell>
  );
}

function SeasonBanner({ season, t, formatDate, timeRemaining }) {
  const startsAt = season.started_at ? new Date(season.started_at) : null;
  const endsAt = season.ends_at ? new Date(season.ends_at) : null;
  const totalMs = startsAt && endsAt ? endsAt - startsAt : 0;
  const elapsed = startsAt ? Date.now() - startsAt.getTime() : 0;
  const percent = totalMs > 0 ? Math.min(100, Math.max(0, (elapsed / totalMs) * 100)) : 0;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-yellow-400/40 p-6 bg-gradient-to-br from-amber-900/40 via-[#0F0820]/80 to-purple-900/40" data-testid="season-banner">
      <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full blur-3xl opacity-30 bg-yellow-400" />
      <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full blur-3xl opacity-20 bg-purple-500" />
      <div className="relative flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/2">
          <div className="text-[10px] uppercase tracking-[0.4em] text-yellow-300 font-bold mb-1">{t("events.season.current")}</div>
          <h3 className="font-display font-black text-3xl text-white">{season.name}</h3>
          <p className="text-zinc-300 text-sm italic mt-2 max-w-md">{season.description}</p>
          <div className="mt-4 flex items-center gap-4 text-[11px] text-zinc-400 font-mono-stat flex-wrap">
            <span><Clock className="w-3 h-3 inline mr-1 text-cyan-300" /> {t("events.season.start")} {formatDate(season.started_at)}</span>
            <span><Clock className="w-3 h-3 inline mr-1 text-yellow-300" /> {t("events.season.end")} {formatDate(season.ends_at)}</span>
          </div>
          <div className="mt-3">
            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300"
                style={{ boxShadow: "0 0 14px rgba(252,211,77,0.7)" }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono-stat mt-1">
              <span className="text-yellow-300">{Math.floor(percent)}%</span>
              <span className="text-zinc-500">{t("events.season.remaining", { time: timeRemaining(season.ends_at) })}</span>
            </div>
          </div>
        </div>
        <div className="lg:w-1/2 grid grid-cols-3 gap-2">
          {season.rewards?.top_1 && (
            <RewardTier label={t("events.rewardTier.top1")} tone="gold" data={season.rewards.top_1} t={t} />
          )}
          {season.rewards?.top_10 && (
            <RewardTier label={t("events.rewardTier.top10")} tone="violet" data={season.rewards.top_10} t={t} />
          )}
          {season.rewards?.top_50 && (
            <RewardTier label={t("events.rewardTier.top50")} tone="cyan" data={season.rewards.top_50} t={t} />
          )}
        </div>
      </div>
    </div>
  );
}

function RewardTier({ label, tone, data, t }) {
  const colors = {
    gold:   { c: "#FCD34D", bg: "from-amber-700/40 to-amber-900/20" },
    violet: { c: "#A855F7", bg: "from-purple-700/40 to-purple-900/20" },
    cyan:   { c: "#00E5FF", bg: "from-cyan-700/40 to-cyan-900/20" },
  }[tone] || { c: "#9CA3AF", bg: "from-zinc-700/40 to-zinc-900/20" };
  return (
    <div
      className={`relative rounded-xl border p-3 bg-gradient-to-br ${colors.bg} text-center`}
      style={{ borderColor: `${colors.c}55`, boxShadow: `0 0 16px ${colors.c}22` }}
    >
      <div className="text-[9px] uppercase tracking-[0.3em] font-bold" style={{ color: colors.c }}>{label}</div>
      <div className="font-mono-stat text-xl font-black mt-1 text-white">{data.aether} ✦</div>
      {data.badge && <div className="text-[9px] text-zinc-400 mt-1">{t("events.rewardBadge")} {data.badge}</div>}
      {data.title && <div className="text-[9px] text-zinc-400">{t("events.rewardTitle")} {data.title}</div>}
    </div>
  );
}

function CommunityChallengePanel({ challenge, t }) {
  const c = translateChallenge(t, challenge);
  const pct = Math.min(100, c.percent ?? ((c.progress / Math.max(1, c.target)) * 100));
  const tones = {
    violet: "border-violet-500/35 text-violet-300",
    cyan: "border-cyan-500/35 text-cyan-300",
    amber: "border-amber-500/35 text-amber-300",
    gold: "border-yellow-500/35 text-yellow-300",
    emerald: "border-emerald-500/35 text-emerald-300",
  };
  const bars = {
    violet: "from-violet-600 to-fuchsia-400",
    cyan: "from-cyan-600 to-sky-400",
    amber: "from-amber-600 to-orange-400",
    gold: "from-yellow-600 to-amber-400",
    emerald: "from-emerald-600 to-teal-400",
  };
  const tone = tones[c.tone] || tones.violet;
  const bar = bars[c.tone] || bars.violet;

  return (
    <Link
      to={c.link || "/events"}
      className={`block rounded-2xl border p-5 bg-gradient-to-br from-black/40 to-[#0F0820]/70 hover:border-white/20 transition-colors ${tone.split(" ")[0]}`}
      data-testid={`events-challenge-${c.challenge_id}`}
    >
      <div className={`text-[10px] uppercase tracking-[0.35em] font-bold mb-1 ${tone.split(" ")[1]}`}>
        {c.action_label}
      </div>
      <h3 className="font-display font-black text-xl text-white">{c.name}</h3>
      <p className="text-zinc-400 text-sm italic mt-2 leading-relaxed">{c.description}</p>
      {c.reward_label && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-300 font-bold">
          <Trophy className="w-3.5 h-3.5 shrink-0" />
          <span>{c.reward_label}</span>
        </div>
      )}
      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-[11px] font-mono-stat">
          <span className="text-zinc-500">{t("events.progress")}</span>
          <span className={tone.split(" ")[1]}>
            {c.progress?.toLocaleString()} / {c.target?.toLocaleString()}
          </span>
        </div>
        <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden border border-white/[0.05]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className={`h-full rounded-full bg-gradient-to-r ${bar}`}
          />
        </div>
        <div className="text-right text-[10px] font-bold text-zinc-400">{Math.floor(pct)}%</div>
      </div>
    </Link>
  );
}

function EventCard({ ev, t, formatDate, timeRemaining }) {
  return (
    <PremiumCard tone="violet" testid={`event-${ev.event_id || ev.name}`}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg border border-purple-400/40 bg-purple-500/15 flex items-center justify-center shrink-0">
          <Flame className="w-6 h-6 text-purple-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-black text-base text-white truncate">{ev.name || ev.title || t("events.defaultEvent")}</div>
          <div className="text-xs text-zinc-400 italic line-clamp-2 mt-1 min-h-[2.4em]">
            {ev.description || "—"}
          </div>
          <div className="flex items-center gap-3 mt-3 text-[10px] font-mono-stat flex-wrap">
            {ev.starts_at && (
              <span className="text-cyan-300">
                <Calendar className="w-2.5 h-2.5 inline mr-0.5" /> {formatDate(ev.starts_at)}
              </span>
            )}
            {ev.ends_at && (
              <span className="text-yellow-300">
                <Clock className="w-2.5 h-2.5 inline mr-0.5" /> {timeRemaining(ev.ends_at)}
              </span>
            )}
          </div>
          {(ev.reward_xp > 0 || ev.reward_aether > 0) && (
            <div className="mt-2 text-[10px] text-amber-300 font-bold flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              {ev.reward_xp > 0 && `+${ev.reward_xp} XP`}
              {ev.reward_xp > 0 && ev.reward_aether > 0 && " · "}
              {ev.reward_aether > 0 && `+${ev.reward_aether} Écus`}
            </div>
          )}
        </div>
      </div>
    </PremiumCard>
  );
}
