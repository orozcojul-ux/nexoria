import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import * as Lucide from "lucide-react";
import { Lock, Coins, Castle as CastleIcon } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import { RuneSeal, RuneDivider } from "@/components/Ornaments";

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
      toast.success(`Édifice ennobli au rang ${data.kingdom[id].level} (-${data.cost} Aether)`);
      await refresh();
    } catch (e) { toast.error(e.response?.data?.detail || "Les fondations résistent..."); }
  };

  const kingdom = user.kingdom || {};

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="kingdom-page">
      <div className="relative rounded-3xl overflow-hidden mb-8 h-72 sm:h-96">
        <img src="https://images.unsplash.com/photo-1514539079130-25950c84af65?crop=entropy&cs=srgb&fm=jpg&ixid=M3w8NjA1MDZ8MHwxfHNlYXJjaHwxfHxtZWRpZXZhbCUyMGNhc3RsZSUyMGRhcmt8ZW58MHx8fHwxNzgxMDkyODQ1fDA&ixlib=rb-4.1.0&q=85" className="absolute inset-0 w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030305] via-[#030305]/70 to-[#030305]/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-violet-900/30 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <RuneSeal icon={CastleIcon} color="#FFD700" size={40} />
              <div className="text-[10px] uppercase tracking-[0.4em] text-yellow-400 font-bold">Domaine de</div>
            </div>
            <h1 className="font-display font-black text-4xl sm:text-6xl tracking-tighter ancient-text">{user.username}</h1>
            <div className="mt-2 flex items-center gap-2 text-sm font-mono-stat italic">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold" data-testid="kingdom-aether">{user.aether} Aether disponibles</span>
            </div>
          </div>
        </div>
      </div>

      <RuneDivider className="mb-6" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="buildings-grid">
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
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -3 }}
              className={`glass rounded-2xl p-6 relative overflow-hidden ${locked ? "opacity-50" : "hover:border-cyan-500/30 transition-all"}`}
              data-testid={`building-${b.id}`}
            >
              {/* Etheric corners */}
              <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-cyan-500/30" />
              <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-cyan-500/30" />
              <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-cyan-500/30" />
              <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-cyan-500/30" />

              <div className="flex items-start justify-between mb-4">
                <div className="relative w-14 h-14">
                  <svg viewBox="0 0 40 40" className="absolute inset-0">
                    <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="rgba(0,229,255,0.05)" stroke="rgba(0,229,255,0.5)" strokeWidth="1" />
                  </svg>
                  <I className="absolute inset-0 m-auto w-6 h-6 text-cyan-400 drop-shadow-[0_0_10px_rgba(0,229,255,0.7)]" />
                </div>
                {locked ? <Lock className="w-4 h-4 text-zinc-500" /> : (
                  <div className="text-right">
                    <div className="font-mono-stat text-3xl font-bold text-cyan-300 leading-none">{data.level}</div>
                    <div className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-bold mt-1">Rang</div>
                  </div>
                )}
              </div>
              <div className="font-display font-bold text-xl tracking-wide">{b.name}</div>
              <div className="text-sm text-zinc-400 mt-1 mb-4 italic scroll-paragraph">{b.description}</div>
              {locked ? (
                <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold border-t border-white/5 pt-3">
                  Sceau levé au niveau {b.unlock_level}
                </div>
              ) : (
                <button
                  onClick={() => upgrade(b.id)}
                  className="w-full py-2.5 rounded-md border border-cyan-500/30 text-cyan-300 hover:border-cyan-500/60 hover:shadow-[0_0_18px_rgba(0,229,255,0.3)] transition-all text-sm font-bold font-display tracking-wide flex items-center justify-center gap-2"
                  data-testid={`upgrade-${b.id}`}
                >
                  <Coins className="w-3 h-3" /> Ennoblir ({cost} Aether)
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
