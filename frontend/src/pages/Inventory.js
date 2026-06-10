import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Lucide from "lucide-react";
import { Package, Sparkles, Coins } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";

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
    if ((user?.aether || 0) < 50) { toast.error("50 Aether requis"); return; }
    setOpening(true);
    try {
      const { data } = await api.post("/inventory/open-chest");
      sfx.chest();
      setNewItems(data.items);
      await load(); await refresh();
    } catch (e) { toast.error(e.response?.data?.detail || "Erreur"); }
    finally { setOpening(false); }
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.rarity === filter);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="inventory-page">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">Trésors</div>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">Inventaire</h1>
          <p className="text-zinc-400 text-sm mt-1">{items.length} objet{items.length > 1 ? "s" : ""} collecté{items.length > 1 ? "s" : ""}</p>
        </div>
        <button onClick={openChest} disabled={opening || (user?.aether || 0) < 50}
          className="px-5 py-3 rounded-md bg-[#0A0A0E] border border-yellow-500/40 text-yellow-300 font-bold hover:shadow-[0_0_24px_rgba(255,215,0,0.4)] transition-all flex items-center gap-2 disabled:opacity-40"
          data-testid="open-chest-btn">
          <Sparkles className="w-4 h-4" />
          Ouvrir un coffre <span className="text-xs font-mono-stat opacity-70">(50 ✦)</span>
        </button>
      </div>

      {/* Rarity filters */}
      <div className="flex flex-wrap gap-2 mb-6" data-testid="rarity-filters">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded text-xs font-bold border ${filter === "all" ? "border-cyan-500/60 text-cyan-300" : "border-white/10 text-zinc-400"}`}>Tous</button>
        {rarities.map((r) => (
          <button key={r.id} onClick={() => setFilter(r.id)} className={`px-3 py-1.5 rounded text-xs font-bold border rarity-${r.id} ${filter === r.id ? "" : "opacity-50"}`} data-testid={`filter-${r.id}`}>
            {r.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3" data-testid="inventory-grid">
        {filtered.length === 0 && (
          <div className="col-span-full glass rounded-2xl p-12 text-center text-zinc-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            Aucun objet. Ouvrez un coffre pour commencer votre collection!
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
              className={`aspect-square glass rounded-xl p-3 border-2 rarity-${item.rarity} flex flex-col items-center justify-center text-center group hover:scale-105 transition-all`}
              data-testid={`item-${item.item_id}`}
            >
              <I className="w-8 h-8 mb-2" style={{ filter: "drop-shadow(0 0 6px currentColor)" }} />
              <div className="text-xs font-display font-bold text-white leading-tight">{item.name}</div>
              <div className="text-[9px] uppercase tracking-widest font-bold mt-1 opacity-80">{item.rarity}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Chest opening modal */}
      <AnimatePresence>
        {newItems && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setNewItems(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8, rotate: -5 }} animate={{ scale: 1, rotate: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass glass-cyan rounded-2xl p-8 max-w-2xl w-full text-center">
              <Sparkles className="w-16 h-16 mx-auto text-yellow-400 mb-4 animate-pulse drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]" />
              <h2 className="font-display font-black text-3xl text-gradient mb-2">Découverte!</h2>
              <p className="text-zinc-400 mb-6">Le coffre cosmique révèle ses trésors :</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {newItems.map((it) => {
                  const I = Lucide[it.icon] || Lucide.Package;
                  return (
                    <div key={it.item_id} className={`glass rounded-xl p-4 border-2 rarity-${it.rarity}`}>
                      <I className="w-8 h-8 mx-auto mb-2" />
                      <div className="font-display font-bold">{it.name}</div>
                      <div className="text-[10px] uppercase tracking-widest font-bold opacity-80 mt-1">{it.rarity}</div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setNewItems(null)}
                className="px-6 py-2 rounded-md border border-cyan-500/40 text-cyan-300 font-bold hover:shadow-[0_0_20px_rgba(0,229,255,0.4)]"
                data-testid="close-chest-modal">
                Magnifique
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
