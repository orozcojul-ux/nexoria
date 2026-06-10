import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Crown, Award } from "lucide-react";
import api from "@/lib/api";

const CATEGORIES = [
  { id: "xp", label: "XP", color: "#00E5FF" },
  { id: "level", label: "Niveau", color: "#9D4CDD" },
  { id: "reputation", label: "Réputation", color: "#FFD700" },
  { id: "aether", label: "Aether", color: "#EAB308" },
];

export default function Leaderboards() {
  const [cat, setCat] = useState("xp");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get(`/leaderboard/${cat}`).then((r) => setUsers(r.data));
  }, [cat]);

  const valueOf = (u) => u[cat] ?? 0;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="leaderboards-page">
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">Compétition</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">Classements <span className="text-gradient">Mondiaux</span></h1>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap" data-testid="leaderboard-tabs">
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} data-testid={`tab-${c.id}`}
            className={`px-4 py-2 rounded-md text-sm font-bold border transition-all ${cat === c.id ? "border-cyan-500/60 text-cyan-300 bg-cyan-500/10 glow-cyan" : "border-white/10 text-zinc-400 hover:border-white/20"}`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl overflow-hidden" data-testid="leaderboard-list">
        {users.map((u, i) => (
          <motion.div
            key={u.user_id}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
            className={`flex items-center gap-4 p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-all ${i < 3 ? "bg-gradient-to-r from-yellow-500/5 to-transparent" : ""}`}
            data-testid={`leaderboard-row-${i}`}
          >
            <div className={`w-10 text-center font-mono-stat font-bold text-lg ${i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-200" : i === 2 ? "text-orange-400" : "text-zinc-500"}`}>
              {i === 0 ? <Crown className="w-5 h-5 mx-auto drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" /> : `#${i + 1}`}
            </div>
            <Link to={`/profile/${u.username}`} className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-bold shrink-0">
              {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : u.username[0]?.toUpperCase()}
            </Link>
            <Link to={`/profile/${u.username}`} className="flex-1 min-w-0">
              <div className="font-display font-bold truncate">{u.username}</div>
              <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">{u.class_name} · {u.rank}</div>
            </Link>
            <div className="text-right font-mono-stat">
              <div className="text-xl font-bold text-cyan-300">{valueOf(u).toLocaleString()}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{cat}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
