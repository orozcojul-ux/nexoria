import React, { useEffect, useState, useCallback } from "react";
import { Gem, Crown, Sparkles, Coins, Check, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import "./VipPassSection.css";

const PLAN_META = {
  VIP_NEXUS_7: { icon: Gem, accent: "#22D3EE", tagline: "Découverte", popular: false },
  VIP_NEXUS_30: { icon: Crown, accent: "#A855F7", tagline: "Le plus populaire", popular: true },
  VIP_NEXUS_90: { icon: Sparkles, accent: "#FBBF24", tagline: "Meilleure valeur", popular: false },
};

const PERKS = [
  "Badge VIP Nexus & titre « Ascendant du Nexus »",
  "Pseudo doré/violet + cadre & aura premium",
  "+10% XP & +10% écus en permanence",
  "Coffre quotidien bonus",
  "🛒 Boutique de l'Ascendant : objets inédits réservés (cosmétiques divins, montures, coffres garantis Légendaire+, consommables exclusifs…)",
  "🎁 Bonus de parrainage VIP : +150 écus & +300 XP à chaque filleul",
  "📜 Quêtes VIP exclusives aux récompenses renforcées",
  "Rôle Discord VIP",
];

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return null;
  }
}

export default function VipPassSection() {
  const { user, refresh } = useAuth();
  const [status, setStatus] = useState(null);
  const [plans, setPlans] = useState([]);
  const [buying, setBuying] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/vip/status");
      setStatus(data);
      setPlans(data.plans || []);
    } catch {
      try {
        const { data } = await api.get("/shop/vip-plans");
        setPlans(data.plans || []);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const purchase = async (planId) => {
    if (buying) return;
    setBuying(planId);
    try {
      const { data } = await api.post("/vip/purchase", { plan: planId });
      (sfx.fanfare || sfx.levelUp || sfx.success)?.();
      toast.success(data.message || "Pass Ascendant activé !");
      await load();
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Échec de l'achat du Pass");
    } finally {
      setBuying(null);
    }
  };

  const balance = status?.remaining_eclats ?? user?.aether ?? 0;
  const vipActive = status?.is_vip;
  const vipUntil = formatDate(status?.vip_until);

  return (
    <section className="vip-pass" data-testid="vip-pass-section">
      <div className="vip-pass__header">
        <div className="vip-pass__title-wrap">
          <ShieldCheck className="vip-pass__crest" />
          <div>
            <h2 className="vip-pass__title">Pass Ascendant</h2>
            <p className="vip-pass__subtitle">Statut VIP premium du Nexus — payable en écus</p>
          </div>
        </div>
        <div className="vip-pass__balance">
          <Coins className="w-4 h-4 text-yellow-300" />
          <span className="vip-pass__balance-value" data-testid="vip-balance">{balance}</span>
          <span className="vip-pass__balance-unit">écus</span>
        </div>
      </div>

      {vipActive && (
        <div className="vip-pass__active-banner" data-testid="vip-active-banner">
          <Gem className="w-4 h-4" />
          <span>Pass ascendant actif{vipUntil ? ` jusqu'au ${vipUntil}` : ""}.</span>
        </div>
      )}

      <div className="vip-pass__grid">
        {plans.map((plan) => {
          const meta = PLAN_META[plan.id] || PLAN_META.VIP_NEXUS_7;
          const Icon = meta.icon;
          const canAfford = balance >= plan.price;
          const isBuying = buying === plan.id;
          return (
            <div
              key={plan.id}
              className={`vip-card ${meta.popular ? "vip-card--popular" : ""}`}
              style={{ "--vip-accent": meta.accent }}
              data-testid={`vip-plan-${plan.id}`}
            >
              {meta.popular && <div className="vip-card__ribbon">{meta.tagline}</div>}
              <div className="vip-card__glow" aria-hidden />
              <div className="vip-card__icon">
                <Icon className="w-8 h-8" />
              </div>
              <div className="vip-card__days">{plan.label}</div>
              <div className="vip-card__name">{plan.name}</div>
              <div className="vip-card__price">
                <Coins className="w-4 h-4" />
                <span>{plan.price}</span>
                <span className="vip-card__price-unit">écus</span>
              </div>

              <ul className="vip-card__perks">
                {PERKS.map((p) => (
                  <li key={p}><Check className="w-3 h-3" /> {p}</li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => purchase(plan.id)}
                disabled={!canAfford || isBuying}
                className="vip-card__btn"
                data-testid={`vip-buy-${plan.id}`}
              >
                {isBuying ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Activation…</>
                ) : !canAfford ? (
                  "Écus insuffisants"
                ) : (
                  <>Acheter avec mes écus</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
