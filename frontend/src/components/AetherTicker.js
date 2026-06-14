import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, ShoppingBag } from "lucide-react";

/**
 * AetherTicker — floating social-proof ticker showing recent purchases live.
 * Listens to the `nexoria:shop:purchased` CustomEvent (dispatched by the
 * NexusSocketContext on every `shop:purchased` Socket.IO event) and shows
 * a sliding notification at the right edge of the screen.
 */
export default function AetherTicker() {
  const [items, setItems] = useState([]); // [{id, username, name}]

  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {};
      // We only have the buyer perspective in the event (they own it now).
      // Server doesn't broadcast cross-player yet, so this ticker shows YOUR own
      // purchases — still creates a satisfying "loot acquired" feel.
      const id = Math.random().toString(36).slice(2, 8);
      const username = (window.__nexoria_me?.username) || "Vous";
      setItems((prev) => [{ id, username, name: d.name || d.sku, ts: Date.now() }, ...prev].slice(0, 4));
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 5500);
    };
    window.addEventListener("nexoria:shop:purchased", handler);
    return () => window.removeEventListener("nexoria:shop:purchased", handler);
  }, []);

  return (
    <div className="fixed right-4 top-24 z-[55] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {items.map((it) => (
          <motion.div key={it.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            data-testid={`aether-ticker-${it.id}`}
            className="px-3 py-2 rounded-lg border border-yellow-500/40 bg-gradient-to-r from-amber-900/60 to-purple-900/40 backdrop-blur-md shadow-[0_0_24px_rgba(252,211,77,0.3)] max-w-xs"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-yellow-500/20 border border-yellow-500/40">
                <Coins className="w-3 h-3 text-yellow-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-yellow-300 font-bold">Acquisition</div>
                <div className="text-xs text-yellow-100 truncate">
                  <span className="font-bold">{it.username}</span> a obtenu{" "}
                  <span className="text-cyan-200">{it.name}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
