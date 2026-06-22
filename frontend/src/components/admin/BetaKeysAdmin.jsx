import React, { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Copy, Trash2, Check, Power, FlaskConical, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const STATUS_LABELS = {
  pending: { label: "En attente", cls: "text-amber-300" },
  approved: { label: "Acceptée", cls: "text-emerald-400" },
  rejected: { label: "Refusée", cls: "text-red-400" },
};

export default function BetaKeysAdmin() {
  const [keys, setKeys] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState(0);
  const [count, setCount] = useState(1);
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    try {
      const [keysRes, appsRes] = await Promise.all([
        api.get("/admin/beta-keys"),
        api.get("/admin/beta-applications"),
      ]);
      setKeys(Array.isArray(keysRes.data) ? keysRes.data : []);
      setApplications(Array.isArray(appsRes.data) ? appsRes.data : []);
    } catch {
      toast.error("Impossible de charger les données beta");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setLoading(true);
    try {
      await api.post("/admin/beta-keys", {
        label: label.trim(),
        max_uses: Math.max(0, Number(maxUses) || 0),
        count: Math.max(1, Math.min(50, Number(count) || 1)),
      });
      toast.success(count > 1 ? `${count} clés générées` : "Clé générée");
      setLabel("");
      await load();
    } catch {
      toast.error("Erreur lors de la génération");
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (key) => {
    try {
      await api.post(`/admin/beta-keys/${encodeURIComponent(key)}/toggle`);
      await load();
    } catch { toast.error("Erreur"); }
  };

  const remove = async (key) => {
    try {
      await api.delete(`/admin/beta-keys/${encodeURIComponent(key)}`);
      toast.success("Clé supprimée");
      await load();
    } catch { toast.error("Erreur"); }
  };

  const copy = async (key) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch { toast.error("Copie impossible"); }
  };

  const setAppStatus = async (applicationId, status) => {
    try {
      await api.post(`/admin/beta-applications/${encodeURIComponent(applicationId)}/status`, { status });
      toast.success(status === "approved" ? "Candidature acceptée" : status === "rejected" ? "Candidature refusée" : "Statut mis à jour");
      await load();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-5" data-testid="beta-keys-admin">
      <div>
        <h3 className="font-display font-bold text-lg flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-violet-400" /> Clés beta — accès testeurs
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Les testeurs munis d'une clé active peuvent accéder au site même pendant la maintenance.
        </p>
      </div>

      {/* Génération */}
      <div className="rounded-lg border border-white/10 bg-black/30 p-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Libellé (optionnel)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex. Vague testeurs 1"
            className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50"
            data-testid="beta-key-label"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Utilisations max</label>
          <input
            type="number"
            min={0}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className="w-24 bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50"
            data-testid="beta-key-maxuses"
          />
          <span className="block text-[9px] text-zinc-600 mt-1">0 = illimité</span>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Nombre</label>
          <input
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="w-20 bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50"
            data-testid="beta-key-count"
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold border border-violet-500/50 text-violet-200 hover:bg-violet-500/10 disabled:opacity-50 transition-all"
            data-testid="beta-key-generate"
          >
            <Plus className="w-4 h-4" /> Générer
          </button>
        </div>
      </div>

      {/* Candidatures beta */}
      <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.03] p-4 space-y-3" data-testid="beta-applications-admin">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-violet-400" />
          <h4 className="font-display font-bold">Candidatures beta testeur</h4>
          {pendingCount > 0 && (
            <span className="text-[10px] uppercase tracking-widest font-bold text-amber-300">{pendingCount} en attente</span>
          )}
        </div>
        {applications.length === 0 ? (
          <p className="text-sm text-zinc-600 italic">Aucune candidature pour l'instant.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {applications.map((a) => {
              const st = STATUS_LABELS[a.status] || STATUS_LABELS.pending;
              return (
                <div key={a.application_id} className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm" data-testid={`beta-app-${a.application_id}`}>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-violet-100">{a.discord_username || a.pseudo || a.email}</span>
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${st.cls}`}>{st.label}</span>
                    {a.slot_number && <span className="text-[10px] text-zinc-500">#{a.slot_number}</span>}
                  </div>
                  <p className="text-xs text-zinc-400">{a.email}</p>
                  {a.motivation && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{a.motivation}</p>}
                  {a.status === "pending" && (
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={() => setAppStatus(a.application_id, "approved")} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">
                        <CheckCircle className="w-3.5 h-3.5" /> Accepter
                      </button>
                      <button type="button" onClick={() => setAppStatus(a.application_id, "rejected")} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-red-500/40 text-red-300 hover:bg-red-500/10">
                        <XCircle className="w-3.5 h-3.5" /> Refuser
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Liste */}
      <div className="space-y-2" data-testid="beta-keys-list">
        {keys.length === 0 ? (
          <p className="text-sm text-zinc-600 italic">Aucune clé générée pour l'instant.</p>
        ) : (
          keys.map((k) => {
            const limit = Number(k.max_uses) || 0;
            return (
              <div
                key={k.key}
                className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${k.active ? "border-violet-500/25 bg-violet-500/[0.04]" : "border-white/10 bg-black/30 opacity-60"}`}
                data-testid={`beta-key-row-${k.key}`}
              >
                <code className="font-mono text-sm tracking-wider text-violet-100">{k.key}</code>
                {k.label && <span className="text-xs text-zinc-400">· {k.label}</span>}
                <span className="text-[11px] font-mono-stat text-zinc-500">
                  {k.uses || 0}{limit ? `/${limit}` : ""} util.
                </span>
                <span className={`text-[10px] uppercase tracking-widest font-bold ${k.active ? "text-emerald-400" : "text-zinc-500"}`}>
                  {k.active ? "Active" : "Révoquée"}
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => copy(k.key)}
                    className="p-1.5 rounded border border-white/10 text-zinc-400 hover:text-white hover:border-white/25"
                    title="Copier"
                    data-testid={`beta-key-copy-${k.key}`}
                  >
                    {copied === k.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(k.key)}
                    className={`p-1.5 rounded border ${k.active ? "border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10" : "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"}`}
                    title={k.active ? "Révoquer" : "Réactiver"}
                    data-testid={`beta-key-toggle-${k.key}`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(k.key)}
                    className="p-1.5 rounded border border-red-500/40 text-red-300 hover:bg-red-500/10"
                    title="Supprimer"
                    data-testid={`beta-key-delete-${k.key}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
