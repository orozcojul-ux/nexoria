import React, { useEffect, useState } from "react";
import { Flag, Check, X, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";

const REASON_LABELS = {
  spam: "Spam",
  harassment: "Harcèlement",
  inappropriate: "Inapproprié",
  cheating: "Triche",
  other: "Autre",
};

export default function ReportsAdmin() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/reports", { params: { status: filter } });
      setItems(data);
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur chargement signalements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const resolve = async (reportId, status) => {
    try {
      await api.put(`/admin/reports/${reportId}`, { status });
      toast.success(status === "resolved" ? "Signalement traité" : "Signalement classé");
      window.dispatchEvent(new CustomEvent("nexoria:staff-metrics-changed"));
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  return (
    <div className="space-y-5 max-w-4xl" data-testid="reports-admin">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-xl flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-400" /> Signalements
          </h2>
          <p className="text-xs text-zinc-500 italic mt-1">
            Rapports des joueurs sur forum, articles et profils.
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
        >
          <option value="open">Ouverts</option>
          <option value="resolved">Traités</option>
          <option value="dismissed">Classés</option>
          <option value="all">Tous</option>
        </select>
      </div>

      {loading && <p className="text-zinc-500 italic text-sm">Chargement…</p>}
      {!loading && items.length === 0 && (
        <p className="text-center py-12 text-zinc-500 italic">Aucun signalement {filter !== "all" ? `(${filter})` : ""}.</p>
      )}

      <div className="space-y-3">
        {items.map((r) => (
          <div
            key={r.report_id}
            className={`rounded-xl border p-4 ${r.status === "open" ? "border-red-500/30 bg-red-500/[0.04]" : "border-white/10 bg-white/[0.02]"}`}
            data-testid={`report-row-${r.report_id}`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-red-400">
                    {REASON_LABELS[r.reason] || r.reason}
                  </span>
                  <span className="text-[9px] text-zinc-600">{r.target_type}</span>
                  <span className={`text-[9px] uppercase font-bold ${r.status === "open" ? "text-amber-400" : "text-zinc-500"}`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-sm text-white font-medium">
                  {r.reporter_username} → {r.reported_username || r.context_label || r.target_id}
                </p>
                {r.context_label && (
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">{r.context_label}</p>
                )}
                <p className="text-xs text-zinc-300 mt-2 leading-relaxed">{r.details}</p>
                <p className="text-[10px] text-zinc-600 mt-2 font-mono-stat">
                  {new Date(r.created_at).toLocaleString("fr-FR")}
                  {r.resolved_by && ` · par ${r.resolved_by}`}
                </p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {r.target_type === "forum_thread" && (
                  <Link to={`/forum?thread=${r.target_id}`} className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Voir sujet
                  </Link>
                )}
                {r.target_type === "forum_reply" && r.thread_id && (
                  <Link to={`/forum?thread=${r.thread_id}`} className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Voir sujet
                  </Link>
                )}
                {r.target_type === "news_article" && (
                  <Link to={`/news/${r.target_id}`} className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Voir article
                  </Link>
                )}
                {r.reported_username && (
                  <Link to={`/profile/${r.reported_username}`} className="text-[10px] text-violet-400 hover:text-violet-300">
                    Voir le profil
                  </Link>
                )}
                {r.reported_user_id && (
                  <Link to="/admin?tab=users" className="text-[10px] text-violet-400 hover:text-violet-300">
                    Modérer joueur
                  </Link>
                )}
                {r.status === "open" && (
                  <>
                    <button
                      type="button"
                      onClick={() => resolve(r.report_id, "resolved")}
                      className="flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 font-bold uppercase"
                      data-testid={`report-resolve-${r.report_id}`}
                    >
                      <Check className="w-3 h-3" /> Traiter
                    </button>
                    <button
                      type="button"
                      onClick={() => resolve(r.report_id, "dismissed")}
                      className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 font-bold uppercase"
                    >
                      <X className="w-3 h-3" /> Classer
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
