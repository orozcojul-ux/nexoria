import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, ScrollText, Sparkles, Coins } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";

export default function Quests() {
  const { user, refresh } = useAuth();
  const [quests, setQuests] = useState([]);
  const [tab, setTab] = useState("daily");
  const [oracleQuest, setOracleQuest] = useState(null);
  const [loadingOracle, setLoadingOracle] = useState(false);

  const load = async () => {
    const { data } = await api.get("/quests");
    setQuests(data);
  };
  useEffect(() => { load(); }, []);

  const generateOracleQuest = async () => {
    setLoadingOracle(true);
    try {
      const { data } = await api.post("/oracle/quest");
      sfx.oracle();
      setOracleQuest(data);
    } catch { toast.error("L'Oracle est silencieux"); }
    finally { setLoadingOracle(false); }
  };

  const filtered = quests.filter((q) => q.type === tab);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="quests-page">
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">Missions</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">Quêtes du <span className="text-gradient">Héros</span></h1>
        <p className="text-zinc-400 text-sm mt-1">Accomplissez des missions pour gagner XP et Aether.</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap" data-testid="quest-tabs">
        {[
          { id: "daily", label: "Quotidiennes" },
          { id: "weekly", label: "Hebdomadaires" },
          { id: "monthly", label: "Mensuelles" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}
            className={`px-4 py-2 rounded-md text-sm font-bold border transition-all ${tab === t.id ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-300 glow-cyan" : "border-white/10 text-zinc-400 hover:border-white/20"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {filtered.length === 0 && <div className="col-span-2 glass rounded-2xl p-12 text-center text-zinc-500">Aucune quête disponible</div>}
        {filtered.map((q, i) => {
          const pct = Math.min(100, (q.progress / q.target) * 100);
          return (
            <motion.div key={q.user_id_quest_id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`glass rounded-xl p-5 ${q.completed ? "border-cyan-500/30 glow-cyan" : ""}`}
              data-testid={`quest-${q.quest_id}`}>
              <div className="flex items-start gap-3 mb-3">
                <ScrollText className={`w-6 h-6 ${q.completed ? "text-cyan-400" : "text-violet-400"}`} />
                <div className="flex-1">
                  <div className="font-display font-bold text-lg flex items-center gap-2">
                    {q.name}
                    {q.completed && <Check className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <div className="text-sm text-zinc-400">{q.description}</div>
                </div>
              </div>
              <div className="mb-2 flex justify-between font-mono-stat text-xs">
                <span className="text-zinc-400">Progression</span>
                <span className="text-cyan-300">{q.progress}/{q.target}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full ${q.completed ? "bg-gradient-to-r from-green-500 to-cyan-400" : "bg-gradient-to-r from-violet-500 to-cyan-400"}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 flex gap-3 text-xs font-mono-stat">
                <span className="text-cyan-300">+{q.xp} XP</span>
                <span className="text-yellow-400">+{q.aether} ✦</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Oracle Generated Quest */}
      <div className="glass glass-violet rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-violet-300 font-bold">Quête de l'Oracle</div>
            <div className="font-display font-bold text-lg">Mission personnalisée IA</div>
          </div>
          <button onClick={generateOracleQuest} disabled={loadingOracle}
            className="px-4 py-2 rounded-md border border-violet-500/40 text-violet-300 hover:shadow-[0_0_20px_rgba(157,76,221,0.4)] text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2"
            data-testid="generate-oracle-quest-btn">
            <Sparkles className="w-3 h-3" />
            {loadingOracle ? "Génération..." : "Demander à l'Oracle"}
          </button>
        </div>
        {oracleQuest && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="mt-4 p-4 rounded-xl bg-violet-500/5 border border-violet-500/20" data-testid="oracle-quest-result">
            <div className="font-display font-bold text-lg text-violet-200">{oracleQuest.name}</div>
            <div className="text-sm text-zinc-300 mt-1">{oracleQuest.description}</div>
            <div className="mt-2 flex gap-3 text-xs font-mono-stat">
              <span className="text-cyan-300">+{oracleQuest.xp} XP</span>
              <span className="text-yellow-400">+{oracleQuest.aether} ✦</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
