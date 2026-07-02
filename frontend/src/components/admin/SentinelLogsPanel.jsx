import React, { useCallback, useEffect, useState } from "react";
import { Shield, Check, X, RotateCcw, Ban, Minus, UserX, RefreshCw, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { PremiumButton } from "@/components/ui-premium";
import {
  MOD_FILTER,
  formatModDate,
  modActionLabel,
  modContentLabel,
  modReasonLabel,
  modSeverityLabel,
  modStatusClass,
  modStatusMeta,
  modUserMessage,
} from "@/lib/moderation-log-labels";
import "./sentinel-logs.css";

function StatBox({ label, value, accent = "#22D3EE" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{label}</div>
      <div className="font-display font-black text-2xl" style={{ color: accent }}>{value ?? 0}</div>
    </div>
  );
}

function ActorPill({ log }) {
  const name = log.actorName || log.actor || "—";
  const source = log.actionSource;
  const isNaria = source === "naria" || name === "Naria";
  const isShumi = source === "shumi" || name === "Shumi" || name === "Vigile";
  const isStaff = source === "staff" || ["admin", "moderator", "staff"].includes(log.actorType);
  let cls = "bg-orange-500/15 text-orange-200 border-orange-500/30";
  let role = "Modérateur";
  if (isNaria) { cls = "bg-violet-500/15 text-violet-200 border-violet-500/30"; role = "Sentinelle auto."; }
  else if (isShumi) { cls = "bg-cyan-500/15 text-cyan-200 border-cyan-500/30"; role = "Modération auto."; }
  else if (isStaff) { role = "Équipe"; }
  return (
    <span className={`inline-flex flex-col gap-0.5 px-2 py-1 rounded-lg border text-[10px] uppercase tracking-wider ${cls}`}>
      <span className="font-bold">{name}</span>
      <span className="opacity-70 normal-case tracking-normal text-[9px]">{role}</span>
    </span>
  );
}

function StatusBadge({ status }) {
  const meta = modStatusMeta(status);
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${modStatusClass(status)}`} title={meta.hint}>
      {meta.label}
    </span>
  );
}

function ModerationLogCard({ log, t, supremeCanReview, onReview, onReduceScore, onBan, onUnban }) {
  const isAutomated = log.actionSource === "naria" || log.actionSource === "shumi"
    || ["Naria", "Shumi", "Vigile"].includes(log.actorName);
  const canReview = supremeCanReview && isAutomated
    && (log.status === "pending_review" || log.status === "applied");
  const statusMeta = modStatusMeta(log.status);
  const playerMessage = modUserMessage(t, log.userMessageKey);
  const severity = modSeverityLabel(log.severity);

  return (
    <article className="mod-log-card" data-testid={`naria-log-${log.log_id}`}>
      <header className="mod-log-card__head">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={log.status} />
          <ActorPill log={log} />
        </div>
        <time className="text-[11px] text-zinc-500">{formatModDate(log.createdAt)}</time>
      </header>
      <div className="mod-log-card__body">
        <div className="mod-log-row">
          <span className="mod-log-row__label">Joueur</span>
          <div>
            <span className="font-bold text-zinc-100">{log.username || log.user_id || "—"}</span>
            <span className="text-zinc-500 text-xs ml-2">· {modContentLabel(log.contentType)}</span>
          </div>
        </div>
        <div className="mod-log-row">
          <span className="mod-log-row__label">Action</span>
          <p className="text-zinc-200">{modActionLabel(log.actionType, log.action)}</p>
        </div>
        <div className="mod-log-row">
          <span className="mod-log-row__label">Motif</span>
          <div className="text-zinc-300">
            {modReasonLabel(log.reasonCode, log.reason)}
            {severity && (
              <span className={`ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                log.severity === "critical" ? "bg-red-500/20 text-red-300" :
                log.severity === "high" ? "bg-orange-500/20 text-orange-300" : "bg-zinc-500/15 text-zinc-400"
              }`}>Gravité {severity}</span>
            )}
          </div>
        </div>
        {log.originalTextPreview && (
          <div className="mod-log-row">
            <span className="mod-log-row__label">Contenu</span>
            <blockquote className="mod-log-quote">{log.originalTextPreview}</blockquote>
          </div>
        )}
        {playerMessage && (
          <div className="mod-log-row">
            <span className="mod-log-row__label">Msg joueur</span>
            <p className="text-xs text-zinc-500 italic">{playerMessage}</p>
          </div>
        )}
        {isAutomated && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {log.userLanguage && <span className="mod-log-meta-pill">Langue joueur : {log.userLanguage.toUpperCase()}</span>}
            {log.detectedContentLanguage && <span className="mod-log-meta-pill">Langue texte : {log.detectedContentLanguage.toUpperCase()}</span>}
            {log.confidence != null && <span className="mod-log-meta-pill">Confiance {Math.round((log.confidence || 0) * 100)}%</span>}
            {(log.scoreAdded != null || log.totalScore != null) && (
              <span className="mod-log-meta-pill">Score +{log.scoreAdded ?? 0} → {log.totalScore ?? 0}</span>
            )}
          </div>
        )}
        {statusMeta.hint && <p className="text-[11px] text-zinc-500 border-t border-white/5 pt-2">{statusMeta.hint}</p>}
      </div>
      {(canReview || (log.user_id && isAutomated && supremeCanReview)) && (
        <footer className="mod-log-actions">
          {canReview && (
            <>
              <button type="button" onClick={() => onReview(log.log_id, "approved")} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-400 hover:text-emerald-300" title="Valider la sentinelle">
                <Check className="w-3 h-3" /> Confirmer
              </button>
              <button type="button" onClick={() => onReview(log.log_id, "dismissed")} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-400 hover:text-zinc-200" title="Alerte infondée">
                <X className="w-3 h-3" /> Annuler l'alerte
              </button>
              <button type="button" onClick={() => onReview(log.log_id, "restored", true)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-cyan-400 hover:text-cyan-300">
                <RotateCcw className="w-3 h-3" /> Restaurer le message
              </button>
            </>
          )}
          {log.user_id && isAutomated && supremeCanReview && (
            <>
              <button type="button" onClick={() => onReduceScore(log.user_id)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-500 hover:text-zinc-300">
                <Minus className="w-3 h-3" /> Réduire score
              </button>
              <button type="button" onClick={() => onBan(log.user_id, log.username)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-red-400 hover:text-red-300">
                <Ban className="w-3 h-3" /> Bannir 24 h
              </button>
              <button type="button" onClick={() => onUnban(log.user_id)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-500 hover:text-zinc-300">
                <UserX className="w-3 h-3" /> Débannir
              </button>
            </>
          )}
        </footer>
      )}
    </article>
  );
}

export default function SentinelLogsPanel({
  sentinel: initialSentinel = "all",
  title,
  subtitle,
  accent = "#A855F7",
  showScores = false,
  humanSentinel = false,
  supremeCanReview = false,
}) {
  const { t } = useI18n();
  const [sentinel, setSentinel] = useState(initialSentinel);
  const [logs, setLogs] = useState([]);
  const [scores, setScores] = useState([]);
  const [filter, setFilter] = useState(
    () => (humanSentinel || initialSentinel === "all" || String(initialSentinel).startsWith("user:") ? "all" : "pending_review"),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => { setSentinel(initialSentinel); }, [initialSentinel]);
  useEffect(() => {
    if (humanSentinel || String(initialSentinel).startsWith("user:")) setFilter("all");
    else if (initialSentinel === "naria" || initialSentinel === "shumi") setFilter("pending_review");
  }, [humanSentinel, initialSentinel]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { status: filter };
      if (sentinel !== "all") params.sentinel = sentinel;
      const logsRes = await api.get("/admin/moderation/logs", { params });
      setLogs(logsRes.data);
      if (showScores) {
        const scoresRes = await api.get("/admin/moderation/scores");
        setScores(scoresRes.data);
      }
    } catch (err) {
      toast.error(formatApiError(err) || `Erreur chargement logs ${title}`);
    } finally {
      setLoading(false);
    }
  }, [sentinel, filter, title, showScores]);

  useEffect(() => { load(); }, [load]);

  const reviewLog = async (logId, status, restoreContent = false) => {
    try {
      await api.put(`/admin/moderation/logs/${logId}`, { status, restore_content: restoreContent });
      toast.success("Décision enregistrée");
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
    if (!window.confirm(`Bannir ${username || userId} 24 h ?`)) return;
    try {
      await api.post(`/admin/users/${userId}/ban`, { duration_hours: 24, reason: `Ban admin — suite alerte ${title}` });
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

  const filterHint = MOD_FILTER[filter] || "";

  return (
    <div className="space-y-6" data-testid={`sentinel-logs-${sentinel}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-display font-bold text-lg flex items-center gap-2" style={{ color: accent }}>
            <Shield className="w-5 h-5" />
            {title}
          </h3>
          {subtitle && <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>}
        </div>
        <PremiumButton variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </PremiumButton>
      </div>

      <section>
        <details className="mod-queue-guide mb-4" open>
          <summary className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Comment lire cette file ?
          </summary>
          <ul className="mt-3 space-y-2 text-xs text-zinc-400 leading-relaxed list-disc pl-4">
            <li><strong className="text-zinc-300">Naria / Shumi</strong> analysent les messages et appliquent des mesures (masquage, avertissement, blocage).</li>
            <li><strong className="text-zinc-300">À valider</strong> : vous pouvez Confirmer, Annuler l'alerte ou Restaurer le message.</li>
            <li><strong className="text-zinc-300">Score</strong> : cumul d'infractions — plus il est haut, plus les sanctions sont sévères.</li>
            <li><strong className="text-zinc-300">Confiance</strong> : certitude de la détection — faible = simple surveillance sans action.</li>
          </ul>
        </details>

        <div className="flex items-start gap-3 mb-3 flex-wrap">
          <span className="font-display font-bold text-sm uppercase tracking-widest text-zinc-300 pt-1">File de modération</span>
          <div className="ml-auto flex flex-col items-end gap-1">
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="text-xs bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 min-w-[12rem]" aria-label="Filtrer la file">
              {Object.entries(MOD_FILTER).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {filterHint && <span className="text-[10px] text-zinc-600 max-w-xs text-right">{filterHint}</span>}
          </div>
        </div>

        {loading ? (
          <div className="text-zinc-500 text-sm py-6">Chargement…</div>
        ) : logs.length === 0 ? (
          <div className="text-zinc-500 text-sm italic py-6 rounded-xl border border-dashed border-white/10 px-4">Aucun événement pour ce filtre.</div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <ModerationLogCard key={log.log_id} log={log} t={t} supremeCanReview={supremeCanReview} onReview={reviewLog} onReduceScore={reduceScore} onBan={banUser} onUnban={unbanUser} />
            ))}
          </div>
        )}
      </section>

      {showScores && (
        <section>
          <h3 className="font-display font-bold text-sm uppercase tracking-widest text-zinc-300 mb-1">Scores joueurs (top)</h3>
          <p className="text-[11px] text-zinc-600 mb-3">Joueurs avec le plus d'infractions cumulées.</p>
          <div className="space-y-2">
            {scores.slice(0, 15).map((s) => (
              <div key={s.user_id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm flex-wrap">
                <span className="font-bold text-zinc-200">{s.username || s.user_id}</span>
                <span className="text-violet-300 font-mono">score {s.score}</span>
                <div className="ml-auto flex gap-2 flex-wrap">
                  <button type="button" onClick={() => reduceScore(s.user_id)} className="text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-300">Réduire</button>
                  <button type="button" onClick={() => resetScore(s.user_id)} className="text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-300">Reset</button>
                  <button type="button" onClick={() => liftRestriction(s.user_id)} className="text-[10px] uppercase font-bold text-amber-500 hover:text-amber-400">Lever restriction</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export { StatBox };
