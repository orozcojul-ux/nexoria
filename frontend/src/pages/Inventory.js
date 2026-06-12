import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Lucide from "lucide-react";
import { Gem, Sparkles, Coins, Package } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import { RuneSeal, RuneDivider } from "@/components/Ornaments";

export default function Inventory() {
  const { user, refresh } = useAuth();
  const [items, setItems] = useState([]);
  const [rarities, setRarities] = useState([]);
  const [opening, setOpening] = useState(false);
  const [newItems, setNewItems] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    const [a, b] = await Promise.all([api.get("/inventory"), api.get("/game/rarities")]);
    setItems(a.data); setRarities(b.data);
  };
  useEffect(() => { load(); }, []);

  const openChest = async () => {
    if ((user?.aether || 0) < 50) { toast.error("50 Aether requis pour briser le sceau"); return; }
    setOpening(true);
    try {
      const { data } = await api.post("/inventory/open-chest");
      sfx.chest();
      if (!data.items || data.items.length === 0) {
        toast.info(`Vous possédez déjà toutes ces reliques — ${data.refunded || 50} Aether restitué.`);
      } else {
        setNewItems(data.items);
      }
      await load(); await refresh();
    } catch (e) { toast.error(e.response?.data?.detail || "Le coffre résiste..."); }
    finally { setOpening(false); }
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.rarity === filter);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="inventory-page">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-3">
          <RuneSeal icon={Gem} color="#00E5FF" size={48} />
        </div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-bold mb-2">Cabinet de curiosités</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">
          Vos <span className="text-gradient">Reliques</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-2 italic scroll-paragraph">
          « {items.length} trésor{items.length > 1 ? "s" : ""} arraché{items.length > 1 ? "s" : ""} aux brumes oubliées. »
        </p>
        <RuneDivider className="mt-6 mb-6" />
        <button onClick={openChest} disabled={opening || (user?.aether || 0) < 50}
          className="px-6 py-3 rounded-md bg-[#0A0A0E] border border-yellow-500/50 text-yellow-300 font-display font-bold hover:shadow-[0_0_32px_rgba(255,215,0,0.5)] transition-all inline-flex items-center gap-2 disabled:opacity-40 tracking-wide"
          data-testid="open-chest-btn">
          <Sparkles className="w-4 h-4" />
          Briser un sceau de coffre <span className="text-xs font-mono-stat opacity-70">— 50 ✦</span>
        </button>
      </div>

      {/* Rarity filters — small medallions */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center" data-testid="rarity-filters">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded text-xs font-bold font-display tracking-wide border ${filter === "all" ? "border-cyan-500/60 text-cyan-300" : "border-white/10 text-zinc-400"}`}>Tous</button>
        {rarities.map((r) => (
          <button key={r.id} onClick={() => setFilter(r.id)} className={`px-3 py-1.5 rounded text-xs font-bold font-display tracking-wide border rarity-${r.id} ${filter === r.id ? "" : "opacity-50"}`} data-testid={`filter-${r.id}`}>
            {r.name}
          </button>
        ))}
      </div>

      {/* Cabinet grid — items as ornate medallions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3" data-testid="inventory-grid">
        {filtered.length === 0 && (
          <div className="col-span-full parchment rounded-2xl p-12 text-center text-zinc-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <div className="italic">Le cabinet attend ses premières trouvailles...</div>
          </div>
        )}
        {filtered.map((item, i) => {
          const I = Lucide[item.icon] || Lucide.Package;
          return (
            <motion.div
              key={item.item_id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.02, 0.5) }}
              whileHover={{ scale: 1.05, rotate: 1 }}
              className={`aspect-square relative rounded-xl border-2 rarity-${item.rarity} bg-gradient-to-br from-[#0a0a0e] to-[#15101e] p-3 flex flex-col items-center justify-center text-center group cursor-pointer overflow-hidden`}
              data-testid={`item-${item.item_id}`}
            >
              {/* Inner ornament corners */}
              <span className="absolute top-1 left-1 w-2 h-2 border-t border-l border-current opacity-50" />
              <span className="absolute top-1 right-1 w-2 h-2 border-t border-r border-current opacity-50" />
              <span className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-current opacity-50" />
              <span className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-current opacity-50" />
              <I className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" style={{ filter: "drop-shadow(0 0 8px currentColor)" }} />
              <div className="text-xs font-display font-bold text-white leading-tight">{item.name}</div>
              <div className="text-[8px] uppercase tracking-[0.2em] font-bold mt-1 opacity-80">{item.rarity}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Chest unsealing modal */}
      <AnimatePresence>
        {newItems && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setNewItems(null)}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="rune-border rounded-2xl p-8 max-w-2xl w-full text-center relative mist">
              <Sparkles className="w-16 h-16 mx-auto text-yellow-400 mb-4 animate-pulse drop-shadow-[0_0_28px_rgba(255,215,0,0.7)]" />
              <div className="text-[10px] uppercase tracking-[0.4em] text-yellow-400 font-bold mb-2">Sceau brisé</div>
              <h2 className="font-display font-black text-3xl text-gradient mb-2">Révélation</h2>
              <p className="text-zinc-400 mb-6 italic scroll-paragraph">Les brumes s'écartent et révèlent leurs présents...</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {newItems.map((it) => {
                  const I = Lucide[it.icon] || Lucide.Package;
                  return (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
                      key={it.item_id} className={`rounded-xl p-4 border-2 rarity-${it.rarity} bg-black/30`}>
                      <I className="w-10 h-10 mx-auto mb-2" />
                      <div className="font-display font-bold">{it.name}</div>
                      <div className="text-[10px] uppercase tracking-[0.25em] font-bold opacity-80 mt-1">{it.rarity}</div>
                    </motion.div>
                  );
                })}
              </div>
              <button onClick={() => setNewItems(null)}
                className="px-6 py-2 rounded-md border border-cyan-500/40 text-cyan-300 font-bold font-display tracking-wide hover:shadow-[0_0_20px_rgba(0,229,255,0.4)]"
                data-testid="close-chest-modal">
                Sceller à nouveau
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
