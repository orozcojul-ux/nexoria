import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Crown, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { RuneSeal, RuneDivider, ArcaneCircle } from "@/components/Ornaments";

export default function HallOfLegends() {
  const [legends, setLegends] = useState([]);

  useEffect(() => {
    api.get("/hall-of-legends").then((r) => setLegends(r.data));
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 relative" data-testid="legends-page">
      <ArcaneCircle className="top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] slow-spin opacity-10" color="#FFD700" />

      <div className="text-center mb-12 relative">
        <div className="flex justify-center mb-4">
          <RuneSeal icon={Flame} color="#FFD700" size={56} />
        </div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-yellow-400 font-bold mb-2">Mémoire éternelle</div>
        <h1 className="font-display font-black text-5xl sm:text-7xl tracking-tighter ancient-text">
          Panthéon
        </h1>
        <p className="text-zinc-400 text-sm mt-3 max-w-2xl mx-auto italic scroll-paragraph">
          « Dix noms gravés dans la pierre cosmique, dix flammes qui ne s'éteindront jamais.
          Ce sont les héros dont les enfants chanteront les légendes. »
        </p>
        <RuneDivider className="mt-6" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {legends.map((u, i) => (
          <motion.div
            key={u.user_id}
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={`relative rounded-2xl overflow-hidden group ${i === 0 ? "rune-border" : "glass border-yellow-500/20"}`}
            data-testid={`legend-${i}`}
          >
            {/* Background layer with pedestal feel */}
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 via-transparent to-black/40 pointer-events-none" />
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: i === 0 ? "#FFD700" : i === 1 ? "#9D4CDD" : "#00E5FF" }} />

            <div className="relative p-6">
              {i < 3 && (
                <div className="absolute top-4 right-4">
                  <Crown className={`w-6 h-6 ${i === 0 ? "text-yellow-400 drop-shadow-[0_0_12px_rgba(255,215,0,0.8)]" : i === 1 ? "text-zinc-200" : "text-orange-400"}`} />
                </div>
              )}

              {/* Rank carved like stone */}
              <div className="font-mono-stat text-6xl font-black opacity-40 leading-none tracking-tighter" style={{ color: i === 0 ? "#FFD700" : "#00E5FF" }}>
                #{(i + 1).toString().padStart(2, "0")}
              </div>
              <div className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-bold -mt-2 mb-4">Sceau du rang</div>

              <Link to={`/profile/${u.username}`} className="flex items-center gap-3 mb-5 group/link">
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-display font-black text-xl ring-2 ring-yellow-500/30 group-hover/link:ring-yellow-500/60 transition-all">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" /> : u.username[0]?.toUpperCase()}
                  </div>
                  {i === 0 && <Sparkles className="absolute -top-2 -right-2 w-4 h-4 text-yellow-400 animate-pulse" />}
                </div>
                <div>
                  <div className="font-display font-black text-xl tracking-tight">{u.username}</div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-bold">{u.class_name}</div>
                </div>
              </Link>

              <div className="space-y-1.5 text-sm font-mono-stat">
                <div className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Niveau</span>
                  <span className="text-cyan-300 font-bold">{u.level}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Rang</span>
                  <span className="text-violet-300">{u.rank}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-zinc-500 text-[10px] uppercase tracking-widest">XP</span>
                  <span className="text-cyan-300">{u.xp.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
