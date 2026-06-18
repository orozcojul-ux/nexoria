import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Lucide from "lucide-react";
import {
  ShoppingBag, Coins, Check, Sparkles, Crown, Shield, Sword, Gift, Flame,
  Star, X, Plus, Minus, Wifi, Trophy, Zap, ChevronRight, Ticket, Gem,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import { useProfileSync } from "@/hooks/useProfileSync";
import { RARITY } from "@/lib/design-tokens";
import { PremiumButton, PremiumCard, PageShell } from "@/components/ui-premium";
import VipPassSection from "@/components/shop/VipPassSection";
import BuyEcusSection from "@/components/shop/BuyEcusSection";
import { drawPixelBanner } from "@/lib/pixelArtUi";
import { usePageBanner } from "@/lib/page-banners";
import { useI18n } from "@/contexts/I18nContext";

const CAT_KEYS = [
  { id: "all", key: "shop.cat.all", icon: ShoppingBag },
  { id: "chest", key: "shop.cat.chest", icon: Gift },
  { id: "cosmetic", key: "shop.cat.cosmetic", icon: Crown },
  { id: "mount", key: "shop.cat.mount", icon: Star },
  { id: "title", key: "shop.cat.title", icon: Trophy },
  { id: "aura", key: "shop.cat.aura", icon: Flame },
  { id: "consumable", key: "shop.cat.consumable", icon: Sparkles },
  { id: "boost", key: "shop.cat.boost", icon: Zap },
  { id: "pass", key: "shop.cat.pass", icon: Ticket },
  { id: "kingdom", key: "shop.cat.kingdom", icon: Shield },
];

// Aide « comment activer / où retrouver » par article (bouton info "i").
function itemActivationInfo(item) {
  const sku = item.sku || "";
  const cat = item.category;
  if (sku === "scroll_rename") return "Confère un parchemin. Utilisez-le dans Paramètres › Compte › Pseudo pour changer de nom.";
  if (sku === "scroll_class_change") return "Crédite 3 changements de classe. Utilisez-les depuis votre Carte de Héros › bouton « Changer ».";
  if (sku === "key_chest_cosmic") return "Ouvre immédiatement un coffre garanti Épique+. Les reliques partent dans votre Inventaire.";
  if (sku === "summon_rift") return "Fait apparaître une faille dimensionnelle. Récupérez-la depuis votre page Héros / le Fil.";
  if (sku === "kingdom_inventory_slot") return "+10 emplacements ajoutés immédiatement à votre Inventaire.";
  if (sku === "kingdom_aether_mine" || sku === "kingdom_treasury") return "Génère des Écus passivement chaque jour, crédités automatiquement à la connexion.";
  if (sku === "kingdom_throne_room") return "Trône affiché sur votre profil + badge royal. Visible sur votre page Héros.";
  if (cat === "boost") return "Effet actif immédiatement après l'achat. Suivez le compte à rebours dans « Effets actifs » en haut de la boutique.";
  if (cat === "chest") return "Ouvre immédiatement un coffre. Les reliques obtenues partent dans votre Inventaire.";
  if (cat === "mount") return "Monture équipée automatiquement. Visible dans le Nexus (monde) et sur votre profil.";
  if (cat === "aura") return "Aura équipée automatiquement. Visible autour de votre avatar dans le Nexus.";
  if (cat === "title") return "Titre équipé automatiquement. Modifiable dans Paramètres › Profil.";
  if (cat === "pass") return "Réservé pendant une saison active. Récompense immédiate + récompenses de fin de saison doublées.";
  if (cat === "kingdom") return "Avantage permanent appliqué à votre compte. Retrouvez-le sur la page Royaume.";
  if (cat === "cosmetic") {
    if (sku.startsWith("frame_")) return "Cadre équipé automatiquement. Modifiable dans Paramètres › Profil (cadre).";
    if (sku.startsWith("banner_")) return "Bannière débloquée. À équiper depuis Paramètres › Profil (bannière).";
    return "Cosmétique débloqué. À équiper depuis votre profil.";
  }
  return "Article débloqué pour votre compte après l'achat.";
}

// Bannières pixel art — style Dofus/WoW (plus d'images IA)
const FEATURED_VISUALS = [
  { id: "f1", theme: "gold", title: "Lames Cosmiques", subtitle: "Collection Légendaire" },
  { id: "f2", theme: "violet", title: "Armures du Néant", subtitle: "Édition Cosmique" },
  { id: "f3", theme: "cyan", title: "Montures Mythiques", subtitle: "Compagnons Stellaires" },
  { id: "f4", theme: "emerald", title: "Coffres Divins", subtitle: "Trésors Sacrés" },
];

export default function Shop() {
  const { user, refresh } = useAuth();
  const { t } = useI18n();
  const banner = usePageBanner("shop");
  const CATS = CAT_KEYS.map((c) => ({ ...c, label: t(c.key) }));
  const [items, setItems] = useState([]);
  const [owned, setOwned] = useState({ cosmetics: [], consumables: [], perks: [], boosts: [] });
  const [cat, setCat] = useState("all");
  const [buying, setBuying] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [chestReveal, setChestReveal] = useState(null); // { name, items: [...] }
  const [seasonActive, setSeasonActive] = useState(true);

  // Returning from Stripe Checkout → open the écus tab so the confirmation runs.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("ecus")) setCat("buy_ecus");
  }, []);

  const load = useCallback(async () => {
    const [a, b, s] = await Promise.all([
      api.get("/shop/items"),
      api.get("/shop/inventory"),
      api.get("/seasons/current").catch(() => ({ data: null })),
    ]);
    setItems(a.data);
    setOwned(b.data);
    setSeasonActive(!!s.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Featured carousel auto-cycle
  useEffect(() => {
    const id = setInterval(() => setFeaturedIdx((i) => (i + 1) % FEATURED_VISUALS.length), 6000);
    return () => clearInterval(id);
  }, []);

  // Shop purchase sync — listens to inventory bus and legacy shop event
  useEffect(() => {
    const onInventory = () => { load(); refresh(); };
    const onShop = () => { load(); refresh(); };
    window.addEventListener("nexoria:inventory:updated", onInventory);
    window.addEventListener("nexoria:shop:purchased", onShop);
    return () => {
      window.removeEventListener("nexoria:inventory:updated", onInventory);
      window.removeEventListener("nexoria:shop:purchased", onShop);
    };
  }, [load, refresh]);

  useProfileSync(useCallback(() => { load(); refresh(); }, [load, refresh]));

  const ownedSkus = useMemo(() => {
    const s = new Set();
    ["cosmetics", "perks", "mounts", "auras", "titles", "passes"].forEach((k) => {
      (owned[k] || []).forEach((c) => s.add(c.sku));
    });
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
      const chestItems = data.applied?.chest_items;
      if (Array.isArray(chestItems) && chestItems.length > 0) {
        sfx.chest?.();
        setChestReveal({ name: data.purchase.name, items: chestItems });
      } else {
        toast.success(`« ${data.purchase.name} » acquis !`);
      }
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
  const featuredBanner = useMemo(
    () => drawPixelBanner(900, 224, featured.theme),
    [featured.theme],
  );

  return (
    <PageShell
      wide
      className="min-h-screen"
      testid="shop-page"
      banner={banner}
    >
      {/* ===== Header ===== */}
      <div className="px-6 py-4 border-b border-purple-500/20 backdrop-blur bg-black/30 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-cyan-300" />
            <div>
              <h1 className="font-display font-black text-2xl text-cyan-200">Boutique <span className="text-gradient">d'Écus</span></h1>
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
              <span className="text-[10px] text-yellow-300/70">⟡ ÉCUS</span>
              <button onClick={() => setCat("buy_ecus")} data-testid="shop-topup-btn"
                title="Recharger des écus"
                className="ml-1 w-6 h-6 rounded-md bg-yellow-400/20 border border-yellow-300/50 text-yellow-200 hover:bg-yellow-400/30 flex items-center justify-center">
                <Plus className="w-3.5 h-3.5" />
              </button>
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
              <React.Fragment key={c.id}>
                <button onClick={() => setCat(c.id)} data-testid={`shop-cat-${c.id}`}
                  className={`w-full text-left px-3 py-2 rounded-lg border flex items-center gap-2 transition-all ${cat === c.id ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300" : "border-white/10 text-zinc-400 hover:border-white/30 hover:bg-white/5"}`}>
                  <Ico className="w-4 h-4" />
                  <span className="flex-1 font-display font-bold text-sm">{c.label}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{count}</span>
                </button>
                {c.id === "all" && (
                  <button onClick={() => setCat("vip")} data-testid="shop-cat-vip"
                    className="w-full text-left px-3 py-2.5 rounded-lg border flex items-center gap-2 transition-all relative overflow-hidden group/vip"
                    style={{
                      borderColor: cat === "vip" ? "rgba(251,191,36,0.9)" : "rgba(251,191,36,0.55)",
                      background: "linear-gradient(110deg, rgba(251,191,36,0.18), rgba(168,85,247,0.18))",
                      boxShadow: cat === "vip"
                        ? "0 0 22px rgba(251,191,36,0.55), inset 0 0 12px rgba(168,85,247,0.25)"
                        : "0 0 14px rgba(251,191,36,0.3)",
                    }}>
                    <span className="absolute inset-0 opacity-60 animate-pulse pointer-events-none"
                      style={{ background: "radial-gradient(60% 120% at 0% 50%, rgba(251,191,36,0.35), transparent 70%)" }} aria-hidden />
                    <Gem className="w-4 h-4 shrink-0 text-amber-300 relative z-10" style={{ filter: "drop-shadow(0 0 5px rgba(251,191,36,0.9))" }} />
                    <span className="flex-1 font-display font-black text-sm relative z-10"
                      style={{ background: "linear-gradient(92deg,#fde68a,#fbbf24 45%,#c084fc)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                      Pass Ascendant
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/25 text-amber-100 border border-amber-300/50 relative z-10">VIP</span>
                  </button>
                )}
                {c.id === "all" && (
                  <button onClick={() => setCat("buy_ecus")} data-testid="shop-cat-buy-ecus"
                    className={`w-full text-left px-3 py-2 rounded-lg border flex items-center gap-2 transition-all ${cat === "buy_ecus" ? "border-yellow-400/70 bg-yellow-400/10 text-yellow-200" : "border-yellow-500/30 text-yellow-300/80 hover:border-yellow-400/60 hover:bg-yellow-400/5"}`}>
                    <Coins className="w-4 h-4" />
                    <span className="flex-1 font-display font-bold text-sm">Recharger des Écus</span>
                    <Plus className="w-3.5 h-3.5 opacity-70" />
                  </button>
                )}
              </React.Fragment>
            );
          })}
          <div className="pt-3 mt-3 border-t border-white/10">
            <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2 px-2">Mes acquis</div>
            <div className="px-2 space-y-1 text-xs text-zinc-400">
              <div>✨ Cosmétiques : <span className="text-cyan-200">{owned.cosmetics?.length || 0}</span></div>
              <div>🐺 Montures : <span className="text-purple-200">{owned.mounts?.length || 0}</span></div>
              <div>🏷 Titres : <span className="text-amber-200">{owned.titles?.length || 0}</span></div>
              <div>🔥 Auras : <span className="text-orange-200">{owned.auras?.length || 0}</span></div>
              <div>⚡ Boosts : <span className="text-purple-200">{owned.boosts?.length || 0}</span></div>
              <div>🧪 Consommables : <span className="text-emerald-200">{owned.consumables?.length || 0}</span></div>
              <div>🎫 Passe : <span className="text-pink-200">{owned.passes?.length || 0}</span></div>
              <div>🏰 Royaume : <span className="text-yellow-200">{owned.perks?.length || 0}</span></div>
            </div>
          </div>
        </aside>

        {/* ===== Main ===== */}
        <main className="space-y-5">
          {cat === "buy_ecus" ? (
            <BuyEcusSection />
          ) : cat === "vip" ? (
            <VipPassSection />
          ) : (
          <>
          {/* Active boosts countdown */}
          <ActiveBoostsPanel boosts={owned.boosts} onExpire={load} />

          {/* Hero featured carousel */}
          <div className="relative h-56 rounded-2xl overflow-hidden border border-purple-500/40 group" data-testid="shop-hero">
            <AnimatePresence mode="wait">
              <motion.div key={featured.id}
                initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.8 }}
                className="absolute inset-0">
                <img src={featuredBanner} alt={featured.title}
                  className="w-full h-full object-cover pixel-art"
                  style={{ imageRendering: "pixelated" }}
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
                    onBuy={() => buyOne(it.sku)} onAdd={() => addToCart(it)} aether={user?.aether ?? 0}
                    userLevel={user?.level ?? 1} seasonActive={seasonActive} />
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
                    onBuy={() => buyOne(it.sku)} onAdd={() => addToCart(it)} aether={user?.aether ?? 0}
                    userLevel={user?.level ?? 1} seasonActive={seasonActive} />
                ))}
              </div>
            )}
          </Section>
          </>
          )}
        </main>
      </div>

      {/* ===== CHEST REVEAL ===== */}
      <ChestRevealModal reveal={chestReveal} onClose={() => setChestReveal(null)} />

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
    </PageShell>
  );
}

/* ============== Subcomponents ============== */
function ChestRevealModal({ reveal, onClose }) {
  return (
    <AnimatePresence>
      {reveal && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
          data-testid="chest-reveal-modal"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl border border-yellow-500/40 bg-gradient-to-br from-[#15100a] via-[#0A0613] to-[#120a18] p-6 shadow-[0_0_60px_rgba(251,191,36,0.25)]"
          >
            <button onClick={onClose} className="absolute top-3 right-3 text-zinc-400 hover:text-white" aria-label="Fermer">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border-2 border-yellow-500/50 bg-yellow-500/10 mb-3">
                <Gift className="w-8 h-8 text-yellow-300" />
              </div>
              <h3 className="font-display font-black text-2xl text-yellow-200">Coffre ouvert !</h3>
              <p className="text-xs text-zinc-400 mt-1">
                {reveal.items.length} relique{reveal.items.length > 1 ? "s" : ""} ajoutée{reveal.items.length > 1 ? "s" : ""} à votre inventaire
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reveal.items.map((it, i) => {
                const r = RARITY[it.rarity] || RARITY.common;
                return (
                  <motion.div
                    key={it.item_id || i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-black/40"
                    style={{ borderColor: `${r.color}66`, boxShadow: `0 0 16px ${r.glow}` }}
                    data-testid={`chest-item-${i}`}
                  >
                    <div className="text-3xl shrink-0">{it.icon || "✨"}</div>
                    <div className="min-w-0">
                      <div className="font-display font-bold text-sm truncate" style={{ color: r.color }}>{it.name}</div>
                      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{r.fr}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <button
              onClick={onClose}
              className="mt-5 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 text-black font-display font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform"
              data-testid="chest-reveal-close"
            >
              Récupérer le butin
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const BOOST_LABELS = {
  xp_multiplier: { label: "XP", color: "#a855f7", icon: Zap },
  aether_multiplier: { label: "Écus", color: "#FCD34D", icon: Coins },
  luck: { label: "Chance", color: "#34D399", icon: Sparkles },
};

function fmtCountdown(ms) {
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function ActiveBoostsPanel({ boosts, onExpire }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const active = (boosts || [])
    .map((b) => ({ ...b, remaining: new Date(b.expires_at).getTime() - now }))
    .filter((b) => b.remaining > 0);

  // Trigger a refresh once a boost crosses to expired.
  const expiredRef = React.useRef(false);
  useEffect(() => {
    const anyExpired = (boosts || []).some((b) => new Date(b.expires_at).getTime() - now <= 0);
    if (anyExpired && !expiredRef.current) { expiredRef.current = true; onExpire?.(); }
    if (!anyExpired) expiredRef.current = false;
  }, [now, boosts, onExpire]);

  if (active.length === 0) return null;
  return (
    <div className="rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-900/30 to-cyan-900/20 p-4" data-testid="active-boosts-panel">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-purple-300" />
        <h2 className="font-display font-black text-sm uppercase tracking-widest text-purple-200">Effets actifs</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {active.map((b) => {
          const cfg = BOOST_LABELS[b.boost_type] || { label: b.boost_type, color: "#22D3EE", icon: Zap };
          const BIco = cfg.icon;
          const urgent = b.remaining < 60000;
          return (
            <div key={b.sku + b.expires_at} className="flex items-center gap-3 p-3 rounded-xl border bg-black/40"
              style={{ borderColor: `${cfg.color}55` }} data-testid={`active-boost-${b.sku}`}>
              <BIco className="w-5 h-5 shrink-0" style={{ color: cfg.color }} />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-white truncate">{b.name || cfg.label}</div>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: cfg.color }}>
                  {cfg.label} ×{b.boost_value}
                </div>
              </div>
              <div className={`font-mono-stat font-black text-sm ${urgent ? "text-red-300 animate-pulse" : "text-zinc-200"}`}>
                {fmtCountdown(b.remaining)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

function ItemCard({ item, owned, buying, onBuy, onAdd, aether, userLevel = 1, rank, compact, seasonActive = true }) {
  const { t } = useI18n();
  const [showInfo, setShowInfo] = useState(false);
  const r = RARITY[item.rarity] || RARITY.common;
  const requiredLevel = item.unlock_level ?? 1;
  const levelOk = userLevel >= requiredLevel;
  const canAfford = (aether ?? 0) >= (item.price || 0);
  const seasonBlocked = item.category === "pass" && !seasonActive;
  const canBuy = canAfford && levelOk && !owned && !seasonBlocked;
  const Ico = item.icon && Lucide[item.icon] ? Lucide[item.icon] : Sparkles;
  const info = itemActivationInfo(item);
  return (
    <PremiumCard
      tone="violet"
      hover
      className={`overflow-hidden relative ${compact ? "p-2" : ""}`}
      testid={`shop-item-${item.sku}`}
      style={{ borderColor: `${r.color}66`, boxShadow: `0 0 16px ${r.glow}` }}
    >
      {/* Info button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }}
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
        data-testid={`shop-info-${item.sku}`}
        aria-label="Informations sur l'article"
        className="absolute top-2 right-2 z-20 w-5 h-5 rounded-full border border-cyan-400/50 bg-cyan-500/15 text-cyan-200 text-[11px] font-black flex items-center justify-center hover:bg-cyan-500/30 transition-colors"
      >
        i
      </button>
      {showInfo && (
        <div
          className="absolute top-9 right-2 z-30 w-52 p-3 rounded-lg border border-cyan-400/40 bg-[#0A0613]/95 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.6)] text-left"
          data-testid={`shop-info-popover-${item.sku}`}
        >
          <div className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold mb-1">Comment l'utiliser</div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">{info}</p>
        </div>
      )}
      {rank && (
        <div className="absolute top-2 left-2 text-[10px] font-black text-yellow-300 bg-yellow-500/10 border border-yellow-500/40 rounded-full w-6 h-6 flex items-center justify-center">
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
        {!levelOk && requiredLevel > 1 && (
          <div className="text-[10px] text-amber-400/90 mt-1 font-semibold">{t("shop.level_required", { level: requiredLevel })}</div>
        )}
        {seasonBlocked && (
          <div className="text-[10px] text-amber-400/90 mt-1 font-semibold">Aucune saison en cours</div>
        )}
      </div>
      <div className="mt-3 flex gap-1">
        {owned ? (
          <button disabled className="flex-1 px-2 py-1.5 rounded border border-emerald-500/40 text-emerald-300 text-xs font-bold cursor-not-allowed">
            {t("shop.owned")}
          </button>
        ) : (
          <>
            <button onClick={onBuy} disabled={!canBuy || buying} data-testid={`shop-buy-${item.sku}`}
              className="flex-1 px-2 py-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 text-xs font-bold disabled:opacity-40">
              {buying ? "..." : seasonBlocked ? "Indisponible" : !levelOk ? t("shop.level_insufficient") : t("shop.buy")}
            </button>
            <button onClick={onAdd} title="Ajouter au panier"
              data-testid={`shop-cart-${item.sku}`}
              className="px-2 py-1.5 rounded border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200">
              <Plus className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </PremiumCard>
  );
}
