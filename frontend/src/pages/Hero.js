import React, { useEffect, useState, useCallback } from "react";
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
import { getRankStyle } from "@/lib/rank-styles";
import { useInventorySync } from "@/hooks/useInventorySync";

import { usePageBanner } from "@/lib/page-banners";

export default function Hero() {
  const { user, refresh } = useAuth();
  const banner = usePageBanner("hero");
  const [badges, setBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [chronicle, setChronicle] = useState([]);
  const [titles, setTitles] = useState([]);
  const [rift, setRift] = useState(null);

  const loadHeroData = useCallback(() => {
    if (!user) return;
    Promise.all([
      api.get("/badges/mine"),
      api.get("/game/badges"),
      api.get("/chronicle"),
      api.get("/game/titles"),
      api.get("/rifts/check"),
      api.post("/quests/daily-login").catch(() => {}),
    ]).then(([b, ab, c, t, r]) => {
      setBadges(b.data); setAllBadges(ab.data); setChronicle(c.data); setTitles(t.data);
      if (r.data?.rift) { setRift(r.data.rift); sfx.rift(); }
    });
  }, [user]);

  useEffect(() => { loadHeroData(); }, [loadHeroData]);

  useInventorySync(useCallback(() => {
    loadHeroData();
    refresh();
  }, [loadHeroData, refresh]));

  if (!user) return null;

  // XP progression comes from backend (single source of truth)
  const xpNext = user.xp_next ?? user.xp;
  const xpPct = user.xp_pct ?? 0;

  const dna = user.dna || {};
  const radarData = [
    { stat: "Créativité", value: dna.creativity || 0, fullMark: 100 },
    { stat: "Ambition", value: dna.ambition || 0, fullMark: 100 },
    { stat: "Sociabilité", value: dna.sociability || 0, fullMark: 100 },
    { stat: "Curiosité", value: dna.curiosity || 0, fullMark: 100 },
    { stat: "Persévérance", value: dna.persistence || 0, fullMark: 100 },
    { stat: "Influence", value: dna.influence || 0, fullMark: 100 },
  ];

  const badgeMap = Object.fromEntries(allBadges.map((b) => [b.id, b]));
  const ownedBadges = badges.map((b) => badgeMap[b.badge_id]).filter(Boolean);
  const activeTitle = titles.find((t) => t.id === user.active_title);

  const claimRift = async () => {
    try {
      const { data } = await api.post(`/rifts/${rift.rift_id}/claim`);
      sfx.chest();
      toast.success(`Trésors arrachés : ${data.rewards.join(", ")}`);
      setRift(null);
      await refresh();
    } catch (e) { toast.error("Erreur"); }
  };

  const setTitle = async (titleId) => {
    try {
      await api.put("/profile/title", { title_id: titleId });
      sfx.success();
      toast.success("Titre scellé sur votre étendard");
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Impossible d'équiper ce titre");
    }
  };

  const shareCard = () => {
    const url = `${window.location.origin}/profile/${user.username}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Sceau de votre carte copié"));
    sfx.click();
  };

  return (
    <PageShell
      wide
      testid="hero-page"
      banner={banner}
    >
      {rift && (
        <PremiumCard tone="violet" className="p-4 flex items-center gap-4 relative overflow-hidden" testid="rift-notification">
          <Sparkles className="w-8 h-8 text-violet-400 animate-pulse drop-shadow-[0_0_12px_rgba(157,76,221,0.8)]" />
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.4em] text-violet-300 font-bold">Déchirure dans la trame</div>
            <div className="font-display font-bold text-lg">{rift.name}</div>
            <div className="text-sm text-zinc-300 italic">{rift.description}</div>
          </div>
          <button onClick={claimRift} data-testid="claim-rift-btn"
            className="px-4 py-2 rounded-md border border-violet-500/50 text-violet-300 hover:shadow-[0_0_24px_rgba(157,76,221,0.5)] transition-all font-display font-bold tracking-wide text-sm">
            Saisir
          </button>
        </PremiumCard>
      )}

      {/* Hero Card — fully RPG character sheet style */}
      <div className="grid lg:grid-cols-12 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-5" data-testid="hero-card">
          <PremiumCard tone="cyan" className="p-6 relative overflow-hidden">

          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-bold mb-3 text-center">Carte du Héros</div>
            <div className="border-t border-white/10 mb-5" />

            <div className="flex items-start gap-4 mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-3xl font-display font-black border-2 border-cyan-500/50 shadow-[0_0_28px_rgba(0,229,255,0.3)]" data-testid="hero-avatar">
                  {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" /> : user.username[0]?.toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-[#0A0A0E] border border-cyan-500/50 rounded-full px-2 py-0.5 text-[10px] font-mono-stat text-cyan-300 font-bold">
                  Niv. {user.level}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div data-testid="hero-username"><HeroName user={user} size="xl" showIcon={false} /></div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-violet-300 font-bold flex items-center gap-1 mt-1" data-testid="hero-title">
                  <Crown className="w-3 h-3" />
                  {activeTitle?.name || "Novice"}
                </div>
                <div className="text-sm text-cyan-400 mt-1 font-display tracking-wide" data-testid="hero-class">{user.class_name}</div>
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
                  <div className="text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-bold">Rang</div>
                  <RankBadge rank={user.rank} size="md" />
                  <div className="font-bold text-sm" style={{ color: getRankStyle(user.rank).color }} data-testid="hero-rank">{user.rank}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-bold">Réputation</div>
                  <div className="text-violet-300 font-bold text-base" data-testid="hero-reputation">{user.reputation}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-bold">Aether</div>
                  <div className="text-yellow-400 font-bold text-base flex items-center justify-center gap-1" data-testid="hero-aether"><Coins className="w-3 h-3" />{user.aether}</div>
                </div>
              </div>
            </div>

            <button onClick={shareCard} data-testid="share-card-btn"
              className="mt-6 w-full py-2.5 rounded-md border border-cyan-500/30 text-cyan-300 hover:border-cyan-500/60 text-sm font-display font-bold tracking-wide flex items-center justify-center gap-2 transition-all">
              <Share2 className="w-3 h-3" /> Sceller en cristal partageable
            </button>
          </div>
          </PremiumCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="lg:col-span-4" data-testid="dna-radar">
          <PremiumCard tone="violet" className="p-6 relative">
          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-bold mb-1">Empreinte éthérique</div>
            <div className="font-display font-bold text-lg mb-2">Lecture d'âme</div>
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
          <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-bold">Annales</div>
          <div className="font-display font-bold text-base mb-3">Vos faits</div>
          {[
            { label: "Badges scellés", value: `${badges.length}/${allBadges.length}`, link: null },
            { label: "Étoiles à allumer", value: user.skill_points || 0, link: "/skills" },
            { label: "Disciples", value: user.followers || 0, link: null },
            { label: "Compagnons", value: user.following || 0, link: null },
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

      <PremiumCard tone="violet" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-bold">Sceaux gravés</div>
            <div className="font-display font-bold text-xl">Badges du voyageur — {badges.length}/{allBadges.length}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3" data-testid="badges-grid">
          {allBadges.map((b) => {
            const owned = ownedBadges.find((o) => o?.id === b.id);
            return (
              <div key={b.id} className={owned ? "" : "opacity-30 grayscale"}>
                <PremiumBadge badge={{ ...b, badge_id: b.id }} size="sm" testid={`badge-${b.id}`} />
                <div className="text-[8px] uppercase tracking-[0.15em] mt-1 text-center font-bold leading-tight text-zinc-400">{b.name}</div>
              </div>
            );
          })}
        </div>
      </PremiumCard>

      <PremiumCard tone="cyan" className="p-6" testid="titles-section">
        <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-bold">Étendards</div>
        <div className="font-display font-bold text-xl mb-4">Vos titres d'honneur</div>
        <div className="flex flex-wrap gap-2">
          {titles.map((t) => {
            const unlocked = t.unlocked ?? user.level >= t.unlock_level;
            const active = user.active_title === t.id;
            return (
              <button
                key={t.id}
                disabled={!unlocked}
                onClick={() => unlocked && setTitle(t.id)}
                data-testid={`title-${t.id}`}
                title={t.shop_only && !unlocked ? "À acheter en boutique" : undefined}
                className={`px-3 py-1.5 rounded-md text-xs font-display font-bold tracking-wide border transition-all ${active ? "bg-cyan-500/15 border-cyan-500/60 text-cyan-300 shadow-[0_0_16px_rgba(0,229,255,0.3)]" : unlocked ? "border-white/10 text-zinc-200 hover:border-cyan-500/30" : "border-white/5 text-zinc-600 cursor-not-allowed opacity-60"}`}
              >
                <Crown className="w-3 h-3 inline mr-1" />
                {t.name}
                {t.shop_only && !unlocked && <span className="ml-1 text-[10px] text-amber-500/80">Boutique</span>}
                {!t.shop_only && !unlocked && <span className="ml-1 text-[10px] opacity-60">Niv. {t.unlock_level}</span>}
              </button>
            );
          })}
        </div>
      </PremiumCard>

      <PremiumCard tone="gold" className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="w-4 h-4 text-yellow-500" />
          <div className="text-[10px] uppercase tracking-[0.4em] text-yellow-400 font-bold">Chronique vivante</div>
        </div>
        <div className="font-display font-bold text-xl mb-4">Le récit de votre voyage</div>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-2" data-testid="chronicle-list">
          {chronicle.length === 0 && <div className="text-sm text-zinc-500 italic">Le parchemin attend votre première trace...</div>}
          {chronicle.map((c) => (
            <div key={c.chronicle_id || c.created_at} className="flex gap-3 py-2 border-b border-yellow-500/10 last:border-0">
              <div className="w-1 bg-gradient-to-b from-yellow-500 to-cyan-400 rounded-full" />
              <div className="flex-1">
                <div className="text-sm text-zinc-200">{c.text}</div>
                <div className="text-[10px] font-mono-stat text-zinc-500 mt-0.5 uppercase tracking-widest">{new Date(c.created_at).toLocaleString("fr-FR")}</div>
              </div>
            </div>
          ))}
        </div>
      </PremiumCard>
    </PageShell>
  );
}
