import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import * as Lucide from "lucide-react";
import { ShoppingBag, Coins, Check } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { sfx } from "@/lib/sfx";
import { RuneSeal, RuneDivider } from "@/components/Ornaments";

const CAT_ORDER = ["cosmetic", "boost", "consumable", "kingdom"];

export default function Shop() {
  const { user, refresh } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [owned, setOwned] = useState({ cosmetics: [], consumables: [], perks: [], boosts: [] });
  const [cat, setCat] = useState("cosmetic");
  const [buying, setBuying] = useState(null);

  const load = async () => {
    const [a, b] = await Promise.all([api.get("/shop/items"), api.get("/shop/inventory")]);
    setItems(a.data); setOwned(b.data);
  };
  useEffect(() => { load(); }, []);

  const buy = async (sku) => {
    setBuying(sku);
    try {
      const { data } = await api.post(`/shop/purchase/${sku}`);
      sfx.chest();
      toast.success(`« ${data.purchase.name} » acquis !`);
      // Optimistic update — mark as owned immediately so the button switches without waiting
      const item = items.find((i) => i.sku === sku);
      if (item) {
        if (item.category === "cosmetic") {
          setOwned((o) => ({ ...o, cosmetics: [...o.cosmetics, { sku, obtained_at: new Date().toISOString() }] }));
        } else if (item.category === "kingdom") {
          setOwned((o) => ({ ...o, perks: [...o.perks, { sku, obtained_at: new Date().toISOString() }] }));
        }
      }
      await load();
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Achat impossible");
    } finally { setBuying(null); }
  };

  const ownedSkus = new Set([
    ...owned.cosmetics.map((c) => c.sku),
    ...owned.perks.map((p) => p.sku),
  ]);

  // Active boosts: map boost_type → expires_at (so we disable items sharing same type)
  const now = Date.now();
  const activeBoostTypes = new Set(
    (owned.boosts || []).filter((b) => new Date(b.expires_at).getTime() > now).map((b) => b.boost_type),
  );

  // Consumables count per SKU (for display)
  const consumableCount = (owned.consumables || []).reduce((acc, c) => {
    acc[c.sku] = (acc[c.sku] || 0) + (c.quantity || 1);
    return acc;
  }, {});

  const filtered = items.filter((i) => i.category === cat);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="shop-page">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <RuneSeal icon={ShoppingBag} color="#FFD700" size={48} />
        </div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-yellow-400 font-bold mb-2">Bazar mystique</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">
          {t("shop.title")}
        </h1>
        <p className="text-zinc-400 text-sm mt-2 italic scroll-paragraph">« {t("shop.subtitle")} »</p>
        <RuneDivider className="mt-6 mb-6 max-w-md mx-auto" />
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-yellow-500/30 bg-yellow-500/5">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="font-mono-stat text-yellow-300 font-bold" data-testid="shop-balance">{user?.aether} {t("common.aether")}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {CAT_ORDER.map((c) => (
          <button key={c} onClick={() => setCat(c)} data-testid={`shop-tab-${c}`}
            className={`px-4 py-2 rounded-md text-sm font-bold font-display tracking-wide border transition-all ${cat === c ? "border-yellow-500/60 text-yellow-300 bg-yellow-500/10 shadow-[0_0_14px_rgba(255,215,0,0.2)]" : "border-white/10 text-zinc-400 hover:border-white/20"}`}>
            {t(`shop.cat.${c}`)}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((it, i) => {
          const Icon = Lucide[it.icon] || Lucide.Sparkles;
          const isOwned = ownedSkus.has(it.sku);
          const boostActive = it.category === "boost" && it.boost_type && activeBoostTypes.has(it.boost_type);
          const ownedCount = it.category === "consumable" ? (consumableCount[it.sku] || 0) : 0;
          const canAfford = (user?.aether || 0) >= it.price;
          return (
            <motion.div
              key={it.sku}
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={`glass rounded-2xl p-5 border-2 relative overflow-hidden rarity-${it.rarity}`}
              data-testid={`shop-item-${it.sku}`}
            >
              {ownedCount > 0 && (
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full border border-violet-500/40 bg-violet-500/10 text-violet-300 text-[10px] font-mono-stat font-bold" data-testid={`owned-count-${it.sku}`}>
                  x{ownedCount}
                </span>
              )}
              <div className="flex items-start justify-between mb-3">
                <Icon className="w-9 h-9" style={{ filter: "drop-shadow(0 0 8px currentColor)" }} />
                <div className="text-[9px] uppercase tracking-[0.25em] font-bold opacity-80">{it.rarity}</div>
              </div>
              <div className="font-display font-bold text-lg mb-1 ancient-text">{it.name}</div>
              <div className="text-xs text-zinc-400 mb-4 italic min-h-[2.5em] scroll-paragraph">{it.description}</div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 font-mono-stat font-bold text-yellow-400">
                  <Coins className="w-4 h-4" />
                  <span>{it.price}</span>
                </div>
                {isOwned ? (
                  <span className="px-3 py-1.5 rounded-md border border-green-500/40 text-green-400 text-xs font-bold flex items-center gap-1" data-testid={`owned-${it.sku}`}>
                    <Check className="w-3 h-3" /> Acquis
                  </span>
                ) : boostActive ? (
                  <span className="px-3 py-1.5 rounded-md border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1" data-testid={`active-${it.sku}`}>
                    <Check className="w-3 h-3" /> Effet actif
                  </span>
                ) : (
                  <button
                    onClick={() => buy(it.sku)}
                    disabled={!canAfford || buying === it.sku}
                    data-testid={`buy-${it.sku}`}
                    className="px-3 py-1.5 rounded-md border border-yellow-500/40 text-yellow-300 hover:shadow-[0_0_14px_rgba(255,215,0,0.4)] text-xs font-bold font-display tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {!canAfford ? t("shop.insufficient") : (ownedCount > 0 ? "Acquérir +1" : t("shop.buy"))}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Active boosts banner */}
      {owned.boosts.length > 0 && (
        <div className="mt-10 glass rounded-2xl p-5">
          <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-bold font-display mb-3">Élixirs actifs</div>
          <div className="flex flex-wrap gap-2">
            {owned.boosts.map((b, i) => (
              <div key={i} className="px-3 py-1.5 rounded-md border border-cyan-500/30 text-cyan-300 text-xs font-mono-stat" data-testid={`active-boost-${b.sku}`}>
                {b.sku} · expires {new Date(b.expires_at).toLocaleTimeString()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
