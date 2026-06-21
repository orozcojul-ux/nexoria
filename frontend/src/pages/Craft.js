import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Lucide from "lucide-react";
import {
  Hammer, Coins, Sparkles, Package, History, Filter, Check, X, Loader2,
  Info, ChevronDown, BookOpen, Target, AlertTriangle, Trophy, Award, Gift,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import { useInventorySync } from "@/hooks/useInventorySync";
import { useProfileSync } from "@/hooks/useProfileSync";
import { RARITY } from "@/lib/design-tokens";
import { PremiumButton, PremiumCard, PageShell, PremiumModal } from "@/components/ui-premium";
import { usePageBanner } from "@/lib/page-banners";
import { CRAFT_GUIDE } from "@/lib/itemUsageHelp";
import "@/pages/craft.css";

const CATEGORIES = [
  { id: "all", label: "Toutes" },
  { id: "weapon", label: "Armes" },
  { id: "accessory", label: "Accessoires" },
  { id: "consumable", label: "Consommables" },
];

const RARITIES = [
  { id: "all", label: "Toutes" },
  { id: "rare", label: "Rare" },
  { id: "epic", label: "Épique" },
  { id: "legendary", label: "Légendaire" },
];

const METRIC_LABELS = {
  attempts: "tentatives",
  successes: "réussites",
  legendary_successes: "forges légendaires",
};

const MILESTONE_ICONS = {
  aether: Coins,
  xp: Sparkles,
  badge: Award,
  multi: Trophy,
};

export default function Craft() {
  const { user, refresh } = useAuth();
  const [resources, setResources] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [history, setHistory] = useState([]);
  const [ecus, setEcus] = useState(0);
  const [catFilter, setCatFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [craftingId, setCraftingId] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [guideOpen, setGuideOpen] = useState(true);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [progress, setProgress] = useState(null);

  const banner = usePageBanner("craft");

  const load = useCallback(async () => {
    const [resA, resB, resC, resD] = await Promise.all([
      api.get("/craft/resources"),
      api.get("/craft/recipes"),
      api.get("/craft/history"),
      api.get("/craft/progress"),
    ]);
    setResources(resA.data.resources || []);
    setEcus(resA.data.ecus ?? user?.aether ?? 0);
    setRecipes(resB.data.recipes || []);
    setHistory(resC.data.history || []);
    setProgress(resD.data || null);
  }, [user?.aether]);

  useEffect(() => { load(); }, [load]);

  useInventorySync(useCallback(() => { load(); refresh(); }, [load, refresh]));
  useProfileSync(useCallback(() => { load(); refresh(); }, [load, refresh]));

  const ownedMap = useMemo(
    () => Object.fromEntries(resources.map((r) => [r.id, r.quantity])),
    [resources],
  );

  const filtered = useMemo(() => recipes.filter((r) => {
    if (catFilter !== "all" && r.category !== catFilter) return false;
    if (rarityFilter !== "all" && r.rarity !== rarityFilter) return false;
    return true;
  }), [recipes, catFilter, rarityFilter]);

  const forge = async (recipe) => {
    if (craftingId) return;
    setCraftingId(recipe.id);
    setLastResult(null);
    try {
      const { data } = await api.post("/craft/craft", { recipeId: recipe.id });
      setLastResult(data);
      setResources(data.resources || []);
      setEcus(data.ecus ?? ecus);
      if (data.progress) setProgress(data.progress);
      if (data.success) {
        sfx.success();
        toast.success(`Forge réussie — « ${data.resultItem?.name || recipe.name} » créé !`);
      } else {
        sfx.error?.() || sfx.click?.();
        toast.error(`Échec de forge — ${data.compensation?.name || "Poussière cosmique"} ×${data.compensation?.quantity || 2} en compensation`);
      }
      await load();
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Forge impossible");
    } finally {
      setCraftingId(null);
    }
  };

  return (
    <PageShell wide testid="craft-page" banner={banner}>
      {/* Ressources + Écus */}
      <div className="forge-resources-bar mb-6" data-testid="craft-resources-bar">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-2 text-amber-200 font-display font-bold">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-mono-stat">{ecus.toLocaleString("fr-FR")}</span>
            <span className="text-xs text-zinc-500 font-normal">Écus</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {resources.map((r) => {
            const I = Lucide[r.icon] || Lucide.Package;
            return (
              <div key={r.id} className="forge-resource-pill" data-testid={`resource-${r.id}`}>
                <I className="w-4 h-4 shrink-0" style={{ color: r.color || "#38E8FF" }} />
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-400 truncate">{r.name}</div>
                  <div className="font-mono-stat text-sm font-bold text-white">×{r.quantity}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CraftProgressPanel progress={progress} />

      {/* Rubrique — Comment fonctionne la Forge */}
      <CraftGuideRubrique
        open={guideOpen}
        onToggle={() => setGuideOpen((v) => !v)}
        onOpenFull={() => setGuideModalOpen(true)}
      />

      <CraftGuideModal open={guideModalOpen} onClose={() => setGuideModalOpen(false)} />

      {/* Résultat dernière forge */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`forge-result-banner mb-6 ${lastResult.success ? "forge-result-banner--ok" : "forge-result-banner--fail"}`}
            data-testid="craft-last-result"
          >
            {lastResult.success ? (
              <>
                <Check className="w-5 h-5" />
                <span>Succès — <strong>{lastResult.resultItem?.name}</strong> ajouté à votre inventaire.</span>
              </>
            ) : (
              <>
                <X className="w-5 h-5" />
                <span>
                  Échec — ressources consommées. Compensation :
                  {" "}<strong>{lastResult.compensation?.name || "Poussière cosmique"} ×{lastResult.compensation?.quantity || 2}</strong>
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtres */}
      <div className="flex flex-wrap gap-4 mb-6 items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-widest">
          <Filter className="w-3.5 h-3.5" /> Catégorie
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCatFilter(c.id)}
              className={`forge-filter-btn ${catFilter === c.id ? "forge-filter-btn--active" : ""}`}
              data-testid={`craft-cat-${c.id}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 ml-0 sm:ml-4">
          {RARITIES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRarityFilter(r.id)}
              className={`forge-filter-btn ${rarityFilter === r.id ? "forge-filter-btn--active" : ""}`}
              data-testid={`craft-rarity-${r.id}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recettes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10" data-testid="craft-recipes-grid">
        {filtered.length === 0 && (
          <PremiumCard tone="violet" className="col-span-full p-10 text-center text-zinc-500 italic">
            Aucune recette pour ces filtres.
          </PremiumCard>
        )}
        {filtered.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            ownedMap={ownedMap}
            ecus={ecus}
            crafting={craftingId === recipe.id}
            onForge={() => forge(recipe)}
          />
        ))}
      </div>

      {/* Historique */}
      <section data-testid="craft-history">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-violet-300" />
          <h2 className="text-sm font-display font-bold uppercase tracking-[0.2em] text-violet-200">
            Forge récente
          </h2>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">Aucun craft pour le moment.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {history.map((h) => (
              <div key={h.craft_id} className="forge-history-row" data-testid={`craft-hist-${h.craft_id}`}>
                <span className={h.success ? "text-emerald-400" : "text-red-400"}>
                  {h.success ? "✓" : "✗"}
                </span>
                <span className="font-bold text-white">{h.recipe_name}</span>
                <span className="text-zinc-500 text-xs">
                  {h.created_at ? new Date(h.created_at).toLocaleString("fr-FR") : ""}
                </span>
                <span className="text-amber-300/80 text-xs font-mono-stat ml-auto">-{h.cost_ecus} ✦</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function RecipeCard({ recipe, ownedMap, ecus, crafting, onForge }) {
  const tok = RARITY[recipe.rarity] || RARITY.common;
  const result = recipe.resultItem || {};
  const I = Lucide[result.icon] || Lucide[recipe.category === "weapon" ? "Sword" : "Gem"];
  const ratePct = Math.round((recipe.successRate || 1) * 100);
  const canCraft = recipe.canCraft && !recipe.insufficientEcus;
  const disabled = !canCraft || crafting;

  return (
    <PremiumCard
      tone="violet"
      className={`forge-recipe-card border-2 ${tok.border} relative overflow-hidden`}
      style={{ boxShadow: `0 0 18px ${tok.glow}` }}
      testid={`craft-recipe-${recipe.id}`}
    >
      <div className="flex gap-4">
        <div
          className={`w-16 h-16 rounded-xl border ${tok.border} flex items-center justify-center shrink-0 bg-black/30`}
          style={{ boxShadow: `inset 0 0 12px ${tok.glow}` }}
        >
          <I className="w-8 h-8" style={{ color: tok.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-lg text-white">{recipe.name}</div>
          <div className={`text-[9px] uppercase tracking-[0.25em] font-bold ${tok.text}`}>{tok.fr}</div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{recipe.description}</p>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Ressources</div>
        {(recipe.requiredResourcesDetail || []).map((req) => {
          const owned = ownedMap[req.id] ?? 0;
          const need = req.required || 0;
          const ok = owned >= need;
          const Ri = Lucide[req.icon] || Lucide.Package;
          return (
            <div key={req.id} className={`forge-req-row ${ok ? "" : "forge-req-row--missing"}`}>
              <Ri className="w-3.5 h-3.5 shrink-0" style={{ color: req.color }} />
              <span className="flex-1 truncate text-xs">{req.name}</span>
              <span className={`font-mono-stat text-xs font-bold ${ok ? "text-emerald-300" : "text-red-400"}`}>
                {owned}/{need}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        <span className="text-amber-300 font-mono-stat font-bold flex items-center gap-1">
          <Coins className="w-3.5 h-3.5" /> {recipe.costEcus} Écus
        </span>
        <span className="text-cyan-300 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> {ratePct}% réussite
        </span>
        {recipe.insufficientEcus && (
          <span className="text-red-400">Écus insuffisants</span>
        )}
        {recipe.missingResources && !recipe.insufficientEcus && (
          <span className="text-red-400">Ressources manquantes</span>
        )}
      </div>

      <PremiumButton
        variant="gold"
        size="md"
        icon={crafting ? Loader2 : Hammer}
        className={`w-full mt-4 ${crafting ? "opacity-80 [&_svg]:animate-spin" : ""}`}
        disabled={disabled}
        onClick={onForge}
        testid={`craft-btn-${recipe.id}`}
      >
        {crafting ? "Forge en cours…" : "Forger"}
      </PremiumButton>
    </PremiumCard>
  );
}

function CraftProgressPanel({ progress }) {
  if (!progress) return null;

  const tier = progress.tier || { label: "Apprenti", color: "#9CA3AF" };
  const nextTier = progress.nextTier;
  const tp = progress.tierProgress || {};
  const milestones = progress.milestones || [];

  return (
    <PremiumCard className="forge-progress-card mb-6" testid="craft-progress-panel">
      <div className="flex flex-wrap items-start gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-12 h-12 rounded-xl border flex items-center justify-center shrink-0"
            style={{ borderColor: `${tier.color}66`, boxShadow: `0 0 16px ${tier.color}33` }}
          >
            <Hammer className="w-6 h-6" style={{ color: tier.color }} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold">Palier forge</div>
            <div className="font-display font-black text-xl text-white" style={{ color: tier.color }}>
              {tier.label}
            </div>
            {nextTier && (
              <div className="text-xs text-zinc-400 mt-0.5">
                Prochain : <span style={{ color: nextTier.color }}>{nextTier.label}</span>
                {" "}({progress.attempts ?? 0}/{nextTier.min} tentatives)
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 flex-1 justify-end">
          <StatPill label="Tentatives" value={progress.attempts ?? 0} />
          <StatPill label="Réussites" value={progress.successes ?? 0} accent="#34D399" />
          <StatPill label="Échecs" value={progress.failures ?? 0} accent="#F87171" />
        </div>
      </div>

      {nextTier && (
        <div className="forge-tier-bar mb-4" aria-hidden>
          <div className="forge-tier-bar-fill" style={{ width: `${tp.percent ?? 0}%`, background: tier.color }} />
        </div>
      )}

      <div className="flex items-center gap-2 mb-3 text-violet-200">
        <Trophy className="w-4 h-4 text-amber-300" />
        <h2 className="text-sm font-display font-bold uppercase tracking-wider">Paliers & récompenses</h2>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {milestones.map((m) => {
          const Icon = MILESTONE_ICONS[m.type] || Gift;
          const done = m.claimed;
          const ready = m.reached && !m.claimed;
          return (
            <div
              key={m.key}
              className={`forge-milestone-row ${done ? "forge-milestone-row--done" : ready ? "forge-milestone-row--ready" : ""}`}
              data-testid={`craft-milestone-${m.key}`}
            >
              <div className="forge-milestone-icon">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-display font-bold text-white">
                  {m.threshold} {METRIC_LABELS[m.metric] || m.metric}
                </div>
                <div className="text-[11px] text-zinc-400 truncate">{m.label}</div>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider shrink-0">
                {done ? (
                  <span className="text-emerald-300">Obtenu</span>
                ) : ready ? (
                  <span className="text-amber-300">Débloqué</span>
                ) : (
                  <span className="text-zinc-500">{m.progress}/{m.threshold}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PremiumCard>
  );
}

function StatPill({ label, value, accent = "#67E8F9" }) {
  return (
    <div className="forge-stat-pill">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="font-mono-stat font-bold text-lg" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function CraftGuideRubrique({ open, onToggle, onOpenFull }) {
  return (
    <section className="forge-guide-rubrique mb-6" data-testid="craft-guide-rubrique">
      <div className="forge-guide-rubrique-header">
        <button
          type="button"
          className="forge-guide-rubrique-title flex-1"
          onClick={onToggle}
          aria-expanded={open}
          data-testid="craft-guide-toggle"
        >
          <BookOpen className="w-4 h-4 text-cyan-300" />
          <span className="text-sm font-display font-bold uppercase tracking-[0.18em] text-cyan-200">
            Comment fonctionne la Forge ?
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenFull}
          className="forge-guide-info-btn"
          aria-label="Guide complet"
          data-testid="craft-guide-full-btn"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="forge-guide-chevron-btn"
          aria-label={open ? "Replier le guide" : "Déplier le guide"}
        >
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="forge-guide-rubrique-body">
              <p className="text-sm text-zinc-300 leading-relaxed mb-4">{CRAFT_GUIDE.intro}</p>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="forge-guide-subtitle">
                    <Target className="w-3.5 h-3.5" /> Étapes
                  </h3>
                  <ol className="forge-guide-list">
                    {CRAFT_GUIDE.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="forge-guide-subtitle">
                    <Sparkles className="w-3.5 h-3.5" /> Taux de réussite
                  </h3>
                  <div className="space-y-1.5 mb-4">
                    {CRAFT_GUIDE.successRates.map((row) => (
                      <div key={row.rarity} className="forge-guide-rate-row">
                        <span style={{ color: row.color }}>{row.rarity}</span>
                        <span className="font-mono-stat text-cyan-200">{row.rate}</span>
                      </div>
                    ))}
                  </div>
                  <div className="forge-guide-fail-box">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>
                      En cas d&apos;échec, ressources et Écus sont perdus. Compensation :
                      <strong> 2× Poussière cosmique</strong>.
                    </span>
                  </div>
                </div>
              </div>

              <h3 className="forge-guide-subtitle mb-2">Où obtenir les ressources</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {CRAFT_GUIDE.resources.map((r) => (
                  <div key={r.name} className="forge-guide-resource-row">
                    <span className="font-bold text-violet-200 text-xs">{r.name}</span>
                    <span className="text-[11px] text-zinc-400 leading-snug">{r.source}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function CraftGuideModal({ open, onClose }) {
  return (
    <PremiumModal
      open={open}
      onClose={onClose}
      title="Guide de la Forge du Nexus"
      icon={BookOpen}
      maxWidth="max-w-2xl"
      testid="craft-guide-modal"
    >
      <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto text-sm text-zinc-300">
        <p className="leading-relaxed">{CRAFT_GUIDE.intro}</p>

        <section>
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-cyan-300 font-bold mb-2">Étapes</h3>
          <ol className="space-y-1.5 list-decimal list-inside">
            {CRAFT_GUIDE.steps.map((s) => (
              <li key={s} className="leading-relaxed">{s}</li>
            ))}
          </ol>
        </section>

        <section>
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-amber-300 font-bold mb-2">Taux de réussite</h3>
          <div className="grid grid-cols-2 gap-2">
            {CRAFT_GUIDE.successRates.map((row) => (
              <div key={row.rarity} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 flex justify-between">
                <span style={{ color: row.color }}>{row.rarity}</span>
                <span className="font-mono-stat text-cyan-200">{row.rate}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-violet-300 font-bold mb-2">Sources de ressources</h3>
          <div className="space-y-2">
            {CRAFT_GUIDE.resources.map((r) => (
              <div key={r.name} className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2">
                <div className="font-bold text-violet-200 text-xs">{r.name}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">{r.source}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 font-bold mb-2">Bon à savoir</h3>
          <ul className="space-y-1.5 list-disc list-inside text-zinc-400">
            {CRAFT_GUIDE.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      </div>
    </PremiumModal>
  );
}
