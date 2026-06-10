import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Scroll, Sparkles, Coins, Crosshair, Feather } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import { RuneSeal, RuneDivider } from "@/components/Ornaments";

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
    } catch { toast.error("Le parchemin reste vierge..."); }
    finally { setLoadingOracle(false); }
  };

  const filtered = quests.filter((q) => q.type === tab);
  const tabLabels = {
    daily: "Crépuscule",
    weekly: "Lune",
    monthly: "Saison",
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="quests-page">
      <div className="mb-8 text-center relative">
        <div className="flex justify-center mb-3">
          <RuneSeal icon={Crosshair} color="#FFD700" size={48} />
        </div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-yellow-400 font-bold mb-2">Avis aux braves</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">
          Tableau de <span className="text-gradient-gold">Chasse</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-2 italic scroll-paragraph max-w-2xl mx-auto">
          « Les missives s'accumulent sur le poteau central de la place. Acceptez votre destin, scellez votre nom dans la chronique. »
        </p>
        <RuneDivider className="mt-6" />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap justify-center" data-testid="quest-tabs">
        {Object.entries(tabLabels).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} data-testid={`tab-${id}`}
            className={`px-5 py-2 rounded-md text-sm font-bold font-display tracking-wide border transition-all ${tab === id ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-300 shadow-[0_0_14px_rgba(255,215,0,0.25)]" : "border-white/10 text-zinc-400 hover:border-white/20"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-10">
        {filtered.length === 0 && (
          <div className="col-span-2 parchment rounded-2xl p-12 text-center text-zinc-500 italic">
            Le tableau est vide pour ce cycle...
          </div>
        )}
        {filtered.map((q, i) => {
          const pct = Math.min(100, (q.progress / q.target) * 100);
          return (
            <motion.div key={q.user_id_quest_id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`parchment rounded-xl p-5 relative overflow-hidden group ${q.completed ? "border-cyan-500/40 shadow-[0_0_18px_rgba(0,229,255,0.15)]" : ""}`}
              data-testid={`quest-${q.quest_id}`}>
              {/* Wax seal corner */}
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gradient-to-br from-red-700 to-red-900 border border-red-500/50 flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                <Feather className="w-3.5 h-3.5 text-yellow-100/80" />
              </div>
              <div className="flex items-start gap-3 mb-3 pr-10">
                <Scroll className={`w-6 h-6 mt-1 ${q.completed ? "text-cyan-400" : "text-yellow-500/80"}`} />
                <div className="flex-1">
                  <div className="font-display font-bold text-lg flex items-center gap-2 ancient-text">
                    {q.name}
                    {q.completed && <Check className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <div className="text-sm text-zinc-300 italic mt-1 scroll-paragraph">{q.description}</div>
                </div>
              </div>
              <div className="mb-2 flex justify-between font-mono-stat text-xs">
                <span className="text-zinc-400 uppercase tracking-widest">Progression</span>
                <span className="text-cyan-300">{q.progress}/{q.target}</span>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div className={`h-full ${q.completed ? "bg-gradient-to-r from-green-500 to-cyan-400" : "bg-gradient-to-r from-yellow-600 to-yellow-400"}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 flex gap-4 text-xs font-mono-stat items-center">
                <span className="text-cyan-300 flex items-center gap-1"><Sparkles className="w-3 h-3" />+{q.xp} XP</span>
                <span className="text-yellow-400 flex items-center gap-1"><Coins className="w-3 h-3" />+{q.aether}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Oracle Quest — special parchment */}
      <div className="rune-border rounded-2xl p-6 relative mist overflow-hidden">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <RuneSeal icon={Sparkles} color="#9D4CDD" size={40} />
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-violet-300 font-bold">Édit du Sanctuaire</div>
              <div className="font-display font-bold text-lg ancient-text">Missive scellée</div>
            </div>
          </div>
          <button onClick={generateOracleQuest} disabled={loadingOracle}
            className="px-4 py-2 rounded-md border border-violet-500/40 text-violet-200 hover:shadow-[0_0_20px_rgba(157,76,221,0.4)] text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 font-display"
            data-testid="generate-oracle-quest-btn">
            <Sparkles className="w-3 h-3" />
            {loadingOracle ? "Le parchemin s'écrit..." : "Briser le sceau"}
          </button>
        </div>
        {oracleQuest && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="unfurl mt-2 p-5 rounded-xl bg-violet-500/5 border border-violet-500/20 relative" data-testid="oracle-quest-result">
            <div className="font-display font-bold text-xl ancient-text">{oracleQuest.name}</div>
            <div className="text-sm text-violet-100/90 mt-2 italic scroll-paragraph">{oracleQuest.description}</div>
            <div className="mt-3 flex gap-4 text-xs font-mono-stat">
              <span className="text-cyan-300">+{oracleQuest.xp} XP</span>
              <span className="text-yellow-400">+{oracleQuest.aether} ✦</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
