import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import * as Lucide from "lucide-react";
import { Gem, Sparkles, Coins, Package, Wand2, Flag, Zap, Scroll, Castle, Gift, ArrowLeftRight, Send, X, Check, Info, Hammer } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { sfx } from "@/lib/sfx";
import { useInventorySync } from "@/hooks/useInventorySync";
import { useProfileSync } from "@/hooks/useProfileSync";
import { RARITY } from "@/lib/design-tokens";
import { PremiumButton, PremiumCard, PageShell, PremiumModal } from "@/components/ui-premium";

import { usePageBanner } from "@/lib/page-banners";
import {
  INVENTORY_TAB_GUIDE,
  INVENTORY_ACTIONS_GUIDE,
  INVENTORY_SOURCES_GUIDE,
  relicUsageInfo,
  shopOwnedUsageInfo,
} from "@/lib/itemUsageHelp";

export default function Inventory() {
  const { t, locale } = useI18n();
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [shopInv, setShopInv] = useState({ cosmetics: [], boosts: [], consumables: [], perks: [], mounts: [], auras: [], titles: [], passes: [] });
  const [shopItems, setShopItems] = useState([]);
  const [rarities, setRarities] = useState([]);
  const [opening, setOpening] = useState(false);
  const [newItems, setNewItems] = useState(null);
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("relics"); // relics | cosmetics | boosts | consumables | perks
  // ── Economy ──
  const [searchParams] = useSearchParams();
  const [trades, setTrades] = useState({ incoming: [], outgoing: [] });
  const [sendOpen, setSendOpen] = useState(false);
  const [tradesOpen, setTradesOpen] = useState(false);
  const [itemAction, setItemAction] = useState(null); // relic selected for gift/trade
  const [guideOpen, setGuideOpen] = useState(false);

  const loadTrades = useCallback(async () => {
    try {
      const { data } = await api.get("/economy/trades");
      setTrades(data || { incoming: [], outgoing: [] });
    } catch { /* silent */ }
  }, []);

  const load = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      api.get("/inventory"),
      api.get("/game/rarities"),
      api.get("/shop/inventory"),
      api.get("/shop/items"),
    ]);
    setItems(a.data); setRarities(b.data); setShopInv(c.data); setShopItems(d.data);
  }, []);
  useEffect(() => { load(); loadTrades(); }, [load, loadTrades]);

  // Open the trades panel when arriving via a notification link (?trades=1)
  useEffect(() => {
    if (searchParams.get("trades") === "1") setTradesOpen(true);
  }, [searchParams]);

  useInventorySync(useCallback((detail) => {
    load();
    loadTrades();
    refresh();
    if (detail?.source === "shop" && detail?.name) {
      toast.success(t("inventory.toast.item_added", { name: detail.name }));
    }
  }, [load, loadTrades, refresh, t]));

  useProfileSync(useCallback(() => {
    load();
    refresh();
  }, [load, refresh]));

  const equipCosmetic = async (sku, slot) => {
    try {
      const body = slot === "frame" ? { active_frame: sku } : { active_banner: sku };
      await api.put("/profile", body);
      sfx.success();
      toast.success(slot === "frame" ? t("inventory.toast.frame_equipped") : t("inventory.toast.banner_equipped"));
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || t("inventory.toast.equip_failed"));
    }
  };

  const equipAura = async (sku) => {
    try {
      await api.put("/profile", { active_aura_sku: sku });
      sfx.success();
      toast.success(t("inventory.toast.aura_equipped"));
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || t("inventory.toast.equip_failed"));
    }
  };

  const equipMount = async (sku) => {
    try {
      await api.put("/profile", { active_mount: sku });
      sfx.success();
      toast.success(t("inventory.toast.mount_equipped"));
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || t("inventory.toast.equip_failed"));
    }
  };

  const openChest = async () => {
    if ((user?.aether || 0) < 50) { toast.error(t("inventory.toast.chest_cost")); return; }
    setOpening(true);
    try {
      const { data } = await api.post("/inventory/open-chest");
      sfx.chest();
      if (!data.items || data.items.length === 0) {
        toast.info(t("inventory.toast.all_owned_refund", { amount: data.refunded || 50 }));
      } else {
        setNewItems(data.items);
      }
      await load(); await refresh();
    } catch (e) { toast.error(e.response?.data?.detail || t("inventory.toast.chest_resist")); }
    finally { setOpening(false); }
  };

  const dedupe = async () => {
    try {
      const { data } = await api.post("/inventory/dedupe");
      if (data.removed > 0) {
        toast.success(t("inventory.toast.dedupe_ok", { count: data.removed }));
        sfx.success();
      } else {
        toast.info(t("inventory.toast.no_duplicates"));
      }
      await load();
    } catch (e) { toast.error(t("inventory.toast.dedupe_failed")); }
  };

  const afterEconomy = async () => { await load(); await loadTrades(); await refresh(); };

  const filtered = filter === "all" ? items : items.filter((i) => i.rarity === filter);
  const banner = usePageBanner("inventory", { count: items.length });
  const incomingCount = trades.incoming?.length || 0;
  const tabGuide = INVENTORY_TAB_GUIDE[tab];

  return (
    <PageShell
      wide
      testid="inventory-page"
      banner={banner}
    >
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <PremiumButton variant="gold" size="md" icon={Sparkles} onClick={openChest}
          disabled={opening || (user?.aether || 0) < 50} testid="open-chest-btn">
          {t("inventory.open_chest")}
        </PremiumButton>
        <PremiumButton variant="violet" size="md" icon={Wand2} onClick={dedupe} testid="dedupe-chest-btn">
          {t("inventory.compact")}
        </PremiumButton>
        <PremiumButton variant="gold" size="md" icon={Hammer} onClick={() => navigate("/craft")} testid="inventory-forge-btn">
          {t("inventory.forge_btn")}
        </PremiumButton>
        <div className="flex-1" />
        <PremiumButton variant="cyan" size="md" icon={Send} onClick={() => setSendOpen(true)} testid="send-ecus-btn">
          {t("inventory.send_ecus")}
        </PremiumButton>
        <button
          type="button"
          onClick={() => setTradesOpen(true)}
          data-testid="trades-btn"
          className="relative inline-flex items-center gap-2 px-4 py-2 rounded-md border border-amber-500/50 text-amber-200 font-bold font-display tracking-wide text-sm hover:bg-amber-500/10 transition-colors"
        >
          <ArrowLeftRight className="w-4 h-4" /> {t("inventory.trades")}
          {incomingCount > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[1.2rem] h-[1.2rem] px-1 rounded-full bg-amber-500 text-black text-[10px] font-black flex items-center justify-center">
              {incomingCount}
            </span>
          )}
        </button>
      </div>

      {/* Tabs — switch between asset types */}
      <div className="flex flex-wrap items-center gap-2 mb-4 justify-center" data-testid="inventory-tabs">
        {[
          { id: "relics", icon: Gem, count: items.length },
          { id: "cosmetics", icon: Flag, count: shopInv.cosmetics.length },
          { id: "boosts", icon: Zap, count: shopInv.boosts.length },
          { id: "consumables", icon: Scroll, count: shopInv.consumables.length },
          { id: "perks", icon: Castle, count: shopInv.perks.length },
          { id: "mounts", icon: Sparkles, count: shopInv.mounts?.length || 0 },
          { id: "auras", icon: Zap, count: shopInv.auras?.length || 0 },
        ].map((tabDef) => (
          <button key={tabDef.id} onClick={() => setTab(tabDef.id)} data-testid={`inv-tab-${tabDef.id}`}
            className={`px-4 py-2 rounded-md text-sm font-bold font-display tracking-wide border transition-all flex items-center gap-2 ${tab === tabDef.id ? "border-cyan-500/60 text-cyan-300 bg-cyan-500/10 shadow-[0_0_14px_rgba(0,229,255,0.2)]" : "border-white/10 text-zinc-400 hover:border-white/30"}`}>
            <tabDef.icon className="w-3.5 h-3.5" />
            {t(`inventory.tab.${tabDef.id}`)} <span className="font-mono-stat text-[10px] opacity-70">({tabDef.count})</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          data-testid="inventory-guide-btn"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-bold font-display tracking-wide border border-violet-500/40 text-violet-200 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
          title={t("inventory.guide_title")}
        >
          <Info className="w-3.5 h-3.5" /> {t("inventory.guide")}
        </button>
      </div>

      {tabGuide && (
        <div className="mb-4 max-w-3xl mx-auto rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-zinc-300" data-testid="inventory-tab-hint">
          <span className="text-cyan-300 font-bold">{tabGuide.title} — </span>
          {tabGuide.summary}
          <button type="button" onClick={() => setGuideOpen(true)} className="ml-2 text-cyan-400 underline underline-offset-2 hover:text-cyan-200 text-xs">
            {t("inventory.learn_more")}
          </button>
        </div>
      )}

      {/* Rarity filters — small medallions */}
      {tab === "relics" && (
      <div className="flex flex-wrap gap-2 mb-6 justify-center" data-testid="rarity-filters">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded text-xs font-bold font-display tracking-wide border ${filter === "all" ? "border-cyan-500/60 text-cyan-300" : "border-white/10 text-zinc-400"}`}>{t("inventory.filter_all")}</button>
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
              <div className="italic">{t("inventory.empty_relics")}</div>
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
              onClick={() => setItemAction(item)}
              className={`aspect-square relative rounded-xl border-2 ${tok.border} bg-gradient-to-br ${tok.bg} p-3 flex flex-col items-center justify-center text-center group cursor-pointer overflow-visible`}
              style={{ boxShadow: `0 0 12px ${tok.glow}` }}
              data-testid={`item-${item.item_id}`}
            >
              <InventoryInfoButton
                text={relicUsageInfo(item)}
                testId={`item-info-${item.item_id}`}
                className="top-1 left-1"
              />
              <I className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" style={{ color: tok.color, filter: `drop-shadow(0 0 8px ${tok.glow})` }} />
              <div className="text-xs font-display font-bold text-white leading-tight">{item.name}</div>
              <div className={`text-[8px] uppercase tracking-[0.2em] font-bold mt-1 ${tok.text}`}>{tok.fr}</div>
              {item.quantity > 1 && (
                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-violet-500/30 text-violet-200 text-[9px] font-mono-stat font-bold">x{item.quantity}</div>
              )}
              <div className="absolute inset-x-0 bottom-0 py-1 bg-black/70 opacity-0 group-hover:opacity-100 group-has-[data-info-open]:opacity-0 group-has-[data-info-open]:pointer-events-none transition-opacity flex items-center justify-center gap-1 text-[8px] uppercase tracking-widest font-bold text-amber-200 rounded-b-xl">
                <Gift className="w-2.5 h-2.5" /> {t("inventory.gift_trade_hover")}
              </div>
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
          onEquipMount={equipMount}
        />
      )}

      {/* Chest unsealing modal */}
      <PremiumModal open={!!newItems} onClose={() => setNewItems(null)} title={t("inventory.chest.title")} icon={Sparkles} maxWidth="max-w-2xl" testid="chest-modal">
        <div className="p-6 text-center">
          <div className="text-[10px] uppercase tracking-[0.4em] text-yellow-400 font-bold mb-2">{t("inventory.chest.seal_broken")}</div>
          <p className="text-zinc-400 mb-6 italic">{t("inventory.chest.reveal_text")}</p>
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
            {t("inventory.chest.close")}
          </PremiumButton>
        </div>
      </PremiumModal>

      {/* ── Economy modals ── */}
      <SendEcusModal open={sendOpen} onClose={() => setSendOpen(false)} onDone={afterEconomy} />
      <ItemActionModal item={itemAction} onClose={() => setItemAction(null)} onDone={afterEconomy} />
      <TradesModal
        open={tradesOpen}
        onClose={() => setTradesOpen(false)}
        trades={trades}
        relics={items}
        onDone={afterEconomy}
      />
      <InventoryGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} activeTab={tab} />
    </PageShell>
  );
}

/* ─── Bouton info « i » + popover (portal, au-dessus de la carte) ─ */
function InventoryInfoButton({ text, testId, className = "" }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, flip: false });

  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const popH = popRef.current?.offsetHeight || 120;
    const spaceAbove = r.top;
    const flip = spaceAbove < popH + 12;
    setPos({
      top: flip ? r.bottom + 8 : r.top - 8,
      left: Math.min(Math.max(8, r.left), window.innerWidth - 272),
      flip,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
    const id = requestAnimationFrame(updatePos);
    return () => cancelAnimationFrame(id);
  }, [open, updatePos, text]);

  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!text) return null;

  const popover = open && createPortal(
    <div
      ref={popRef}
      data-inv-info-popover
      data-testid={testId ? `${testId}-popover` : undefined}
      className="fixed z-[9999] w-64 max-w-[calc(100vw-16px)] p-3 rounded-lg border border-cyan-400/50 bg-[#0A0613]/98 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.85)] text-left"
      style={{
        top: pos.top,
        left: pos.left,
        transform: pos.flip ? "none" : "translateY(-100%)",
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold mb-1.5">{t("inventory.how_to_use")}</div>
      <p className="text-[11px] text-zinc-200 leading-relaxed">{text}</p>
    </div>,
    document.body,
  );

  return (
    <>
      <div
        className={`absolute z-20 ${className}`}
        data-info-open={open ? "true" : undefined}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          ref={btnRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          data-testid={testId}
          aria-label={t("inventory.item_info_aria")}
          aria-expanded={open}
          className={`w-5 h-5 rounded-full border text-[11px] font-black flex items-center justify-center transition-colors shadow-md ${
            open
              ? "border-cyan-300 bg-cyan-500/40 text-white"
              : "border-cyan-400/50 bg-[#0A0613]/90 text-cyan-200 hover:bg-cyan-500/30"
          }`}
        >
          i
        </button>
      </div>
      {popover}
    </>
  );
}

/* ─── Modal guide complet ─────────────────────────────────── */
function InventoryGuideModal({ open, onClose, activeTab }) {
  const { t } = useI18n();
  const tabGuide = INVENTORY_TAB_GUIDE[activeTab];
  return (
    <PremiumModal open={open} onClose={onClose} title={t("inventory.guide_title")} icon={Info} maxWidth="max-w-2xl" testid="inventory-guide-modal">
      <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto text-sm text-zinc-300">
        {tabGuide && (
          <section>
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-cyan-300 font-bold mb-2">
              {t("inventory.guide.current_tab", { title: tabGuide.title })}
            </h3>
            <p className="text-zinc-400 mb-2">{tabGuide.summary}</p>
            <ul className="space-y-1.5 list-disc list-inside text-zinc-300">
              {tabGuide.steps.map((step) => (
                <li key={step} className="leading-relaxed">{step}</li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-amber-300 font-bold mb-2">{t("inventory.guide.buttons")}</h3>
          <div className="space-y-2">
            {INVENTORY_ACTIONS_GUIDE.map((row) => (
              <div key={row.title} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="font-bold text-white text-xs">{row.title}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{row.text}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-violet-300 font-bold mb-2">{t("inventory.guide.all_tabs")}</h3>
          <div className="space-y-3">
            {Object.values(INVENTORY_TAB_GUIDE).map((g) => (
              <div key={g.title} className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2">
                <div className="font-bold text-violet-200 text-xs">{g.title}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">{g.summary}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 font-bold mb-2">{t("inventory.guide.sources")}</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {INVENTORY_SOURCES_GUIDE.map((row) => (
              <div key={row.title} className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2">
                <div className="font-bold text-emerald-200 text-xs">{row.title}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">{row.text}</div>
              </div>
            ))}
          </div>
        </section>

        <p className="text-[11px] text-zinc-500 italic border-t border-white/10 pt-4">
          {t("inventory.guide.footer")}
        </p>
      </div>
    </PremiumModal>
  );
}

/* ─── Modal : envoyer des écus ─────────────────────────────── */
function SendEcusModal({ open, onClose, onDone }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ to_username: "", amount: "", message: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const amount = parseInt(form.amount, 10);
    if (!form.to_username.trim() || !amount || amount < 1) {
      toast.error(t("inventory.send.invalid"));
      return;
    }
    setSaving(true);
    try {
      await api.post("/economy/send-ecus", {
        to_username: form.to_username.trim(),
        amount,
        message: form.message.trim() || undefined,
      });
      sfx.success();
      toast.success(t("inventory.toast.ecus_sent", { amount, username: form.to_username.trim() }));
      setForm({ to_username: "", amount: "", message: "" });
      onClose();
      await onDone();
    } catch (err) {
      toast.error(err.response?.data?.detail || t("inventory.send.failed"));
    } finally { setSaving(false); }
  };

  return (
    <PremiumModal open={open} onClose={onClose} title={t("inventory.send.title")} icon={Coins} maxWidth="max-w-md" testid="send-ecus-modal">
      <form onSubmit={submit} className="p-5 space-y-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1 block">{t("inventory.send.recipient")}</label>
          <input value={form.to_username} onChange={(e) => setForm({ ...form, to_username: e.target.value })}
            placeholder={t("inventory.send.username_ph")} required minLength={3}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm" data-testid="send-ecus-username" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1 block">{t("inventory.send.amount")}</label>
          <input type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="100" required
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono-stat" data-testid="send-ecus-amount" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1 block">{t("inventory.send.message_optional")}</label>
          <input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
            maxLength={200} placeholder={t("inventory.send.message_ph")}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm" data-testid="send-ecus-message" />
        </div>
        <PremiumButton type="submit" variant="cyan" size="md" disabled={saving} icon={Send} className="w-full" testid="send-ecus-submit">
          {saving ? t("inventory.send.sending") : t("inventory.send.submit")}
        </PremiumButton>
      </form>
    </PremiumModal>
  );
}

/* ─── Modal : offrir / proposer un échange pour une relique ── */
function ItemActionModal({ item, onClose, onDone }) {
  const { t } = useI18n();
  const [mode, setMode] = useState("menu"); // menu | gift | trade
  const [username, setUsername] = useState("");
  const [qty, setQty] = useState(1);
  const [tradeEcus, setTradeEcus] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) { setMode("menu"); setUsername(""); setQty(1); setTradeEcus(""); setNote(""); }
  }, [item]);

  if (!item) return null;
  const tok = RARITY[item.rarity] || RARITY.common;
  const I = Lucide[item.icon] || Lucide.Package;
  const maxQty = item.quantity || 1;
  const relicId = item.item_id || item.inv_id;

  const gift = async (e) => {
    e.preventDefault();
    if (!username.trim()) { toast.error(t("inventory.gift.username_required")); return; }
    setSaving(true);
    try {
      await api.post("/economy/gift-item", { to_username: username.trim(), item_id: relicId, quantity: qty });
      sfx.success();
      toast.success(t("inventory.toast.gift_offered", { name: item.name, username: username.trim() }));
      onClose();
      await onDone();
    } catch (err) {
      toast.error(err.response?.data?.detail || t("inventory.gift.failed"));
    } finally { setSaving(false); }
  };

  const proposeTrade = async (e) => {
    e.preventDefault();
    if (!username.trim()) { toast.error(t("inventory.gift.username_required")); return; }
    setSaving(true);
    try {
      await api.post("/economy/trades", {
        to_username: username.trim(),
        give_items: [{ item_id: relicId, quantity: qty }],
        give_ecus: parseInt(tradeEcus, 10) || 0,
        note: note.trim() || undefined,
      });
      sfx.success();
      toast.success(t("inventory.trade.proposal_sent", { username: username.trim() }));
      onClose();
      await onDone();
    } catch (err) {
      toast.error(err.response?.data?.detail || t("inventory.trade.failed"));
    } finally { setSaving(false); }
  };

  return (
    <PremiumModal open={!!item} onClose={onClose} title={item.name} icon={Gift} maxWidth="max-w-md" testid="item-action-modal">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-xl border-2 ${tok.border} flex items-center justify-center`} style={{ boxShadow: `0 0 12px ${tok.glow}` }}>
            <I className="w-7 h-7" style={{ color: tok.color }} />
          </div>
          <div>
            <div className="font-display font-bold text-white">{item.name}</div>
            <div className={`text-[10px] uppercase tracking-widest font-bold ${tok.text}`}>{tok.fr} · x{maxQty}</div>
          </div>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed border border-cyan-500/15 bg-cyan-500/5 rounded-lg px-3 py-2">
          {relicUsageInfo(item)}
        </p>

        {mode === "menu" && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button type="button" onClick={() => setMode("gift")} data-testid="action-gift"
              className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-center transition-colors">
              <Gift className="w-6 h-6 mx-auto mb-2 text-emerald-300" />
              <div className="text-sm font-bold text-emerald-200">{t("inventory.trade.gift_btn")}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{t("inventory.gift.free")}</div>
            </button>
            <button type="button" onClick={() => setMode("trade")} data-testid="action-trade"
              className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 text-center transition-colors">
              <ArrowLeftRight className="w-6 h-6 mx-auto mb-2 text-amber-300" />
              <div className="text-sm font-bold text-amber-200">{t("inventory.trade.exchange")}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{t("inventory.trade.against")}</div>
            </button>
          </div>
        )}

        {(mode === "gift" || mode === "trade") && (
          <form onSubmit={mode === "gift" ? gift : proposeTrade} className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1 block">{t("inventory.send.recipient")}</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3}
                placeholder={t("inventory.send.username_ph")}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm" data-testid="action-username" />
            </div>
            {maxQty > 1 && (
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1 block">{t("inventory.quantity")}</label>
                <input type="number" min={1} max={maxQty} value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(maxQty, parseInt(e.target.value, 10) || 1)))}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono-stat" />
              </div>
            )}
            {mode === "trade" && (
              <>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1 block">{t("inventory.trades.ecus_add")}</label>
                  <input type="number" min={0} value={tradeEcus} onChange={(e) => setTradeEcus(e.target.value)}
                    placeholder="0"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono-stat" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1 block">{t("inventory.trades.note_label")}</label>
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200}
                    placeholder={t("inventory.trade.offer_ph")}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                </div>
                <p className="text-[10px] text-zinc-500 italic">
                  {t("inventory.trade.reserve_note")}
                </p>
              </>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode("menu")} className="px-3 py-2 text-sm text-zinc-400">{t("inventory.return")}</button>
              <PremiumButton type="submit" variant={mode === "gift" ? "cyan" : "gold"} size="md" disabled={saving} className="flex-1"
                testid={mode === "gift" ? "confirm-gift" : "confirm-trade"}>
                {saving ? t("common.loading") : mode === "gift" ? t("inventory.trade.gift_btn") : t("inventory.trade.propose_btn")}
              </PremiumButton>
            </div>
          </form>
        )}
      </div>
    </PremiumModal>
  );
}

/* ─── Modal : mes échanges (entrants / sortants) ───────────── */
function TradesModal({ open, onClose, trades, relics, onDone }) {
  const { t } = useI18n();
  const [accepting, setAccepting] = useState(null); // trade being countered
  const [counterEcus, setCounterEcus] = useState("");
  const [counterSel, setCounterSel] = useState({}); // item_id -> qty
  const [busy, setBusy] = useState(false);

  const resetCounter = () => { setAccepting(null); setCounterEcus(""); setCounterSel({}); };

  const decline = async (id) => {
    setBusy(true);
    try { await api.post(`/economy/trades/${id}/decline`); toast.info(t("inventory.trade.declined")); await onDone(); }
    catch (e) { toast.error(e.response?.data?.detail || t("common.error")); }
    finally { setBusy(false); }
  };
  const cancel = async (id) => {
    setBusy(true);
    try { await api.post(`/economy/trades/${id}/cancel`); toast.info(t("inventory.trade.cancelled")); await onDone(); }
    catch (e) { toast.error(e.response?.data?.detail || t("common.error")); }
    finally { setBusy(false); }
  };
  const accept = async (id) => {
    setBusy(true);
    try {
      const counter_items = Object.entries(counterSel)
        .filter(([, q]) => q > 0)
        .map(([item_id, quantity]) => ({ item_id, quantity }));
      await api.post(`/economy/trades/${id}/accept`, { counter_items, counter_ecus: parseInt(counterEcus, 10) || 0 });
      sfx.success();
      toast.success(t("inventory.trades.accept_success"));
      resetCounter();
      await onDone();        // recharge l'inventaire/écus immédiatement
      onClose();             // referme le panneau pour révéler l'inventaire à jour
    } catch (e) { toast.error(e.response?.data?.detail || t("common.error")); }
    finally { setBusy(false); }
  };

  const timeLeft = (iso) => {
    if (!iso) return null;
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return t("inventory.trades.expired");
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const renderGoods = (trade) => (
    <div className="text-xs text-zinc-300 space-y-0.5">
      {trade.give_ecus > 0 && <div className="text-amber-300 font-mono-stat">+ {trade.give_ecus} Écus</div>}
      {(trade.give_items || []).map((it, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Gem className="w-3 h-3 text-violet-300" /> {it.name} {it.quantity > 1 ? `×${it.quantity}` : ""}
        </div>
      ))}
      {trade.note && <div className="text-[11px] text-zinc-500 italic mt-1">« {trade.note} »</div>}
      {trade.expires_at && (
        <div className="text-[10px] text-amber-400/80 font-mono-stat mt-1 flex items-center gap-1">
          <Lucide.Clock className="w-2.5 h-2.5" /> {t("inventory.trades.expires_in", { time: timeLeft(trade.expires_at) })}
        </div>
      )}
    </div>
  );

  return (
    <PremiumModal open={open} onClose={() => { resetCounter(); onClose(); }} title={t("inventory.trades")} icon={ArrowLeftRight} maxWidth="max-w-2xl" testid="trades-modal">
      <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Incoming */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-amber-300 font-bold mb-2">{t("inventory.trades.incoming", { count: trades.incoming?.length || 0 })}</div>
          {(!trades.incoming || trades.incoming.length === 0) && (
            <div className="text-sm text-zinc-500 italic py-3">{t("inventory.trades.none_incoming")}</div>
          )}
          <div className="space-y-3">
            {(trades.incoming || []).map((trade) => (
              <div key={trade.trade_id} className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3" data-testid={`trade-in-${trade.trade_id}`}>
                <div className="text-sm font-bold text-white mb-1">{t("inventory.trades.proposes", { username: trade.from_username })}</div>
                {renderGoods(trade)}
                {accepting === trade.trade_id ? (
                  <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
                    <div className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold">{t("inventory.trades.counterparty")}</div>
                    <input type="number" min={0} value={counterEcus} onChange={(e) => setCounterEcus(e.target.value)}
                      placeholder={t("inventory.trades.ecus_optional")}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono-stat" />
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                      {relics.length === 0 && <div className="text-xs text-zinc-500 italic">{t("inventory.trades.no_relics")}</div>}
                      {relics.map((r) => {
                        const rid = r.item_id || r.inv_id;
                        const sel = counterSel[rid] || 0;
                        return (
                          <label key={rid} className="flex items-center gap-2 text-xs text-zinc-300 py-1">
                            <input type="checkbox" checked={sel > 0}
                              onChange={(e) => setCounterSel((s) => ({ ...s, [rid]: e.target.checked ? 1 : 0 }))} />
                            <span className="flex-1 truncate">{r.name} {r.quantity > 1 ? `(x${r.quantity})` : ""}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={resetCounter} className="px-3 py-1.5 text-sm text-zinc-400">{t("common.cancel")}</button>
                      <PremiumButton variant="gold" size="sm" disabled={busy} onClick={() => accept(trade.trade_id)} className="flex-1" testid={`confirm-accept-${trade.trade_id}`}>
                        <Check className="w-3.5 h-3.5 inline mr-1" /> {t("inventory.trades.conclude")}
                      </PremiumButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <PremiumButton variant="cyan" size="sm" onClick={() => { setAccepting(trade.trade_id); setCounterEcus(""); setCounterSel({}); }} testid={`accept-${trade.trade_id}`}>
                      {t("inventory.trades.respond")}
                    </PremiumButton>
                    <button type="button" onClick={() => decline(trade.trade_id)} disabled={busy}
                      className="px-3 py-1.5 rounded-md border border-red-500/40 text-red-300 text-sm font-bold hover:bg-red-500/10" data-testid={`decline-${trade.trade_id}`}>
                      <X className="w-3.5 h-3.5 inline mr-1" /> {t("inventory.trades.decline_btn")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Outgoing */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-violet-300 font-bold mb-2">{t("inventory.trades.outgoing", { count: trades.outgoing?.length || 0 })}</div>
          {(!trades.outgoing || trades.outgoing.length === 0) && (
            <div className="text-sm text-zinc-500 italic py-3">{t("inventory.trades.none_outgoing")}</div>
          )}
          <div className="space-y-3">
            {(trades.outgoing || []).map((trade) => (
              <div key={trade.trade_id} className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-3" data-testid={`trade-out-${trade.trade_id}`}>
                <div className="text-sm font-bold text-white mb-1">{t("inventory.trades.to_username", { username: trade.to_username })}</div>
                {renderGoods(trade)}
                <button type="button" onClick={() => cancel(trade.trade_id)} disabled={busy}
                  className="mt-3 px-3 py-1.5 rounded-md border border-red-500/40 text-red-300 text-sm font-bold hover:bg-red-500/10" data-testid={`cancel-${trade.trade_id}`}>
                  {t("inventory.trades.cancel_offer")}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PremiumModal>
  );
}


function ShopOwnedGrid({ tab, owned, shopItems, user, onEquipFrame, onEquipBanner, onEquipAura, onEquipMount }) {
  const { t, locale } = useI18n();
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
        <div className="italic">{t("inventory.empty_category")}</div>
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
          || tab === "auras" && user?.active_aura_sku === sku
          || tab === "mounts" && user?.active_mount === sku;
        return (
          <PremiumCard key={`${sku}-${i}`} tone="violet" className={`border-2 relative ${tok.border}`}
            style={{ boxShadow: `0 0 12px ${tok.glow}` }}
            testid={`inv-row-${tab}-${sku}`}>
            <InventoryInfoButton
              text={shopOwnedUsageInfo(tab, sku, meta)}
              testId={`inv-info-${tab}-${sku}`}
              className="top-2 left-2 z-10"
            />
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
                    {t("inventory.expires_on", { date: new Date(row.expires_at).toLocaleString(locale) })}
                  </div>
                )}
                {tab === "cosmetics" && (isFrame || isBanner) && (
                  <PremiumButton variant={equipped ? "cyan" : "ghost"} size="sm" className="mt-2"
                    onClick={() => (isFrame ? onEquipFrame : onEquipBanner)(sku)}>
                    {equipped ? t("inventory.equipped") : t("inventory.equip")}
                  </PremiumButton>
                )}
                {tab === "auras" && (
                  <PremiumButton variant={equipped ? "cyan" : "ghost"} size="sm" className="mt-2"
                    onClick={() => onEquipAura(sku)}>
                    {equipped ? t("inventory.aura_active") : t("inventory.equip_aura")}
                  </PremiumButton>
                )}
                {tab === "mounts" && (
                  <PremiumButton variant={equipped ? "cyan" : "ghost"} size="sm" className="mt-2"
                    onClick={() => onEquipMount(sku)}>
                    {equipped ? t("inventory.mount_active") : t("inventory.equip_mount")}
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
