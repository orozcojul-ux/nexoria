import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import * as Lucide from "lucide-react";
import { Lock, Coins } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";

export default function Kingdom() {
  const { user, refresh } = useAuth();
  const [buildings, setBuildings] = useState([]);

  useEffect(() => {
    api.get("/game/buildings").then((r) => setBuildings(r.data));
  }, []);

  if (!user) return null;

  const upgrade = async (id) => {
    try {
      const { data } = await api.post(`/kingdom/upgrade/${id}`);
      sfx.success();
      toast.success(`Bâtiment amélioré au niveau ${data.kingdom[id].level} (-${data.cost} Aether)`);
      await refresh();
    } catch (e) { toast.error(e.response?.data?.detail || "Erreur"); }
  };

  const kingdom = user.kingdom || {};

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="kingdom-page">
      <div className="relative rounded-3xl overflow-hidden mb-6 h-72 sm:h-96">
        <img src="https://images.unsplash.com/photo-1514539079130-25950c84af65?crop=entropy&cs=srgb&fm=jpg&ixid=M3w8NjA1MDZ8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMGNhc3RsZSUyMGRhcmt8ZW58MHx8fHwxNzgxMDkyODQ1fDA&ixlib=rb-4.1.0&q=85" className="absolute inset-0 w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030305] via-[#030305]/60 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">Royaume de</div>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">{user.username}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm font-mono-stat">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-bold" data-testid="kingdom-aether">{user.aether} Aether</span>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="buildings-grid">
        {buildings.map((b, i) => {
          const I = Lucide[b.icon] || Lucide.Castle;
          const data = kingdom[b.id] || { level: 0 };
          const locked = user.level < b.unlock_level;
          const cost = 100 * (data.level + 1);
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass rounded-2xl p-6 ${locked ? "opacity-50" : "hover:border-cyan-500/30 transition-all"}`}
              data-testid={`building-${b.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <I className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_10px_rgba(0,229,255,0.6)]" />
                {locked ? <Lock className="w-4 h-4 text-zinc-500" /> : (
                  <div className="font-mono-stat text-2xl font-bold text-cyan-300">Niv. {data.level}</div>
                )}
              </div>
              <div className="font-display font-bold text-xl">{b.name}</div>
              <div className="text-sm text-zinc-400 mt-1 mb-4">{b.description}</div>
              {locked ? (
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Débloque au niveau {b.unlock_level}</div>
              ) : (
                <button
                  onClick={() => upgrade(b.id)}
                  className="w-full py-2 rounded-md border border-cyan-500/30 text-cyan-300 hover:border-cyan-500/60 hover:shadow-[0_0_16px_rgba(0,229,255,0.3)] transition-all text-sm font-bold flex items-center justify-center gap-2"
                  data-testid={`upgrade-${b.id}`}
                >
                  <Coins className="w-3 h-3" /> Améliorer ({cost} Aether)
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
