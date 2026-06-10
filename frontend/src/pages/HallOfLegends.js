import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Crown } from "lucide-react";
import api from "@/lib/api";

export default function HallOfLegends() {
  const [legends, setLegends] = useState([]);

  useEffect(() => {
    api.get("/hall-of-legends").then((r) => setLegends(r.data));
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="legends-page">
      <div className="text-center mb-12">
        <Flame className="w-12 h-12 mx-auto text-yellow-400 drop-shadow-[0_0_16px_rgba(255,215,0,0.6)] mb-4" />
        <div className="text-[10px] uppercase tracking-[0.3em] text-yellow-400 font-bold mb-2">Mémoire éternelle</div>
        <h1 className="font-display font-black text-5xl sm:text-6xl tracking-tighter">
          Hall des <span className="text-gradient-gold">Légendes</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-3 max-w-2xl mx-auto">
          Les 10 héros les plus puissants de NEXORIA, gravés à jamais dans la pierre cosmique.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {legends.map((u, i) => (
          <motion.div
            key={u.user_id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={`glass rounded-2xl p-6 relative overflow-hidden ${i === 0 ? "glass-cyan glow-cyan" : ""}`}
            data-testid={`legend-${i}`}
          >
            {i < 3 && (
              <div className="absolute top-3 right-3">
                <Crown className={`w-5 h-5 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-200" : "text-orange-400"}`} />
              </div>
            )}
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-30" style={{ background: i === 0 ? "#FFD700" : "#9D4CDD" }} />
            <div className="relative">
              <div className="font-mono-stat text-5xl font-black text-cyan-300 mb-2">#{i + 1}</div>
              <Link to={`/profile/${u.username}`} className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-bold text-lg">
                  {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" /> : u.username[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-display font-black text-xl">{u.username}</div>
                  <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">{u.class_name}</div>
                </div>
              </Link>
              <div className="space-y-2 text-sm font-mono-stat">
                <div className="flex justify-between"><span className="text-zinc-400">Niveau</span><span className="text-cyan-300 font-bold">{u.level}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Rang</span><span className="text-violet-300">{u.rank}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">XP</span><span className="text-cyan-300">{u.xp.toLocaleString()}</span></div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
