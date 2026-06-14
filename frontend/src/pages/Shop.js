import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Lucide from "lucide-react";
import {
  ShoppingBag, Coins, Check, Sparkles, Crown, Shield, Sword, Gift, Flame,
  Star, X, Plus, Minus, Wifi, Trophy, Zap, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";

const CATS = [
  { id: "all",        label: "Tout",         icon: ShoppingBag },
  { id: "cosmetic",   label: "Cosmétiques",  icon: Crown },
  { id: "boost",      label: "Boosts",       icon: Zap },
  { id: "consumable", label: "Consommables", icon: Sparkles },
  { id: "kingdom",    label: "Royaume",      icon: Shield },
];

// Hero "featured" visual mapping — uses the 4 Nano Banana images
const FEATURED_VISUALS = [
  { id: "f1", img: "/shop/epee_legendaire.png", title: "Lames Cosmiques", subtitle: "Collection Légendaire" },
  { id: "f2", img: "/shop/armure_cosmique.png", title: "Armures du Néant", subtitle: "Édition Cosmique" },
  { id: "f3", img: "/shop/monture_mythique.png", title: "Montures Mythiques", subtitle: "Compagnons Stellaires" },
  { id: "f4", img: "/shop/coffre_divin.png", title: "Coffres Divins", subtitle: "Trésors Sacrés" },
];

const RARITY = {
  common:    { fr: "Commun",     color: "#9CA3AF", glow: "rgba(156,163,175,0.5)" },
  rare:      { fr: "Rare",       color: "#3B82F6", glow: "rgba(59,130,246,0.6)" },
  epic:      { fr: "Épique",     color: "#A855F7", glow: "rgba(168,85,247,0.7)" },
  legendary: { fr: "Légendaire", color: "#F59E0B", glow: "rgba(245,158,11,0.7)" },
  mythic:    { fr: "Mythique",   color: "#EF4444", glow: "rgba(239,68,68,0.75)" },
  divine:    { fr: "Divin",      color: "#FBBF24", glow: "rgba(251,191,36,0.85)" },
  cosmic:    { fr: "Cosmique",   color: "#FFFFFF", glow: "rgba(255,255,255,0.9)" },
};

export default function Shop() {
  const { user, refresh } = useAuth();
  const [items, setItems] = useState([]);
  const [owned, setOwned] = useState({ cosmetics: [], consumables: [], perks: [], boosts: [] });
  const [cat, setCat] = useState("all");
  const [buying, setBuying] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [featuredIdx, setFeaturedIdx] = useState(0);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([api.get("/shop/items"), api.get("/shop/inventory")]);
    setItems(a.data);
    setOwned(b.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Featured carousel auto-cycle
  useEffect(() => {
    const id = setInterval(() => setFeaturedIdx((i) => (i + 1) % FEATURED_VISUALS.length), 6000);
    return () => clearInterval(id);
  }, []);

  // ===== WebSocket sync — refresh inventory instantly on purchase event from backend =====
  useEffect(() => {
    const handler = (e) => {
      sfx.chime?.() || sfx.chest?.();
      load();
      refresh();
    };
    window.addEventListener("nexoria:shop:purchased", handler);
    return () => window.removeEventListener("nexoria:shop:purchased", handler);
  }, [load, refresh]);

  const ownedSkus = useMemo(() => {
    const s = new Set();
    (owned.cosmetics || []).forEach((c) => s.add(c.sku));
    (owned.perks || []).forEach((c) => s.add(c.sku));
    return s;
  }, [owned]);

  const filtered = useMemo(() => {
    if (cat === "all") return items;
    return items.filter((i) => i.category === cat);
  }, [items, cat]);

  const bestSellers = useMemo(() => {
    // Use items with `popularity` or top legendary/cosmic ones as "best sellers"
    return [...items].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 4);
  }, [items]);

  const buyOne = async (sku) => {
    setBuying(sku);
    try {
      const { data } = await api.post(`/shop/purchase/${sku}`);
      toast.success(`« ${data.purchase.name} » acquis !`);
      // WebSocket event will trigger refresh; but optimistic immediately
      await load();
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Échec de l'achat");
    } finally {
      setBuying(null);
    }
  };

  const addToCart = (item) => {
    if (cart.find((c) => c.sku === item.sku)) {
      toast.info("Déjà dans le panier");
      return;
    }
    setCart((c) => [...c, item]);
    setCartOpen(true);
  };

  const removeFromCart = (sku) => setCart((c) => c.filter((x) => x.sku !== sku));
  const cartTotal = cart.reduce((sum, c) => sum + (c.price || 0), 0);

  const checkout = async () => {
    if (cart.length === 0) return;
    const items = [...cart];
    for (const it of items) {
      await buyOne(it.sku);
    }
    setCart([]);
    setCartOpen(false);
    toast.success("Panier vidé — tous les articles acquis !");
  };

  const featured = FEATURED_VISUALS[featuredIdx];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0613] via-[#05030D] to-[#1A0B3D]" data-testid="shop-page">
      {/* ===== Header ===== */}
      <div className="px-6 py-4 border-b border-purple-500/20 backdrop-blur bg-black/30 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-cyan-300" />
            <div>
              <h1 className="font-display font-black text-2xl text-cyan-200">Boutique <span className="text-gradient">d'Aether</span></h1>
              <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Bazar cosmique de NEXORIA</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Balance */}
            <div className="px-3 py-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-300" />
              <span className="font-mono-stat text-yellow-200 font-bold" data-testid="shop-balance">
                {user?.aether ?? 0}
              </span>
              <span className="text-[10px] text-yellow-300/70">⟡ AETHER</span>
            </div>
            {/* Cart trigger */}
            <button onClick={() => setCartOpen(true)} data-testid="cart-toggle"
              className="relative px-3 py-2 rounded-lg border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 font-bold text-xs flex items-center gap-1">
              <ShoppingBag className="w-4 h-4" /> Panier
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 text-[10px] font-bold text-white flex items-center justify-center">{cart.length}</span>
              )}
            </button>
            <div className="text-[10px] text-zinc-500 flex items-center gap-1" data-testid="shop-sync-indicator">
              <Wifi className="w-3 h-3 text-green-400" /> Sync temps réel
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 p-4">
        {/* ===== Sidebar ===== */}
        <aside className="space-y-1">
          {CATS.map((c) => {
            const Ico = c.icon;
            const count = c.id === "all" ? items.length : items.filter((i) => i.category === c.id).length;
            return (
              <button key={c.id} onClick={() => setCat(c.id)} data-testid={`shop-cat-${c.id}`}
                className={`w-full text-left px-3 py-2 rounded-lg border flex items-center gap-2 transition-all ${cat === c.id ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300" : "border-white/10 text-zinc-400 hover:border-white/30 hover:bg-white/5"}`}>
                <Ico className="w-4 h-4" />
                <span className="flex-1 font-display font-bold text-sm">{c.label}</span>
                <span className="text-[10px] text-zinc-500 font-mono">{count}</span>
              </button>
            );
          })}
          <div className="pt-3 mt-3 border-t border-white/10">
            <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2 px-2">Mes acquis</div>
            <div className="px-2 space-y-1 text-xs text-zinc-400">
              <div>✨ Cosmétiques : <span className="text-cyan-200">{owned.cosmetics?.length || 0}</span></div>
              <div>⚡ Boosts : <span className="text-purple-200">{owned.boosts?.length || 0}</span></div>
              <div>🧪 Consommables : <span className="text-emerald-200">{owned.consumables?.length || 0}</span></div>
              <div>🏰 Royaume : <span className="text-yellow-200">{owned.perks?.length || 0}</span></div>
            </div>
          </div>
        </aside>

        {/* ===== Main ===== */}
        <main className="space-y-5">
          {/* Hero featured carousel */}
          <div className="relative h-56 rounded-2xl overflow-hidden border border-purple-500/40 group" data-testid="shop-hero">
            <AnimatePresence mode="wait">
              <motion.div key={featured.id}
                initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.8 }}
                className="absolute inset-0">
                <img src={featured.img} alt={featured.title}
                  className="w-full h-full object-cover"
                  loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0613] via-transparent to-transparent" />
                <div className="absolute left-6 bottom-6 max-w-md">
                  <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-300 font-bold mb-1">Mis en avant</div>
                  <h2 className="font-display font-black text-3xl text-white">{featured.title}</h2>
                  <p className="text-zinc-300 text-sm mt-1">{featured.subtitle}</p>
                  <button onClick={() => setCat("cosmetic")}
                    className="mt-3 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold text-xs flex items-center gap-1 hover:scale-105 transition-transform">
                    Explorer <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                {/* Cosmic glow dots */}
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="absolute w-1 h-1 rounded-full bg-cyan-300 animate-pulse"
                    style={{
                      top: `${20 + i * 12}%`, left: `${70 + (i % 2) * 10}%`,
                      boxShadow: "0 0 8px rgba(0,229,255,0.8)", animationDelay: `${i * 0.3}s`,
                    }} />
                ))}
              </motion.div>
            </AnimatePresence>
            {/* Pagination */}
            <div className="absolute right-4 bottom-4 flex gap-1">
              {FEATURED_VISUALS.map((f, i) => (
                <button key={f.id} onClick={() => setFeaturedIdx(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === featuredIdx ? "w-6 bg-cyan-300" : "bg-white/30"}`} />
              ))}
            </div>
          </div>

          {/* Best sellers */}
          {bestSellers.length > 0 && (
            <Section title="Reliques populaires" icon={Trophy} accent="text-yellow-300">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {bestSellers.map((it, i) => (
                  <ItemCard key={it.sku} item={it} compact rank={i + 1}
                    owned={ownedSkus.has(it.sku)} buying={buying === it.sku}
                    onBuy={() => buyOne(it.sku)} onAdd={() => addToCart(it)} aether={user?.aether ?? 0} />
                ))}
              </div>
            </Section>
          )}

          {/* All items */}
          <Section title={cat === "all" ? "Tous les articles" : (CATS.find((c) => c.id === cat)?.label || "")}
            icon={CATS.find((c) => c.id === cat)?.icon || ShoppingBag} accent="text-cyan-300">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 italic">Aucun article dans cette catégorie.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((it) => (
                  <ItemCard key={it.sku} item={it}
                    owned={ownedSkus.has(it.sku)} buying={buying === it.sku}
                    onBuy={() => buyOne(it.sku)} onAdd={() => addToCart(it)} aether={user?.aether ?? 0} />
                ))}
              </div>
            )}
          </Section>
        </main>
      </div>

      {/* ===== CART DRAWER ===== */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setCartOpen(false)} data-testid="cart-drawer">
            <motion.aside initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-gradient-to-br from-[#0F0820] via-[#0A0613] to-[#0F0820] border-l border-purple-500/40 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-display font-black text-lg text-cyan-200">Panier ({cart.length})</h3>
                <button onClick={() => setCartOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {cart.length === 0 && (
                  <div className="text-center py-12 text-zinc-500 italic">Le panier est vide.</div>
                )}
                {cart.map((it) => (
                  <div key={it.sku} className="p-3 rounded-lg border border-white/10 bg-white/5 flex items-center gap-3">
                    <div className="text-2xl">{it.icon || "✨"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-cyan-200 text-sm truncate">{it.name}</div>
                      <div className="text-[10px] text-zinc-500 uppercase">{it.category}</div>
                    </div>
                    <div className="font-mono text-yellow-300 font-bold">{it.price}⟡</div>
                    <button onClick={() => removeFromCart(it.sku)} className="text-zinc-400 hover:text-red-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-white/10">
                <div className="flex justify-between mb-3 text-sm">
                  <span className="text-zinc-400">Total</span>
                  <span className="font-mono-stat text-yellow-300 font-black text-lg">{cartTotal} ⟡</span>
                </div>
                <button onClick={checkout} disabled={cart.length === 0 || cartTotal > (user?.aether ?? 0)}
                  data-testid="cart-checkout"
                  className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-display font-black uppercase tracking-widest text-sm disabled:opacity-40 hover:scale-[1.02] transition-transform">
                  Valider l'achat
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============== Subcomponents ============== */
function Section({ title, icon: Icon, accent = "text-cyan-300", children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className={`w-4 h-4 ${accent}`} />}
        <h2 className={`font-display font-black text-lg uppercase tracking-widest ${accent}`}>{title}</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-purple-500/40 to-transparent ml-2" />
      </div>
      {children}
    </div>
  );
}

function ItemCard({ item, owned, buying, onBuy, onAdd, aether, rank, compact }) {
  const r = RARITY[item.rarity] || RARITY.common;
  const canAfford = (aether ?? 0) >= (item.price || 0);
  const Ico = item.icon && Lucide[item.icon] ? Lucide[item.icon] : Sparkles;
  return (
    <motion.div
      whileHover={{ y: -4 }} transition={{ duration: 0.2 }}
      className={`relative rounded-xl border-2 p-3 bg-gradient-to-br from-black/40 to-purple-900/20 overflow-hidden group`}
      style={{ borderColor: `${r.color}66`, boxShadow: `0 0 16px ${r.glow}` }}
      data-testid={`shop-item-${item.sku}`}
    >
      {rank && (
        <div className="absolute top-2 right-2 text-[10px] font-black text-yellow-300 bg-yellow-500/10 border border-yellow-500/40 rounded-full w-6 h-6 flex items-center justify-center">
          #{rank}
        </div>
      )}
      {owned && (
        <div className="absolute top-2 left-2 text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-500/20 border border-emerald-500/50 rounded px-2 py-0.5 flex items-center gap-1">
          <Check className="w-3 h-3" /> Acquis
        </div>
      )}
      <div className="flex justify-center mb-2 mt-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-2xl opacity-50"
            style={{ background: `radial-gradient(circle, ${r.color}, transparent)` }} />
          <div className="relative w-16 h-16 rounded-xl flex items-center justify-center text-4xl border-2"
            style={{ borderColor: r.color, background: `radial-gradient(circle, ${r.color}22, transparent)` }}>
            {typeof item.icon === "string" && !Lucide[item.icon] ? item.icon : <Ico className="w-8 h-8" style={{ color: r.color }} />}
          </div>
        </div>
      </div>
      <div className="text-center">
        <div className="font-display font-bold text-sm truncate" style={{ color: r.color }}>{item.name}</div>
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{r.fr}</div>
        {!compact && item.description && (
          <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2 min-h-[28px]">{item.description}</p>
        )}
        <div className="flex items-center justify-center gap-1 text-yellow-300 font-mono-stat font-black text-base">
          <Coins className="w-3 h-3" /> {item.price}
        </div>
      </div>
      <div className="mt-3 flex gap-1">
        {owned ? (
          <button disabled className="flex-1 px-2 py-1.5 rounded border border-emerald-500/40 text-emerald-300 text-xs font-bold cursor-not-allowed">
            Acquis
          </button>
        ) : (
          <>
            <button onClick={onBuy} disabled={!canAfford || buying} data-testid={`shop-buy-${item.sku}`}
              className="flex-1 px-2 py-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 text-xs font-bold disabled:opacity-40">
              {buying ? "..." : "Acheter"}
            </button>
            <button onClick={onAdd} title="Ajouter au panier"
              data-testid={`shop-cart-${item.sku}`}
              className="px-2 py-1.5 rounded border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200">
              <Plus className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
