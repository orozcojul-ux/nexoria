/**
 * NEXORIA — Hall des Légendes (classements).
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown, Zap, Shield, Coins, Flame } from "lucide-react";
import api from "@/lib/api";
import HeroName from "@/components/HeroName";
import StarField from "@/components/StarField";
import { PageShell } from "@/components/ui-premium";
import { usePageBanner } from "@/lib/page-banners";

const CATEGORIES = [
  { id: "xp", label: "Expérience", icon: Zap, color: "#00E5FF", suffix: "XP" },
  { id: "level", label: "Rang", icon: Crown, color: "#9D4CDD", suffix: "Niv." },
  { id: "reputation", label: "Réputation", icon: Shield, color: "#FCD34D", suffix: "Rep." },
  { id: "aether", label: "Écus", icon: Coins, color: "#FBBF24", suffix: "✦" },
];

const PODIUM_TONE = ["#FCD34D", "#E5E7EB", "#F97316"];

export default function Leaderboards() {
  const banner = usePageBanner("leaderboards");
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
  const topValue = users[0] ? valueOf(users[0]) : 0;

  return (
    <PageShell
      wide
      testid="leaderboards-page"
      banner={banner}
    >
      <StarField density={40} />

      <div className="hub-page-header mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="font-display font-black text-lg text-white">Classement actif</h2>
            <p className="text-xs text-zinc-500 mt-1">
              {users.length} héros · N°1 : <HeroName user={users[0]} size="sm" showIcon={false} className="inline" />
              {users[0] ? ` · ${topValue.toLocaleString()} ${activeCat.suffix}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2" data-testid="leaderboard-tabs">
            {CATEGORIES.map((c) => {
              const Ico = c.icon;
              const isActive = cat === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCat(c.id)}
                  data-testid={`tab-${c.id}`}
                  className={`hub-tab-pill flex items-center gap-2 ${isActive ? "hub-tab-pill--active" : ""}`}
                  style={isActive ? { borderColor: `${c.color}66`, boxShadow: `0 0 14px ${c.color}33` } : undefined}
                >
                  <Ico className="w-3.5 h-3.5" style={{ color: isActive ? c.color : "#71717a" }} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="hub-stat-pill"><Trophy className="w-3 h-3 text-amber-400" /> {activeCat.label}</span>
          <span className="hub-stat-pill"><Flame className="w-3 h-3 text-cyan-400" /> {users.length} classés</span>
          <span className="hub-stat-pill"><Zap className="w-3 h-3 text-emerald-400" /> Live</span>
        </div>
      </div>

      <div className="lb-layout">
        <section className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold flex items-center gap-2">
            <Crown className="w-3.5 h-3.5 text-amber-400" /> Podium
          </h3>
          {podium.length === 0 && !loading ? (
            <div className="rounded-xl border border-white/10 bg-black/30 p-10 text-center text-zinc-500 italic text-sm">
              Aucun héros classé pour l'instant.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3" data-testid="podium">
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
          )}
        </section>

        <section>
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-3 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-cyan-400" /> Classement détaillé
          </h3>
          {loading ? (
            <div className="rounded-xl border border-white/10 bg-black/30 p-12 text-center">
              <Zap className="w-8 h-8 text-cyan-400 mx-auto animate-pulse mb-2" />
              <div className="text-zinc-400 text-sm italic">Compilation des annales...</div>
            </div>
          ) : rest.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/30 p-10 text-center text-zinc-500 italic text-sm">
              {podium.length > 0 ? "Seuls les trois premiers trônent pour l'instant." : "Le classement est vide."}
            </div>
          ) : (
            <div
              className="rounded-xl border border-white/10 bg-gradient-to-br from-[#0F0820]/90 to-[#0A0613]/90 overflow-hidden"
              data-testid="leaderboard-list"
              style={{ boxShadow: `0 0 20px ${activeCat.color}18` }}
            >
              <AnimatePresence mode="popLayout">
                {rest.map((u, i) => {
                  const rank = i + 4;
                  return (
                    <motion.div
                      key={u.user_id}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.015 }}
                      className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.04] transition-all group"
                      data-testid={`leaderboard-row-${rank}`}
                    >
                      <div className="w-9 text-center font-mono-stat font-bold text-sm text-zinc-500 group-hover:text-zinc-300">
                        #{rank}
                      </div>
                      <Link
                        to={`/profile/${u.username}`}
                        className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-display font-bold shrink-0 text-sm"
                      >
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          u.username?.[0]?.toUpperCase()
                        )}
                      </Link>
                      <Link to={`/profile/${u.username}`} className="flex-1 min-w-0">
                        <HeroName user={u} size="sm" />
                        <div className="text-[9px] uppercase tracking-wider text-zinc-500 truncate">
                          {u.class_name || "—"} · {u.rank || `Niv. ${u.level || 1}`}
                        </div>
                      </Link>
                      <div className="text-right font-mono-stat shrink-0">
                        <div className="text-base font-bold" style={{ color: activeCat.color }}>
                          {valueOf(u).toLocaleString()}
                        </div>
                        <div className="text-[8px] uppercase text-zinc-600">{activeCat.suffix}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function PodiumCard({ user, rank, color, metric, raised }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: rank * 0.06 }}
      className={`relative rounded-xl border p-4 bg-gradient-to-br from-[#0F0820]/95 to-[#0A0613]/95 overflow-hidden ${raised ? "lg:-translate-y-1" : ""}`}
      style={{ borderColor: `${color}55`, boxShadow: `0 0 20px ${color}33` }}
      data-testid={`podium-${rank}`}
    >
      <div className="flex items-center gap-3">
        <div className="font-display font-black text-2xl w-10 text-center" style={{ color }}>
          {rank === 1 ? <Crown className="w-7 h-7 mx-auto" /> : `#${rank}`}
        </div>
        <Link to={`/profile/${user.username}`} className="shrink-0">
          <div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-bold text-lg"
            style={{ boxShadow: `0 0 16px ${color}55` }}
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              user.username?.[0]?.toUpperCase()
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <HeroName user={user} size="sm" />
          <div className="text-[9px] uppercase tracking-wider text-zinc-500 truncate mt-0.5">
            {user.class_name || "—"}
          </div>
          <div
            className="mt-1.5 inline-block px-2 py-0.5 rounded-full border text-[10px] font-mono-stat font-bold"
            style={{ borderColor: `${color}66`, color }}
          >
            {metric}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
