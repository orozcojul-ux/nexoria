import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Coins, CreditCard, Sparkles, Loader2, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import { useI18n } from "@/contexts/I18nContext";
import { translateEcuPackLabel } from "@/lib/translate-game";
import { translateApiError } from "@/lib/i18n-api";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export default function BuyEcusSection() {
  const { refresh } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState({ enabled: false, packs: [], currency: "eur" });
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const loadPacks = useCallback(async () => {
    try {
      const r = await api.get("/shop/ecus/packs");
      setData(r.data || { enabled: false, packs: [] });
    } catch {
      setData({ enabled: false, packs: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPacks(); }, [loadPacks]);

  // Handle the redirect back from Stripe Checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state = params.get("ecus");
    const sessionId = params.get("session_id");
    if (!state) return;
    const clean = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("ecus");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname + url.search);
    };
    if (state === "cancel") {
      toast.info(t("shop.ecus.cancelled"));
      clean();
      return;
    }
    if (state === "success" && sessionId) {
      setConfirming(true);
      api.get(`/shop/ecus/confirm?session_id=${encodeURIComponent(sessionId)}`)
        .then(async (r) => {
          if (r.data?.credited) {
            sfx.success?.();
            toast.success(t("shop.ecus.success", { count: r.data.ecus }));
            await refresh();
          } else {
            toast.info(t("shop.ecus.pending"));
          }
        })
        .catch(() => toast.error(t("shop.ecus.confirmFailed")))
        .finally(() => { setConfirming(false); clean(); });
    }
  }, [refresh, t]);

  const buy = async (packId) => {
    setBuying(packId);
    try {
      const { data: res } = await api.post("/shop/ecus/checkout", { pack_id: packId });
      if (res?.url) {
        window.location.href = res.url;
      } else {
        toast.error(t("shop.ecus.linkUnavailable"));
      }
    } catch (e) {
      toast.error(translateApiError(t, e, "shop.ecus.paymentFailed"));
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="space-y-5" data-testid="buy-ecus-section">
      <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-purple-500/10 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-yellow-500/15 border border-yellow-400/40 flex items-center justify-center">
            <Coins className="w-6 h-6 text-yellow-300" />
          </div>
          <div>
            <h2 className="font-display font-black text-2xl text-yellow-100">{t("shop.ecus.title")}</h2>
            <p className="text-xs text-zinc-400">{t("shop.ecus.subtitle")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400 mt-3">
          <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-cyan-300" /> {t("shop.ecus.payMethods")}</span>
          <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> {t("shop.ecus.stripeSecure")}</span>
        </div>
      </div>

      {confirming && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 flex items-center gap-3 text-sm text-cyan-200">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("shop.ecus.confirming")}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : !data.enabled ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center" data-testid="ecus-disabled-notice">
          <Sparkles className="w-7 h-7 text-amber-300 mx-auto mb-2" />
          <div className="font-display font-bold text-amber-100 mb-1">{t("shop.ecus.soonTitle")}</div>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            {t("shop.ecus.soonBody")}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 opacity-60 pointer-events-none">
            {data.packs.map((p) => <PackCard key={p.id} pack={p} disabled />)}
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.packs.map((p) => (
            <PackCard
              key={p.id}
              pack={p}
              buying={buying === p.id}
              disabled={!!buying}
              onBuy={() => buy(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PackCard({ pack, onBuy, buying, disabled }) {
  const { t } = useI18n();
  const localized = translateEcuPackLabel(t, pack);
  const total = (pack.ecus || 0) + (pack.bonus || 0);
  const highlight = pack.best_value || pack.popular;
  return (
    <motion.div
      whileHover={disabled ? undefined : { y: -4 }}
      data-testid={`ecus-pack-${pack.id}`}
      className="relative rounded-2xl border p-5 flex flex-col items-center text-center overflow-hidden"
      style={{
        borderColor: highlight ? "rgba(251,191,36,0.6)" : "rgba(255,255,255,0.12)",
        background: highlight
          ? "linear-gradient(160deg, rgba(251,191,36,0.14), rgba(168,85,247,0.12))"
          : "rgba(255,255,255,0.03)",
        boxShadow: highlight ? "0 0 22px rgba(251,191,36,0.25)" : "none",
      }}
    >
      {pack.best_value && (
        <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/25 text-amber-100 border border-amber-300/50 flex items-center gap-0.5">
          <Star className="w-2.5 h-2.5" /> {t("shop.ecus.packBest")}
        </span>
      )}
      {pack.popular && !pack.best_value && (
        <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-100 border border-cyan-300/40">
          {t("shop.ecus.packPopular")}
        </span>
      )}

      <Coins className="w-8 h-8 text-yellow-300 mb-2" style={{ filter: "drop-shadow(0 0 6px rgba(251,191,36,0.7))" }} />
      <div className="font-mono-stat font-black text-2xl text-yellow-100">{total.toLocaleString("fr-FR")}</div>
      <div className="text-[10px] uppercase tracking-[0.25em] text-yellow-400/70 mb-1">{t("shop.ecus.unit")}</div>
      {pack.bonus > 0 && (
        <div className="text-[11px] text-emerald-300 font-bold mb-1">
          {t("shop.ecus.bonus", { count: pack.bonus.toLocaleString("fr-FR") })}
        </div>
      )}
      <div className="text-xs text-zinc-400 mb-4">{localized.label}</div>

      <button
        onClick={onBuy}
        disabled={disabled || buying}
        data-testid={`ecus-buy-${pack.id}`}
        className="mt-auto w-full px-3 py-2.5 rounded-lg font-display font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        style={{
          background: highlight
            ? "linear-gradient(135deg,#fbbf24,#a855f7)"
            : "linear-gradient(135deg,#7c3aed,#06b6d4)",
          color: "#0A0613",
        }}
      >
        {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        {EUR.format(pack.price_eur)}
      </button>
    </motion.div>
  );
}
