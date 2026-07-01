import React, { useCallback, useEffect, useState } from "react";
import { Shield, Eye, RefreshCw, Check, X, RotateCcw, AlertTriangle, Ban, Minus, UserX } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { PremiumButton } from "@/components/ui-premium";

function StatBox({ label, value, accent = "#22D3EE" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{label}</div>
      <div className="font-display font-black text-2xl" style={{ color: accent }}>{value ?? 0}</div>
    </div>
  );
}

function LangBadge({ label, value }) {
  if (!value) return null;
  return (
    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
      {label}: {value}
    </span>
  );
}

export default function NariaModerationAdmin() {
  const [dashboard, setDashboard] = useState(null);
  const [logs, setLogs] = useState([]);
  const [scores, setScores] = useState([]);
  const [filter, setFilter] = useState("pending_review");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, logsRes, scoresRes] = await Promise.all([
        api.get("/admin/moderation/dashboard"),
        api.get("/admin/moderation/logs", { params: { status: filter } }),
        api.get("/admin/moderation/scores"),
      ]);
      setDashboard(dashRes.data);
      setLogs(logsRes.data);
      setScores(scoresRes.data);
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur chargement modération Naria");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const reviewLog = async (logId, status, restoreContent = false) => {
    try {
      await api.put(`/admin/moderation/logs/${logId}`, { status, restore_content: restoreContent });
      toast.success("Action mise à jour");
      window.dispatchEvent(new CustomEvent("nexoria:staff-metrics-changed"));
      load();
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur");
    }
  };

  const resetScore = async (userId) => {
    try {
      await api.post(`/admin/moderation/scores/${userId}/reset`);
      toast.success("Score réinitialisé");
      load();
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur");
    }
  };

  const reduceScore = async (userId) => {
    try {
      const { data } = await api.post(`/admin/moderation/scores/${userId}/reduce`, { amount: 2 });
      toast.success(`Score réduit → ${data.score}`);
      load();
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur");
    }
  };

  const liftRestriction = async (userId) => {
    try {
      await api.post(`/admin/moderation/users/${userId}/lift-restriction`);
      toast.success("Restriction levée");
      load();
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur");
    }
  };

  const banUser = async (userId, username) => {
    if (!window.confirm(`Bannir ${username || userId} 24 h via le système existant ?`)) return;
    try {
      await api.post(`/admin/users/${userId}/ban`, {
        duration_hours: 24,
        reason: "Ban admin — suite alerte Naria",
      });
      toast.success("Ban appliqué");
      load();
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur ban");
    }
  };

  const unbanUser = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/unban`);
      toast.success("Ban levé");
      load();
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur déban");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl" data-testid="naria-moderation-admin">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-xl flex items-center gap-2 text-cyan-100">
            <Eye className="w-5 h-5 text-violet-400" />
            Naria — Sentinelle
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Modération intelligente multilingue — confiance, contexte et historique joueur.
          </p>
        </div>
        <PremiumButton variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </PremiumButton>
      </div>

      {dashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatBox label="Alertes en attente" value={dashboard.pending_alerts} accent="#F59E0B" />
          <StatBox label="Avertissements" value={dashboard.warnings_recent} accent="#A855F7" />
          <StatBox label="Contenus masqués" value={dashboard.hidden_content} accent="#EF4444" />
          <StatBox label="Restreints" value={dashboard.restricted_users} accent="#F97316" />
          <StatBox label="Scores élevés" value={dashboard.high_score_users} accent="#22D3EE" />
          <StatBox label="Bans / proposés" value={dashboard.ban_events} accent="#DC2626" />
        </div>
      )}

      {dashboard && !dashboard.auto_ban_enabled && (
        <div className="flex items-center gap-2 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Mode prudent : confiance faible = log seul ; ban auto désactivé.
        </div>
      )}

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-violet-400" />
          <h3 className="font-display font-bold text-sm uppercase tracking-widest text-zinc-300">File de modération</h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="ml-auto text-xs bg-zinc-900 border border-white/10 rounded-lg px-2 py-1"
          >
            <option value="all">Tous</option>
            <option value="pending_review">En attente</option>
            <option value="applied">Appliqués</option>
            <option value="logged">Logs (faible confiance)</option>
            <option value="approved">Approuvés</option>
            <option value="dismissed">Annulés</option>
            <option value="blocked">Bloqués</option>
          </select>
        </div>
        {loading ? (
          <div className="text-zinc-500 text-sm py-6">Chargement…</div>
        ) : logs.length === 0 ? (
          <div className="text-zinc-500 text-sm italic py-6">Aucun log pour ce filtre.</div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.log_id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm"
                data-testid={`naria-log-${log.log_id}`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-bold text-violet-200">{log.username || log.user_id}</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">
                    {log.actionType || log.action}
                  </span>
                  <LangBadge label="Joueur" value={log.userLanguage} />
                  <LangBadge label="Contenu" value={log.detectedContentLanguage} />
                  {log.confidence != null && (
                    <span className="text-[10px] text-amber-400/90">
                      conf. {Math.round((log.confidence || 0) * 100)}%
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-500">score +{log.scoreAdded} → {log.totalScore}</span>
                  <span className="text-[10px] text-zinc-600 ml-auto">{log.createdAt?.slice(0, 16)}</span>
                </div>
                <p className="text-zinc-400 text-xs mb-1">
                  {log.reasonCode || log.reason} · {log.severity}
                  {log.userMessageKey && (
                    <span className="text-zinc-600"> · {log.userMessageKey}</span>
                  )}
                </p>
                {log.originalTextPreview && (
                  <p className="text-zinc-600 text-xs italic line-clamp-2">« {log.originalTextPreview} »</p>
                )}
                <div className="flex gap-2 mt-3 flex-wrap items-center">
                  {(log.status === "pending_review" || log.status === "applied") && (
                    <>
                      <button type="button" onClick={() => reviewLog(log.log_id, "approved")} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-400 hover:text-emerald-300">
                        <Check className="w-3 h-3" /> Confirmer
                      </button>
                      <button type="button" onClick={() => reviewLog(log.log_id, "dismissed")} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-400 hover:text-zinc-300">
                        <X className="w-3 h-3" /> Annuler
                      </button>
                      <button type="button" onClick={() => reviewLog(log.log_id, "restored", true)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-cyan-400 hover:text-cyan-300">
                        <RotateCcw className="w-3 h-3" /> Restaurer
                      </button>
                    </>
                  )}
                  {log.user_id && (
                    <>
                      <button type="button" onClick={() => reduceScore(log.user_id)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-500 hover:text-zinc-300">
                        <Minus className="w-3 h-3" /> Réduire score
                      </button>
                      <button type="button" onClick={() => banUser(log.user_id, log.username)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-red-400 hover:text-red-300">
                        <Ban className="w-3 h-3" /> Bannir
                      </button>
                      <button type="button" onClick={() => unbanUser(log.user_id)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-500 hover:text-zinc-300">
                        <UserX className="w-3 h-3" /> Débannir
                      </button>
                    </>
                  )}
                  <span className="text-[10px] text-zinc-600 uppercase ml-auto">{log.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="font-display font-bold text-sm uppercase tracking-widest text-zinc-300 mb-3">
          Scores joueurs (top)
        </h3>
        <div className="space-y-2">
          {scores.slice(0, 15).map((s) => (
            <div key={s.user_id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm flex-wrap">
              <span className="font-bold text-zinc-200">{s.username || s.user_id}</span>
              <span className="text-violet-300 font-mono">score {s.score}</span>
              <LangBadge label="Lang" value={s.preferredLanguage} />
              <span className="text-zinc-600 text-xs">warn {s.warnings_count || 0}</span>
              <div className="ml-auto flex gap-2 flex-wrap">
                <button type="button" onClick={() => reduceScore(s.user_id)} className="text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-300">Réduire</button>
                <button type="button" onClick={() => resetScore(s.user_id)} className="text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-300">Reset</button>
                <button type="button" onClick={() => liftRestriction(s.user_id)} className="text-[10px] uppercase font-bold text-amber-500 hover:text-amber-400">Lever restriction</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
