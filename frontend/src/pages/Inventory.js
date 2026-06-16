import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Lucide from "lucide-react";
import { Gem, Sparkles, Coins, Package, Wand2, Flag, Zap, Scroll, Castle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import { useInventorySync } from "@/hooks/useInventorySync";
import { useProfileSync } from "@/hooks/useProfileSync";
import { RARITY } from "@/lib/design-tokens";
import { PremiumButton, PremiumCard, PageShell, PremiumModal } from "@/components/ui-premium";

import { usePageBanner } from "@/lib/page-banners";

export default function Inventory() {
  const { user, refresh } = useAuth();
  const [items, setItems] = useState([]);
  const [shopInv, setShopInv] = useState({ cosmetics: [], boosts: [], consumables: [], perks: [], mounts: [], auras: [], titles: [], passes: [] });
  const [shopItems, setShopItems] = useState([]);
  const [rarities, setRarities] = useState([]);
  const [opening, setOpening] = useState(false);
  const [newItems, setNewItems] = useState(null);
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("relics"); // relics | cosmetics | boosts | consumables | perks

  const load = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      api.get("/inventory"),
      api.get("/game/rarities"),
      api.get("/shop/inventory"),
      api.get("/shop/items"),
    ]);
    setItems(a.data); setRarities(b.data); setShopInv(c.data); setShopItems(d.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  useInventorySync(useCallback((detail) => {
    load();
    refresh();
    if (detail?.source === "shop" && detail?.name) {
      toast.success(`« ${detail.name} » ajouté à ton inventaire`);
    }
  }, [load, refresh]));

  useProfileSync(useCallback(() => {
    load();
    refresh();
  }, [load, refresh]));

  const equipCosmetic = async (sku, slot) => {
    try {
      const body = slot === "frame" ? { active_frame: sku } : { active_banner: sku };
      await api.put("/profile", body);
      sfx.success();
      toast.success(slot === "frame" ? "Cadre équipé — visible dans le Nexus" : "Bannière équipée");
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Équipement impossible");
    }
  };

  const equipAura = async (sku) => {
    try {
      await api.put("/profile", { active_aura_sku: sku });
      sfx.success();
      toast.success("Aura équipée — visible dans le Nexus");
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Équipement impossible");
    }
  };

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

  const dedupe = async () => {
    try {
      const { data } = await api.post("/inventory/dedupe");
      if (data.removed > 0) {
        toast.success(`Coffre compacté — ${data.removed} doublon${data.removed > 1 ? "s" : ""} fusionné${data.removed > 1 ? "s" : ""}.`);
        sfx.success();
      } else {
        toast.info("Aucun doublon à compacter.");
      }
      await load();
    } catch (e) { toast.error("Compactage impossible"); }
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.rarity === filter);
  const banner = usePageBanner("inventory", { count: items.length });

  return (
    <PageShell
      wide
      testid="inventory-page"
      banner={banner}
    >
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <PremiumButton variant="gold" size="md" icon={Sparkles} onClick={openChest}
          disabled={opening || (user?.aether || 0) < 50} testid="open-chest-btn">
          Briser un sceau — 50 ✦
        </PremiumButton>
        <PremiumButton variant="violet" size="md" icon={Wand2} onClick={dedupe} testid="dedupe-chest-btn">
          Compacter
        </PremiumButton>
      </div>

      {/* Tabs — switch between asset types */}
      <div className="flex flex-wrap gap-2 mb-4 justify-center" data-testid="inventory-tabs">
        {[
          { id: "relics", label: "Reliques", icon: Gem, count: items.length },
          { id: "cosmetics", label: "Cosmétiques", icon: Flag, count: shopInv.cosmetics.length },
          { id: "boosts", label: "Élixirs actifs", icon: Zap, count: shopInv.boosts.length },
          { id: "consumables", label: "Consommables", icon: Scroll, count: shopInv.consumables.length },
          { id: "perks", label: "Royaume", icon: Castle, count: shopInv.perks.length },
          { id: "mounts", label: "Montures", icon: Sparkles, count: shopInv.mounts?.length || 0 },
          { id: "auras", label: "Auras", icon: Zap, count: shopInv.auras?.length || 0 },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`inv-tab-${t.id}`}
            className={`px-4 py-2 rounded-md text-sm font-bold font-display tracking-wide border transition-all flex items-center gap-2 ${tab === t.id ? "border-cyan-500/60 text-cyan-300 bg-cyan-500/10 shadow-[0_0_14px_rgba(0,229,255,0.2)]" : "border-white/10 text-zinc-400 hover:border-white/30"}`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label} <span className="font-mono-stat text-[10px] opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Rarity filters — small medallions */}
      {tab === "relics" && (
      <div className="flex flex-wrap gap-2 mb-6 justify-center" data-testid="rarity-filters">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded text-xs font-bold font-display tracking-wide border ${filter === "all" ? "border-cyan-500/60 text-cyan-300" : "border-white/10 text-zinc-400"}`}>Tous</button>
        {rarities.map((r) => {
          const tok = RARITY[r.id] || RARITY.common;
          return (
          <button key={r.id} onClick={() => setFilter(r.id)}
            className={`px-3 py-1.5 rounded text-xs font-bold font-display tracking-wide border ${tok.border} ${filter === r.id ? tok.text : "opacity-50 text-zinc-400"}`}
            data-testid={`filter-${r.id}`}>
            {r.name}
          </button>
        );})}
      </div>
      )}

      {tab === "relics" && (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3" data-testid="inventory-grid">
        {filtered.length === 0 && (
          <div className="col-span-full">
            <PremiumCard tone="gold" className="p-12 text-center text-zinc-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <div className="italic">Le cabinet attend ses premières trouvailles...</div>
            </PremiumCard>
          </div>
        )}
        {filtered.map((item, i) => {
          const I = Lucide[item.icon] || Lucide.Package;
          const tok = RARITY[item.rarity] || RARITY.common;
          return (
            <motion.div
              key={item.item_id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.02, 0.5) }}
              whileHover={{ scale: 1.05, rotate: 1 }}
              className={`aspect-square relative rounded-xl border-2 ${tok.border} bg-gradient-to-br ${tok.bg} p-3 flex flex-col items-center justify-center text-center group cursor-pointer overflow-hidden`}
              style={{ boxShadow: `0 0 12px ${tok.glow}` }}
              data-testid={`item-${item.item_id}`}
            >
              <I className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" style={{ color: tok.color, filter: `drop-shadow(0 0 8px ${tok.glow})` }} />
              <div className="text-xs font-display font-bold text-white leading-tight">{item.name}</div>
              <div className={`text-[8px] uppercase tracking-[0.2em] font-bold mt-1 ${tok.text}`}>{tok.fr}</div>
              {item.quantity > 1 && (
                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-violet-500/30 text-violet-200 text-[9px] font-mono-stat font-bold">x{item.quantity}</div>
              )}
            </motion.div>
          );
        })}
      </div>
      )}

      {tab !== "relics" && (
        <ShopOwnedGrid
          tab={tab}
          owned={shopInv}
          shopItems={shopItems}
          user={user}
          onEquipFrame={(sku) => equipCosmetic(sku, "frame")}
          onEquipBanner={(sku) => equipCosmetic(sku, "banner")}
          onEquipAura={equipAura}
        />
      )}

      {/* Chest unsealing modal */}
      <PremiumModal open={!!newItems} onClose={() => setNewItems(null)} title="Révélation" icon={Sparkles} maxWidth="max-w-2xl" testid="chest-modal">
        <div className="p-6 text-center">
          <div className="text-[10px] uppercase tracking-[0.4em] text-yellow-400 font-bold mb-2">Sceau brisé</div>
          <p className="text-zinc-400 mb-6 italic">Les brumes s'écartent et révèlent leurs présents...</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {newItems?.map((it) => {
              const I = Lucide[it.icon] || Lucide.Package;
              const r = RARITY[it.rarity] || RARITY.common;
              return (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
                  key={it.item_id}
                  className={`rounded-xl p-4 border-2 bg-black/30 bg-gradient-to-br ${r.bg} ${r.border}`}
                  style={{ boxShadow: `0 0 16px ${r.glow}` }}>
                  <I className="w-10 h-10 mx-auto mb-2" style={{ color: r.color }} />
                  <div className="font-display font-bold">{it.name}</div>
                  <div className={`text-[10px] uppercase tracking-[0.25em] font-bold mt-1 ${r.text}`}>{r.fr || it.rarity}</div>
                </motion.div>
              );
            })}
          </div>
          <PremiumButton variant="cyan" size="sm" onClick={() => setNewItems(null)} testid="close-chest-modal">
            Sceller à nouveau
          </PremiumButton>
        </div>
      </PremiumModal>
    </PageShell>
  );
}


function ShopOwnedGrid({ tab, owned, shopItems, user, onEquipFrame, onEquipBanner, onEquipAura }) {
  const itemsByKey = Object.fromEntries(shopItems.map((it) => [it.sku, it]));
  const now = Date.now();
  let list = [];
  if (tab === "cosmetics") list = owned.cosmetics;
  else if (tab === "boosts") list = (owned.boosts || []).filter((b) => new Date(b.expires_at).getTime() > now);
  else if (tab === "consumables") list = owned.consumables;
  else if (tab === "perks") list = owned.perks;
  else if (tab === "mounts") list = owned.mounts || [];
  else if (tab === "auras") list = owned.auras || [];

  if (list.length === 0) {
    return (
      <PremiumCard tone="cyan" className="p-12 text-center text-zinc-500 max-w-xl mx-auto" testid={`empty-${tab}`}>
        <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <div className="italic">Aucun objet de cette catégorie pour le moment.</div>
      </PremiumCard>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid={`grid-${tab}`}>
      {list.map((row, i) => {
        const sku = row.sku;
        const meta = itemsByKey[sku] || {};
        const I = Lucide[meta.icon] || Lucide.Package;
        const tok = RARITY[meta.rarity] || RARITY.common;
        const isFrame = sku?.startsWith("frame_");
        const isBanner = sku?.startsWith("banner_");
        const equipped = isFrame && user?.active_frame === sku
          || isBanner && user?.active_banner === sku
          || tab === "auras" && user?.active_aura_sku === sku;
        return (
          <PremiumCard key={`${sku}-${i}`} tone="violet" className={`border-2 ${tok.border}`}
            style={{ boxShadow: `0 0 12px ${tok.glow}` }}
            testid={`inv-row-${tab}-${sku}`}>
            {row.quantity > 1 && (
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full border border-violet-500/40 bg-violet-500/15 text-violet-200 text-[10px] font-mono-stat font-bold">x{row.quantity}</span>
            )}
            <div className="flex items-start gap-3">
              <I className="w-10 h-10 shrink-0" style={{ color: tok.color, filter: `drop-shadow(0 0 8px ${tok.glow})` }} />
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-base">{meta.name || sku}</div>
                <div className={`text-[9px] uppercase tracking-[0.25em] font-bold mt-0.5 ${tok.text}`}>{tok.fr}</div>
                {meta.description && (
                  <div className="text-xs text-zinc-400 italic mt-1.5">{meta.description}</div>
                )}
                {tab === "boosts" && row.expires_at && (
                  <div className="text-[10px] font-mono-stat text-cyan-300 mt-1.5">
                    Expire le {new Date(row.expires_at).toLocaleString("fr-FR")}
                  </div>
                )}
                {tab === "cosmetics" && (isFrame || isBanner) && (
                  <PremiumButton variant={equipped ? "cyan" : "ghost"} size="sm" className="mt-2"
                    onClick={() => (isFrame ? onEquipFrame : onEquipBanner)(sku)}>
                    {equipped ? "Équipé" : "Équiper"}
                  </PremiumButton>
                )}
                {tab === "auras" && (
                  <PremiumButton variant={equipped ? "cyan" : "ghost"} size="sm" className="mt-2"
                    onClick={() => onEquipAura(sku)}>
                    {equipped ? "Aura active" : "Équiper l'aura"}
                  </PremiumButton>
                )}
              </div>
            </div>
          </PremiumCard>
        );
      })}
    </div>
  );
}
