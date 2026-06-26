import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import * as Lucide from "lucide-react";
import { Sparkles, Crown, Share2, ChevronRight, Coins, Flame } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import { toast } from "sonner";
import { PremiumBadge, PremiumButton, PremiumCard, PremiumSection, PageShell } from "@/components/ui-premium";
import HeroName from "@/components/HeroName";
import RankBadge from "@/components/RankBadge";
import ClassImage from "@/components/ClassImage";
import { getUserAvatarUrl } from "@/lib/user-avatar";
import ClassChangeModal from "@/components/ClassChangeModal";
import { getRankStyle } from "@/lib/rank-styles";
import { useInventorySync } from "@/hooks/useInventorySync";

import { usePageBanner } from "@/lib/page-banners";
import { translateBadge, translateTitle, translateDnaStat, translateClassDetail } from "@/lib/translate-game";
import { translateClassName } from "@/lib/translate-class";
import { translateChronicle } from "@/lib/translate-chronicle";
import { useI18n } from "@/contexts/I18nContext";

export default function Hero() {
  const { t, fmtDate } = useI18n();
  const { user, refresh } = useAuth();
  const banner = usePageBanner("hero");
  const [badges, setBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [chronicle, setChronicle] = useState([]);
  const [titles, setTitles] = useState([]);
  const [rift, setRift] = useState(null);
  const [classModal, setClassModal] = useState(false);
  const [classPowers, setClassPowers] = useState([]);

  const loadHeroData = useCallback(() => {
    if (!user) return;
    Promise.all([
      api.get("/badges/mine"),
      api.get("/game/badges"),
      api.get("/chronicle"),
      api.get("/game/titles"),
      api.get("/rifts/check"),
      api.post("/quests/daily-login").catch(() => {}),
      api.get("/game/classes").catch(() => ({ data: [] })),
    ]).then(([b, ab, c, titlesRes, r, , cls]) => {
      setBadges(b.data); setAllBadges(ab.data); setChronicle(c.data); setTitles(titlesRes.data);
      if (r.data?.rift) { setRift(r.data.rift); sfx.rift(); }
      const myClass = (cls.data || []).find((x) => x.id === (user.class_id || user.class_name?.toLowerCase()));
      setClassPowers(translateClassDetail(t, myClass)?.powers || myClass?.powers || []);
    });
  }, [user, t]);

  useEffect(() => { loadHeroData(); }, [loadHeroData]);

  useInventorySync(useCallback(() => {
    loadHeroData();
    refresh();
  }, [loadHeroData, refresh]));

  const dna = user?.dna || {};
  const radarData = useMemo(() => [
    { stat: translateDnaStat(t, "creativity"), value: dna.creativity || 0, fullMark: 100 },
    { stat: translateDnaStat(t, "ambition"), value: dna.ambition || 0, fullMark: 100 },
    { stat: translateDnaStat(t, "sociability"), value: dna.sociability || 0, fullMark: 100 },
    { stat: translateDnaStat(t, "curiosity"), value: dna.curiosity || 0, fullMark: 100 },
    { stat: translateDnaStat(t, "persistence"), value: dna.persistence || 0, fullMark: 100 },
    { stat: translateDnaStat(t, "influence"), value: dna.influence || 0, fullMark: 100 },
  ], [dna, t]);

  if (!user) return null;

  const heroAvatarUrl = getUserAvatarUrl(user);

  // XP progression comes from backend (single source of truth)
  const xpNext = user.xp_next ?? user.xp;
  const xpPct = user.xp_pct ?? 0;

  const classDisplayName = translateClassName(t, user.class_id || user.class_name) || user.class_name;

  const badgeMap = Object.fromEntries(allBadges.map((b) => [b.id, b]));
  const ownedBadges = badges.map((b) => badgeMap[b.badge_id]).filter(Boolean);
  const activeTitle = titles.find((title) => title.id === user.active_title);
  const activeTitleLabel = activeTitle ? translateTitle(t, activeTitle) : translateTitle(t, user.active_title);

  const claimRift = async () => {
    try {
      const { data } = await api.post(`/rifts/${rift.rift_id}/claim`);
      sfx.chest();
      toast.success(t("page.hero.rift.claimed", { rewards: data.rewards.join(", ") }));
      setRift(null);
      await refresh();
    } catch (e) { toast.error(t("common.error")); }
  };

  const setTitle = async (titleId) => {
    try {
      await api.put("/profile/title", { title_id: titleId });
      sfx.success();
      toast.success(t("page.hero.titleEquipped"));
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || t("page.hero.titleEquipFailed"));
    }
  };

  const shareCard = () => {
    const url = `${window.location.origin}/profile/${user.username}`;
    navigator.clipboard.writeText(url).then(() => toast.success(t("page.hero.shareCopied")));
    sfx.click();
  };

  return (
    <PageShell
      wide
      testid="hero-page"
      banner={banner}
    >
      <ClassChangeModal
        open={classModal}
        onClose={() => setClassModal(false)}
        user={user}
        onChanged={async (profile) => {
          await refresh();
          if (profile?.class_id) {
            window.dispatchEvent(new CustomEvent("nexoria:nexus-class-changed", {
              detail: {
                user_id: profile.user_id,
                class_id: profile.class_id,
                class_name: profile.class_name,
                avatar_url: profile.avatar_url,
              },
            }));
          }
        }}
      />

      {rift && (
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -10 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          data-testid="rift-notification"
          className="relative overflow-hidden rounded-2xl border border-violet-500/60 p-5 flex items-center gap-5"
          style={{
            background: "linear-gradient(120deg,rgba(109,40,217,0.35) 0%,rgba(10,6,19,0.95) 60%,rgba(0,229,255,0.12) 100%)",
            boxShadow: "0 0 40px rgba(157,76,221,0.45), inset 0 0 60px rgba(109,40,217,0.15)",
          }}
        >
          {/* Animated glow orb */}
          <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full blur-3xl animate-pulse pointer-events-none"
            style={{ background: "rgba(157,76,221,0.4)" }} />
          <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-3xl animate-pulse pointer-events-none"
            style={{ background: "rgba(0,229,255,0.2)", animationDelay: "0.5s" }} />

          <div className="relative z-10 w-14 h-14 rounded-xl bg-violet-500/20 border border-violet-400/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-8 h-8 text-violet-300 animate-pulse" style={{ filter: "drop-shadow(0 0 12px rgba(157,76,221,0.9))" }} />
          </div>

          <div className="relative z-10 flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-[0.5em] text-violet-300/80 font-bold mb-0.5">⚡ {t("page.hero.rift.kicker")}</div>
            <div className="font-display font-black text-xl text-white">{rift.name}</div>
            <div className="text-sm text-zinc-300 italic mt-0.5">{rift.description}</div>
            <div className="mt-2 text-[11px] text-violet-200/70">
              {t("page.hero.rift.reward")} : <span className="font-bold text-violet-200">{rift.reward || t("page.hero.rift.unknown")}</span>
            </div>
          </div>

          <button
            onClick={claimRift}
            data-testid="claim-rift-btn"
            className="relative z-10 shrink-0 px-5 py-3 rounded-xl font-display font-black tracking-wide text-sm text-white transition-all hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
              boxShadow: "0 0 24px rgba(124,58,237,0.6)",
            }}
          >
            ⚔ {t("page.hero.rift.claim")}
          </button>
        </motion.div>
      )}

      {/* Hero Card — fully RPG character sheet style */}
      <div className="grid lg:grid-cols-12 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-5" data-testid="hero-card">
          <PremiumCard tone="cyan" className="p-6 relative overflow-hidden">

          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-bold mb-3 text-center">{t("page.hero.cardTitle")}</div>
            <div className="border-t border-white/10 mb-5" />

            <div className="flex items-start gap-4 mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-3xl font-display font-black border-2 border-cyan-500/50 shadow-[0_0_28px_rgba(0,229,255,0.3)]" data-testid="hero-avatar">
                  {heroAvatarUrl ? <img src={heroAvatarUrl} alt="" className="w-full h-full object-cover rounded-xl" /> : user.username[0]?.toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-[#0A0A0E] border border-cyan-500/50 rounded-full px-2 py-0.5 text-[10px] font-mono-stat text-cyan-300 font-bold">
                  {t("page.hero.levelShort")} {user.level}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div data-testid="hero-username"><HeroName user={user} size="xl" showIcon={false} /></div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-violet-300 font-bold flex items-center gap-1 mt-1" data-testid="hero-title">
                  <Crown className="w-3 h-3" />
                  {activeTitleLabel}
                </div>
                <div className="flex items-center gap-2 mt-1" data-testid="hero-class">
                  <ClassImage classId={user.class_id || user.class_name} color="#22d3ee" size={28} alt={user.class_name || ""} />
                  <span className="text-sm text-cyan-400 font-display tracking-wide">{classDisplayName}</span>
                  <button
                    onClick={() => setClassModal(true)}
                    data-testid="hero-change-class-btn"
                    className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-violet-500/40 text-violet-300 text-[10px] font-bold uppercase tracking-wider hover:bg-violet-500/10 transition-colors"
                    title={t("page.hero.changeClass")}
                  >
                    <Lucide.Repeat className="w-3 h-3" /> {t("page.hero.changeClassShort")}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 font-mono-stat text-sm">
              <div>
                <div className="flex justify-between mb-1 items-baseline">
                  <span className="text-zinc-400 text-[10px] uppercase tracking-widest">XP</span>
                  <span className="text-zinc-500 text-xs" data-testid="hero-xp">{user.xp.toLocaleString()} / {xpNext.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-cyan-500/20">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.6)] shimmer" style={{ width: `${xpPct}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5">
                <div className="text-center flex flex-col items-center gap-1">
                  <div className="text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-bold">{t("page.hero.rank")}</div>
                  <RankBadge rank={user.rank} size="md" />
                  <div className="font-bold text-sm" style={{ color: getRankStyle(user.rank).color }} data-testid="hero-rank">{user.rank}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-bold">{t("profile.stats.reputation")}</div>
                  <div className="text-violet-300 font-bold text-base" data-testid="hero-reputation">{user.reputation}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-bold">{t("profile.stats.ecus")}</div>
                  <div className="text-yellow-400 font-bold text-base flex items-center justify-center gap-1" data-testid="hero-aether"><Coins className="w-3 h-3" />{user.aether}</div>
                </div>
              </div>
            </div>

            <button onClick={shareCard} data-testid="share-card-btn"
              className="mt-6 w-full py-2.5 rounded-md border border-cyan-500/30 text-cyan-300 hover:border-cyan-500/60 text-sm font-display font-bold tracking-wide flex items-center justify-center gap-2 transition-all">
              <Share2 className="w-3 h-3" /> {t("page.hero.shareCrystal")}
            </button>
          </div>
          </PremiumCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="lg:col-span-4" data-testid="dna-radar">
          <PremiumCard tone="violet" className="p-6 relative">
          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-bold mb-1">{t("page.hero.dnaKicker")}</div>
            <div className="font-display font-bold text-lg mb-2">{t("page.hero.dnaTitle")}</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="stat" tick={{ fill: "#71717A", fontSize: 10 }} />
                  <Radar name="DNA" dataKey="value" stroke="#00E5FF" strokeWidth={2} fill="#00E5FF" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          </PremiumCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-3" data-testid="stats-card">
          <PremiumCard tone="cyan" className="p-6 space-y-2">
          <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-bold">{t("page.hero.annalesKicker")}</div>
          <div className="font-display font-bold text-base mb-3">{t("page.hero.annalesTitle")}</div>
          {[
            { label: t("page.hero.stat.badges"), value: `${badges.length}/${allBadges.length}`, link: null },
            { label: t("page.hero.stat.skillPoints"), value: user.skill_points || 0, link: "/skills" },
            { label: t("page.hero.stat.disciples"), value: user.followers || 0, link: null },
            { label: t("page.hero.stat.companions"), value: user.following || 0, link: null },
          ].map((s) => (
            <div key={s.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
              <span className="text-xs text-zinc-400 uppercase tracking-widest font-bold">{s.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono-stat text-cyan-300 font-bold">{s.value}</span>
                {s.link && <Link to={s.link} className="text-cyan-500 hover:text-cyan-300"><ChevronRight className="w-4 h-4" /></Link>}
              </div>
            </div>
          ))}
          </PremiumCard>
        </motion.div>
      </div>

      {classPowers.length > 0 && (
        <PremiumCard tone="violet" className="p-6">
          <div className="text-[10px] uppercase tracking-[0.4em] text-violet-400 font-bold mb-1">{t("page.hero.classPathKicker")}</div>
          <div className="font-display font-bold text-xl mb-4">{t("page.hero.powersOfClass", { className: classDisplayName })}</div>
          <div className="grid sm:grid-cols-3 gap-3">
            {classPowers.map((p) => (
              <div key={p.id} className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-xs font-bold text-violet-300">⚡</span>
                  <span className="font-display font-bold text-sm text-white">{p.name}</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </PremiumCard>
      )}

      <PremiumCard tone="violet" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-bold">{t("page.hero.badgesKicker")}</div>
            <div className="font-display font-bold text-xl">{t("page.hero.badgesTitle", { owned: badges.length, total: allBadges.length })}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3" data-testid="badges-grid">
          {allBadges.map((b) => {
            const owned = ownedBadges.find((o) => o?.id === b.id);
            return (
              <div key={b.id} className={owned ? "" : "opacity-30 grayscale"}>
                <PremiumBadge badge={{ ...b, badge_id: b.id }} size="sm" testid={`badge-${b.id}`} />
                <div className="text-[8px] uppercase tracking-[0.15em] mt-1 text-center font-bold leading-tight text-zinc-400">{translateBadge(t, b).name}</div>
              </div>
            );
          })}
        </div>
      </PremiumCard>

      <PremiumCard tone="cyan" className="p-6" testid="titles-section">
        <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-bold">{t("page.hero.titlesKicker")}</div>
        <div className="font-display font-bold text-xl mb-4">{t("page.hero.titlesTitle")}</div>
        <div className="flex flex-wrap gap-2">
          {titles.map((titleItem) => {
            const unlocked = titleItem.unlocked ?? user.level >= titleItem.unlock_level;
            const active = user.active_title === titleItem.id;
            return (
              <button
                key={titleItem.id}
                disabled={!unlocked}
                onClick={() => unlocked && setTitle(titleItem.id)}
                data-testid={`title-${titleItem.id}`}
                title={titleItem.shop_only && !unlocked ? t("page.hero.titleShopHint") : undefined}
                className={`px-3 py-1.5 rounded-md text-xs font-display font-bold tracking-wide border transition-all ${active ? "bg-cyan-500/15 border-cyan-500/60 text-cyan-300 shadow-[0_0_16px_rgba(0,229,255,0.3)]" : unlocked ? "border-white/10 text-zinc-200 hover:border-cyan-500/30" : "border-white/5 text-zinc-600 cursor-not-allowed opacity-60"}`}
              >
                <Crown className="w-3 h-3 inline mr-1" />
                {translateTitle(t, titleItem)}
                {titleItem.shop_only && !unlocked && <span className="ml-1 text-[10px] text-amber-500/80">{t("page.hero.titleShopTag")}</span>}
                {!titleItem.shop_only && !unlocked && <span className="ml-1 text-[10px] opacity-60">{t("page.hero.titleLevel", { level: titleItem.unlock_level })}</span>}
              </button>
            );
          })}
        </div>
      </PremiumCard>

      <PremiumCard tone="gold" className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="w-4 h-4 text-yellow-500" />
          <div className="text-[10px] uppercase tracking-[0.4em] text-yellow-400 font-bold">{t("page.hero.chronicleKicker")}</div>
        </div>
        <div className="font-display font-bold text-xl mb-4">{t("page.hero.chronicleTitle")}</div>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-2" data-testid="chronicle-list">
          {chronicle.length === 0 && <div className="text-sm text-zinc-500 italic">{t("page.hero.chronicleEmpty")}</div>}
          {chronicle.map((c) => (
            <div key={c.chronicle_id || c.created_at} className="flex gap-3 py-2 border-b border-yellow-500/10 last:border-0">
              <div className="w-1 bg-gradient-to-b from-yellow-500 to-cyan-400 rounded-full" />
              <div className="flex-1">
                <div className="text-sm text-zinc-200">{translateChronicle(t, c)}</div>
                <div className="text-[10px] font-mono-stat text-zinc-500 mt-0.5 uppercase tracking-widest">{fmtDate(c.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </PremiumCard>
    </PageShell>
  );
}
