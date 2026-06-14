/**
 * NEXORIA — Hall des Légendes (classements).
 * Premium leaderboards using the shared design system.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown, Zap, Shield, Coins, Flame } from "lucide-react";
import api from "@/lib/api";
import HeroName from "@/components/HeroName";
import StarField from "@/components/StarField";
import {
  PremiumHero,
  PremiumSection,
  PremiumStat,
  PremiumCard,
} from "@/components/ui-premium";

const CATEGORIES = [
  { id: "xp",         label: "Expérience", icon: Zap,    color: "#00E5FF", tone: "cyan",    suffix: "XP" },
  { id: "level",      label: "Rang",       icon: Crown,  color: "#9D4CDD", tone: "violet",  suffix: "Niv." },
  { id: "reputation", label: "Réputation", icon: Shield, color: "#FCD34D", tone: "gold",    suffix: "Rep." },
  { id: "aether",     label: "Aether",     icon: Coins,  color: "#FBBF24", tone: "gold",    suffix: "✦" },
];

const PODIUM_TONE = ["#FCD34D", "#E5E7EB", "#F97316"]; // gold / silver / bronze

export default function Leaderboards() {
  const [cat, setCat] = useState("xp");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const activeCat = CATEGORIES.find((c) => c.id === cat) || CATEGORIES[0];

  useEffect(() => {
    setLoading(true);
    api
      .get(`/leaderboard/${cat}`)
      .then((r) => setUsers(r.data || []))
      .finally(() => setLoading(false));
  }, [cat]);

  const valueOf = (u) => u?.[cat] ?? 0;
  const podium = users.slice(0, 3);
  const rest = users.slice(3, 50);
  const totalHeroes = users.length;
  const topValue = users[0] ? valueOf(users[0]) : 0;

  return (
    <div className="min-h-screen relative" data-testid="leaderboards-page">
      <StarField density={50} />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* HERO */}
        <PremiumHero
          kicker="Annales des héros"
          title={<>Hall des <span className="text-gradient-gold">Légendes</span></>}
          subtitle="Les noms gravés ici résonnent dans toutes les tavernes du royaume. Grimpe au sommet et inscris ta légende dans le cosmos."
          image="/shop/cristal_oracle.png"
          height={260}
          testid="leaderboards-hero"
        />

        {/* STATS */}
        <PremiumSection title="Vue d'ensemble" subtitle="Top global vivant" icon={Trophy} tone="gold">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <PremiumStat icon={Trophy} label="Catégorie" value={activeCat.label} sub={`Top ${users.length}`} tone={activeCat.tone} testid="lb-stat-cat" />
            <PremiumStat icon={Crown} label="N°1" value={users[0]?.username || "—"} sub={`${topValue.toLocaleString()} ${activeCat.suffix}`} tone="gold" testid="lb-stat-top1" />
            <PremiumStat icon={Flame} label="Héros classés" value={totalHeroes} sub="Présents au classement" tone="cyan" testid="lb-stat-total" />
            <PremiumStat icon={Zap} label="Mise à jour" value="Live" sub="Temps réel" tone="emerald" testid="lb-stat-live" />
          </div>
        </PremiumSection>

        {/* CATEGORY TABS */}
        <PremiumSection title="Choisis ton classement" icon={Trophy} tone="violet">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="leaderboard-tabs">
            {CATEGORIES.map((c) => {
              const Ico = c.icon;
              const isActive = cat === c.id;
              return (
                <motion.button
                  key={c.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setCat(c.id)}
                  data-testid={`tab-${c.id}`}
                  className={`relative rounded-xl border p-4 text-left transition-all overflow-hidden`}
                  style={{
                    borderColor: isActive ? `${c.color}80` : "rgba(255,255,255,0.10)",
                    background: isActive
                      ? `linear-gradient(135deg, ${c.color}22, transparent)`
                      : "rgba(15,8,32,0.5)",
                    boxShadow: isActive ? `0 0 24px ${c.color}55` : "none",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: `${c.color}22`,
                        boxShadow: isActive ? `0 0 16px ${c.color}66` : "none",
                      }}
                    >
                      <Ico className="w-5 h-5" style={{ color: c.color }} />
                    </div>
                    <div className="min-w-0">
                      <div
                        className="text-[10px] uppercase tracking-[0.3em] font-bold"
                        style={{ color: isActive ? c.color : "#71717A" }}
                      >
                        Trier par
                      </div>
                      <div
                        className="font-display font-black text-base truncate"
                        style={{ color: isActive ? "#fff" : "#A1A1AA" }}
                      >
                        {c.label}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </PremiumSection>

        {/* PODIUM */}
        {podium.length > 0 && (
          <PremiumSection title="Podium cosmique" subtitle="Les trois plus grands héros" icon={Crown} tone="gold">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="podium">
              {[1, 0, 2].map((idx) => {
                const u = podium[idx];
                if (!u) return <div key={idx} />;
                return (
                  <PodiumCard
                    key={u.user_id || idx}
                    user={u}
                    rank={idx + 1}
                    color={PODIUM_TONE[idx]}
                    metric={`${valueOf(u).toLocaleString()} ${activeCat.suffix}`}
                    raised={idx === 0}
                  />
                );
              })}
            </div>
          </PremiumSection>
        )}

        {/* FULL LIST */}
        <PremiumSection title="Classement détaillé" subtitle={`Rangs 4 → ${Math.min(50, totalHeroes)}`} icon={Trophy} tone="cyan">
          {loading ? (
            <PremiumCard tone="cyan" hover={false} className="text-center py-10">
              <Zap className="w-8 h-8 text-cyan-400 mx-auto animate-pulse mb-2" />
              <div className="text-zinc-400 text-sm italic">Compilation des annales...</div>
            </PremiumCard>
          ) : rest.length === 0 ? (
            <PremiumCard tone="cyan" hover={false} className="text-center py-10">
              <Trophy className="w-10 h-10 text-cyan-400/60 mx-auto mb-2" />
              <div className="text-zinc-400 italic text-sm">Aucun autre héros pour l'instant.</div>
            </PremiumCard>
          ) : (
            <div
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0F0820]/80 via-[#0A0613]/80 to-[#0F0820]/80 backdrop-blur overflow-hidden"
              data-testid="leaderboard-list"
              style={{ boxShadow: `0 0 24px ${activeCat.color}22` }}
            >
              <AnimatePresence mode="popLayout">
                {rest.map((u, i) => {
                  const rank = i + 4;
                  return (
                    <motion.div
                      key={u.user_id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.04] transition-all group"
                      data-testid={`leaderboard-row-${rank}`}
                    >
                      <div className="w-10 text-center font-mono-stat font-bold text-base text-zinc-500 group-hover:text-zinc-300 transition-colors">
                        #{rank}
                      </div>
                      <Link
                        to={`/profile/${u.username}`}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-display font-bold shrink-0 ring-1 ring-cyan-500/30 hover:ring-cyan-300/60 transition-all"
                      >
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          u.username?.[0]?.toUpperCase()
                        )}
                      </Link>
                      <Link to={`/profile/${u.username}`} className="flex-1 min-w-0">
                        <div className="truncate">
                          <HeroName user={u} size="base" />
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-bold truncate">
                          {u.class_name || "—"} · {u.rank || `Niv. ${u.level || 1}`}
                        </div>
                      </Link>
                      <div className="text-right font-mono-stat">
                        <div className="text-lg font-bold" style={{ color: activeCat.color }}>
                          {valueOf(u).toLocaleString()}
                        </div>
                        <div className="text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-bold">
                          {activeCat.suffix}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </PremiumSection>
      </div>
    </div>
  );
}

function PodiumCard({ user, rank, color, metric, raised }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: rank * 0.08 }}
      className={`relative rounded-2xl border p-5 bg-gradient-to-br from-[#0F0820]/95 via-[#0A0613]/95 to-[#1A0B3D]/80 backdrop-blur overflow-hidden ${raised ? "sm:-translate-y-3" : ""}`}
      style={{
        borderColor: `${color}66`,
        boxShadow: `0 0 32px ${color}55, inset 0 0 14px ${color}22`,
      }}
      data-testid={`podium-${rank}`}
    >
      <div className="absolute -top-12 -right-10 w-44 h-44 rounded-full blur-3xl opacity-40" style={{ background: color }} />
      <div className="relative flex flex-col items-center text-center">
        <div
          className="font-display font-black text-5xl"
          style={{ color, textShadow: `0 0 18px ${color}` }}
        >
          {rank === 1 ? <Crown className="w-12 h-12 mx-auto" style={{ filter: `drop-shadow(0 0 12px ${color})` }} /> : `#${rank}`}
        </div>
        <Link to={`/profile/${user.username}`} className="block mt-3">
          <div
            className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-display font-black text-3xl ring-2 hover:scale-105 transition-transform mx-auto"
            style={{ borderColor: color, boxShadow: `0 0 24px ${color}88` }}
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              user.username?.[0]?.toUpperCase()
            )}
          </div>
        </Link>
        <div className="mt-3">
          <HeroName user={user} size="lg" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mt-1 truncate max-w-full">
          {user.class_name || "—"} · {user.rank || `Niv. ${user.level || 1}`}
        </div>
        <div
          className="mt-3 px-4 py-1.5 rounded-full border font-mono-stat font-black text-sm"
          style={{ borderColor: `${color}80`, color, boxShadow: `inset 0 0 10px ${color}33` }}
        >
          {metric}
        </div>
      </div>
    </motion.div>
  );
}
