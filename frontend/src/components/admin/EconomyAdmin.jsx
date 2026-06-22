import React, { useCallback, useEffect, useState } from "react";
import { Coins, TrendingUp, TrendingDown, AlertTriangle, Search, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { PremiumCard, PremiumStat, PremiumButton } from "@/components/ui-premium";
import HeroName from "@/components/HeroName";

const SURFACE = "relative rounded-xl border border-white/10 bg-gradient-to-br from-[#0F0820]/80 via-[#0A0613]/80 to-[#1A0B3D]/80 backdrop-blur";

const SOURCE_LABELS = {
  quest: "Quête",
  wheel: "Roue du Nexus",
  craft: "Forge",
  arena: "Arène",
  combat: "Combat",
  shop: "Boutique",
  admin: "Admin",
  event: "Événement",
  daily_chest: "Coffre quotidien",
  p2p: "Joueur à joueur",
  trade: "Échange",
  guild: "Guilde",
  referral: "Parrainage",
  stripe: "Achat réel",
  kingdom: "Royaume",
  rift: "Faille",
  season: "Saison",
  unknown: "Inconnu",
};

function fmt(n) {
  return Number(n || 0).toLocaleString("fr-FR");
}

function EcusBadge({ amount, className = "" }) {
  const n = Number(amount || 0);
  const positive = n >= 0;
  return (
    <span className={`font-mono-stat font-bold ${positive ? "text-emerald-400" : "text-red-400"} ${className}`}>
      {positive ? "+" : ""}{fmt(n)} ✦
    </span>
  );
}

function DataTable({ columns, rows, empty = "Aucune donnée disponible" }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-[0.25em] text-zinc-500 border-b border-white/5">
            {columns.map((c) => (
              <th key={c.key} className="p-2.5 font-display">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="p-4 text-center text-zinc-500 italic text-sm">{empty}</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={row.id || row.user_id || row.transaction_id || i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
              {columns.map((c) => (
                <td key={c.key} className="p-2.5 align-middle">{c.render ? c.render(row, i) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EconomyAdmin() {
  const [, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [richest, setRichest] = useState([]);
  const [items, setItems] = useState(null);
  const [tx, setTx] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [txFilters, setTxFilters] = useState({ username: "", type: "", source: "", page: 1 });

  const [userSearch, setUserSearch] = useState("");
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState(100);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r, i, t] = await Promise.all([
        api.get("/admin/economy/summary"),
        api.get("/admin/economy/top-richest"),
        api.get("/admin/economy/items-summary"),
        api.get("/admin/economy/transactions", {
          params: {
            page: txFilters.page,
            limit: 40,
            username: txFilters.username || undefined,
            type: txFilters.type || undefined,
            source: txFilters.source || undefined,
          },
        }),
      ]);
      setSummary(s.data);
      setRichest(r.data?.items || []);
      setItems(i.data);
      setTx(t.data || { items: [], total: 0, page: 1, pages: 1 });
    } catch (err) {
      toast.error(formatApiError(err) || "Impossible de charger l'économie");
    } finally {
      setLoading(false);
    }
  }, [txFilters.page, txFilters.username, txFilters.type, txFilters.source]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openUserAdmin = (username) => {
    setSearchParams({ tab: "users", q: username });
  };

  const submitAdjust = async (e) => {
    e.preventDefault();
    if (!adjustTarget) return toast.error("Sélectionnez un héros");
    if (!adjustReason.trim() || adjustReason.trim().length < 3) return toast.error("Raison obligatoire (3 caractères min.)");
    const amount = Number(adjustAmount);
    if (!Number.isFinite(amount) || amount === 0) return toast.error("Montant invalide");
    const label = amount > 0 ? `ajouter ${amount}` : `retirer ${Math.abs(amount)}`;
    if (!window.confirm(`Confirmer : ${label} Écus à ${adjustTarget.username} ?\nRaison : ${adjustReason.trim()}`)) return;

    setAdjusting(true);
    try {
      const { data } = await api.post("/admin/economy/adjust-ecus", {
        user_id: adjustTarget.user_id,
        amount,
        reason: adjustReason.trim(),
      });
      toast.success(`Ajustement effectué — nouveau solde : ${fmt(data.balance_after)} ✦`);
      setAdjustReason("");
      setAdjustAmount(100);
      setAdjustTarget(null);
      setUserSearch("");
      await loadAll();
    } catch (err) {
      toast.error(formatApiError(err) || "Échec de l'ajustement");
    } finally {
      setAdjusting(false);
    }
  };

  const filteredAdjustUsers = richest.filter((u) =>
    !userSearch || u.username?.toLowerCase().includes(userSearch.toLowerCase())
  ).slice(0, 12);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Chargement de l'économie…
      </div>
    );
  }

  const s = summary || {};

  return (
    <div className="space-y-6" data-testid="economy-admin">
      <div>
        <h2 className="font-display font-bold text-2xl text-gradient-gold flex items-center gap-2">
          <Coins className="w-6 h-6 text-amber-400" /> Gestion économie
        </h2>
        <p className="text-xs text-zinc-500 mt-1 italic">
          Surveillance des Écus, transactions, objets et ajustements administratifs — réservé aux Archontes.
        </p>
      </div>

      {/* Alertes */}
      {(s.alerts || []).length > 0 && (
        <PremiumCard tone="gold" className="p-4 border-amber-500/25" testid="economy-alerts">
          <div className="flex items-center gap-2 mb-3 text-amber-300 text-xs uppercase tracking-[0.25em] font-bold">
            <AlertTriangle className="w-4 h-4" /> Alertes économie
          </div>
          <ul className="space-y-2">
            {s.alerts.map((a) => (
              <li key={a.code} className="text-sm text-zinc-300 flex items-start gap-2">
                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${a.level === "warning" ? "bg-red-400" : "bg-cyan-400"}`} />
                {a.message}
              </li>
            ))}
          </ul>
        </PremiumCard>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PremiumStat label="Écus en circulation" value={`${fmt(s.total_ecus_in_circulation)} ✦`} tone="gold" />
        <PremiumStat label="Créés aujourd'hui" value={`+${fmt(s.ecus_created_today)} ✦`} tone="emerald" icon={TrendingUp} />
        <PremiumStat label="Dépensés aujourd'hui" value={`-${fmt(s.ecus_spent_today)} ✦`} tone="red" icon={TrendingDown} />
        <PremiumStat label="Solde moyen / médian" value={`${fmt(s.average_balance)} / ${fmt(s.median_balance)} ✦`} tone="cyan" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          ["Transactions", s.total_transactions_today],
          ["Crafts", s.crafts_today],
          ["Roue", s.wheel_spins_today],
          ["Quêtes", s.quest_rewards_today],
          ["Combat", s.combat_rewards_today],
          ["Objets créés", s.items_created_today],
        ].map(([label, val]) => (
          <div key={label} className={`${SURFACE} p-3 text-center`}>
            <div className="text-[9px] uppercase tracking-widest text-zinc-500">{label}</div>
            <div className="font-mono-stat text-lg text-white mt-1">{fmt(val)}</div>
          </div>
        ))}
      </div>

      {/* Top joueurs + sources */}
      <div className="grid lg:grid-cols-2 gap-4">
        <PremiumCard className="p-4" testid="economy-top-richest">
          <h3 className="font-display font-bold text-sm mb-3 text-violet-200">Top 20 — plus riches</h3>
          <DataTable
            empty="Aucun joueur"
            rows={richest}
            columns={[
              { key: "rank", label: "#", render: (_r, i) => i + 1 },
              { key: "username", label: "Héros", render: (r) => <HeroName user={r} size="sm" /> },
              { key: "ecus", label: "Écus", render: (r) => <span className="text-amber-300 font-mono-stat">{fmt(r.ecus)} ✦</span> },
              { key: "level", label: "Niv.", render: (r) => r.level ?? "—" },
              {
                key: "actions",
                label: "",
                render: (r) => (
                  <button type="button" onClick={() => openUserAdmin(r.username)} className="text-zinc-500 hover:text-violet-300" title="Voir dans admin joueurs">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                ),
              },
            ]}
          />
        </PremiumCard>

        <PremiumCard className="p-4" testid="economy-sources">
          <h3 className="font-display font-bold text-sm mb-3 text-violet-200">Sources du jour</h3>
          <DataTable
            empty="Aucune transaction aujourd'hui"
            rows={s.by_source || []}
            columns={[
              { key: "source", label: "Source", render: (r) => SOURCE_LABELS[r.source] || r.source },
              { key: "count", label: "Ops", render: (r) => fmt(r.count) },
              { key: "volume", label: "Volume", render: (r) => `${fmt(r.volume)} ✦` },
            ]}
          />
          <h3 className="font-display font-bold text-sm mt-5 mb-3 text-violet-200">Top gains / dépenses (jour)</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-emerald-400/80 uppercase tracking-widest mb-1">Gains</div>
              {(s.top_gains_today || []).slice(0, 5).map((r) => (
                <div key={r.user_id} className="flex justify-between py-0.5 border-b border-white/5">
                  <span>{r.username}</span>
                  <span className="text-emerald-400 font-mono-stat">+{fmt(r.ecus)}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-red-400/80 uppercase tracking-widest mb-1">Dépenses</div>
              {(s.top_spends_today || []).slice(0, 5).map((r) => (
                <div key={r.user_id} className="flex justify-between py-0.5 border-b border-white/5">
                  <span>{r.username}</span>
                  <span className="text-red-400 font-mono-stat">-{fmt(r.ecus)}</span>
                </div>
              ))}
            </div>
          </div>
        </PremiumCard>
      </div>

      {/* Transactions */}
      <PremiumCard className="p-4" testid="economy-transactions">
        <h3 className="font-display font-bold text-sm mb-3 text-violet-200">Journal des transactions</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            value={txFilters.username}
            onChange={(e) => setTxFilters((f) => ({ ...f, username: e.target.value, page: 1 }))}
            placeholder="Pseudo…"
            className="bg-[#0A0A0E] border border-white/10 rounded px-2 py-1.5 text-xs w-36"
          />
          <select
            value={txFilters.type}
            onChange={(e) => setTxFilters((f) => ({ ...f, type: e.target.value, page: 1 }))}
            className="bg-[#0A0A0E] border border-white/10 rounded px-2 py-1.5 text-xs"
          >
            <option value="">Tous types</option>
            <option value="gain">Gain</option>
            <option value="spend">Dépense</option>
            <option value="admin_adjustment">Admin</option>
            <option value="refund">Remboursement</option>
          </select>
          <select
            value={txFilters.source}
            onChange={(e) => setTxFilters((f) => ({ ...f, source: e.target.value, page: 1 }))}
            className="bg-[#0A0A0E] border border-white/10 rounded px-2 py-1.5 text-xs"
          >
            <option value="">Toutes sources</option>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <PremiumButton size="sm" onClick={loadAll}>Filtrer</PremiumButton>
        </div>
        <DataTable
          rows={tx.items || []}
          empty="Aucune transaction — les nouvelles opérations apparaîtront ici."
          columns={[
            {
              key: "created_at",
              label: "Date",
              render: (r) => r.created_at ? new Date(r.created_at).toLocaleString("fr-FR") : "—",
            },
            { key: "username", label: "Héros", render: (r) => r.username },
            {
              key: "type",
              label: "Type",
              render: (r) => (
                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${
                  r.amount >= 0 ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-400"
                }`}>{r.type}</span>
              ),
            },
            { key: "source", label: "Source", render: (r) => SOURCE_LABELS[r.source] || r.source },
            { key: "amount", label: "Montant", render: (r) => <EcusBadge amount={r.amount} /> },
            { key: "reason", label: "Raison", render: (r) => <span className="text-zinc-400 text-xs truncate max-w-[200px] block">{r.reason || "—"}</span> },
          ]}
        />
        {tx.pages > 1 && (
          <div className="flex justify-center gap-2 mt-3">
            <PremiumButton size="sm" disabled={tx.page <= 1} onClick={() => setTxFilters((f) => ({ ...f, page: f.page - 1 }))}>Préc.</PremiumButton>
            <span className="text-xs text-zinc-500 self-center">Page {tx.page} / {tx.pages}</span>
            <PremiumButton size="sm" disabled={tx.page >= tx.pages} onClick={() => setTxFilters((f) => ({ ...f, page: f.page + 1 }))}>Suiv.</PremiumButton>
          </div>
        )}
      </PremiumCard>

      {/* Objets & ressources */}
      <div className="grid lg:grid-cols-2 gap-4">
        <PremiumCard className="p-4">
          <h3 className="font-display font-bold text-sm mb-3">Objets les plus possédés</h3>
          <DataTable
            rows={items?.most_owned_items || []}
            columns={[
              { key: "name", label: "Objet" },
              { key: "rarity", label: "Rareté" },
              { key: "total_qty", label: "Quantité", render: (r) => fmt(r.total_qty) },
              { key: "owner_count", label: "Joueurs", render: (r) => fmt(r.owner_count) },
            ]}
          />
        </PremiumCard>
        <PremiumCard className="p-4">
          <h3 className="font-display font-bold text-sm mb-3">Crafts & Roue (historique global)</h3>
          <div className="text-[10px] uppercase text-zinc-500 mb-1">Crafts populaires</div>
          {(items?.top_crafts || []).slice(0, 6).map((r) => (
            <div key={r.recipe_id} className="flex justify-between text-sm py-1 border-b border-white/5">
              <span>{r.name || r.recipe_id}</span>
              <span className="font-mono-stat text-zinc-400">{fmt(r.count)}</span>
            </div>
          ))}
          <div className="text-[10px] uppercase text-zinc-500 mt-4 mb-1">Récompenses Roue</div>
          {(items?.top_wheel_rewards || []).slice(0, 6).map((r) => (
            <div key={r.reward_id} className="flex justify-between text-sm py-1 border-b border-white/5">
              <span>{r.label || r.reward_id}</span>
              <span className="font-mono-stat text-zinc-400">{fmt(r.count)}</span>
            </div>
          ))}
        </PremiumCard>
      </div>

      {/* Ajustement admin */}
      <PremiumCard tone="violet" className="p-5" testid="economy-adjust">
        <h3 className="font-display font-bold text-lg mb-1">Ajustement Écus (admin)</h3>
        <p className="text-xs text-zinc-500 mb-4">Montant positif = ajout · négatif = retrait · raison obligatoire · action journalisée.</p>
        <form onSubmit={submitAdjust} className="space-y-3 max-w-xl">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Rechercher un héros</label>
            <div className="relative mt-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setAdjustTarget(null); }}
                className="w-full pl-9 bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm"
                placeholder="Pseudo…"
                data-testid="economy-adjust-search"
              />
            </div>
            {adjustTarget && (
              <div className="mt-2 text-sm text-amber-200">
                Cible : <HeroName user={adjustTarget} size="sm" /> — {fmt(adjustTarget.ecus)} ✦
              </div>
            )}
            {userSearch && !adjustTarget && (
              <div className="mt-1 border border-white/5 rounded max-h-32 overflow-y-auto">
                {filteredAdjustUsers.map((u) => (
                  <button
                    key={u.user_id}
                    type="button"
                    onClick={() => { setAdjustTarget(u); setUserSearch(u.username); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-white/[0.04] text-sm flex justify-between"
                  >
                    <HeroName user={u} size="sm" />
                    <span className="text-amber-300 font-mono-stat text-xs">{fmt(u.ecus)} ✦</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Montant (+ / −)</label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="w-full mt-1 bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm font-mono-stat"
                data-testid="economy-adjust-amount"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Raison *</label>
              <input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                required
                minLength={3}
                className="w-full mt-1 bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm"
                placeholder="Compensation bug, événement…"
                data-testid="economy-adjust-reason"
              />
            </div>
          </div>
          <PremiumButton type="submit" disabled={adjusting} testid="economy-adjust-submit">
            {adjusting ? "Application…" : "Appliquer l'ajustement"}
          </PremiumButton>
        </form>
      </PremiumCard>
    </div>
  );
}
