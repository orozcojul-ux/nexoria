import React, { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Search, EyeOff, RotateCcw, Radio, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { PremiumButton } from "@/components/ui-premium";

const fmt = (s) => (s ? new Date(s).toLocaleString("fr-FR") : "—");
const LIVE_INTERVAL_MS = 8000;

export default function PrivateMessagesLogsPanel() {
  const [usernameQuery, setUsernameQuery] = useState("");
  const [textQuery, setTextQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const filtersRef = useRef({ usernameQuery: "", textQuery: "" });

  const loadMessages = useCallback(async (opts = {}) => {
    const silent = !!opts.silent;
    if (!silent) setLoading(true);
    try {
      const params = { limit: 150 };
      const un = filtersRef.current.usernameQuery.trim();
      const tq = filtersRef.current.textQuery.trim();
      if (un) params.username = un;
      if (tq) params.q = tq;
      const { data } = await api.get("/admin/moderation/friend-messages", { params });
      setMessages(data);
      setLastRefresh(new Date());
    } catch (err) {
      if (!silent) toast.error(formatApiError(err) || "Erreur chargement messagerie");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const applySearch = (e) => {
    e?.preventDefault?.();
    filtersRef.current = { usernameQuery, textQuery };
    loadMessages();
  };

  useEffect(() => {
    filtersRef.current = { usernameQuery: "", textQuery: "" };
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!live) return undefined;
    const id = setInterval(() => loadMessages({ silent: true }), LIVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [live, loadMessages]);

  const hideMessage = async (messageId) => {
    try {
      await api.post(`/admin/moderation/friend-messages/${messageId}/hide`, {
        reason: "Masqué par le staff",
      });
      toast.success("Message masqué");
      loadMessages({ silent: true });
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const restoreMessage = async (messageId) => {
    try {
      await api.post(`/admin/moderation/friend-messages/${messageId}/restore`);
      toast.success("Message restauré");
      loadMessages({ silent: true });
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <section className="space-y-4" data-testid="private-messages-logs">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-display font-bold text-lg flex items-center gap-2 text-cyan-100">
            <MessageCircle className="w-5 h-5 text-cyan-400" />
            Logs messagerie privée
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            Tous les messages privés entre joueurs — recherche par pseudo, flux en direct.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              live
                ? "border-emerald-500/50 text-emerald-200 bg-emerald-500/10"
                : "border-white/10 text-zinc-500"
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${live ? "animate-pulse" : ""}`} />
            {live ? "En direct" : "Pause"}
          </button>
          <PremiumButton variant="ghost" size="sm" onClick={() => loadMessages()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </PremiumButton>
        </div>
      </div>

      <form className="flex flex-wrap gap-2 items-end" onSubmit={applySearch}>
        <div className="flex-1 min-w-[10rem]">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Pseudo</label>
          <input
            value={usernameQuery}
            onChange={(e) => setUsernameQuery(e.target.value)}
            placeholder="Nom du héros…"
            className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex-[2] min-w-[12rem]">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Recherche texte</label>
          <input
            value={textQuery}
            onChange={(e) => setTextQuery(e.target.value)}
            placeholder="Mot-clé dans le message…"
            className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <PremiumButton type="submit" variant="cyan" size="sm" icon={Search} disabled={loading}>
          Chercher
        </PremiumButton>
      </form>

      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span>{messages.length} message{messages.length !== 1 ? "s" : ""}</span>
        {lastRefresh && (
          <span>Dernière mise à jour : {fmt(lastRefresh.toISOString())}</span>
        )}
        {live && <span className="text-emerald-400/80">Rafraîchissement auto toutes les 8 s</span>}
      </div>

      {loading && messages.length === 0 ? (
        <div className="text-zinc-500 text-sm py-4">Chargement…</div>
      ) : messages.length === 0 ? (
        <div className="text-zinc-500 text-sm italic py-4">Aucun message trouvé.</div>
      ) : (
        <div className="space-y-2 max-h-[36rem] overflow-y-auto pr-1">
          {messages.map((m) => (
            <div
              key={m.message_id}
              className={`rounded-xl border p-3 text-sm ${
                m.moderation_hidden ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div className="flex flex-wrap gap-2 text-[10px] text-zinc-500 mb-1">
                <span className="font-bold text-zinc-300">{m.from_username || m.from_user}</span>
                <span>→</span>
                <span className="font-bold text-zinc-300">{m.to_username || m.to_user}</span>
                <span className="ml-auto">{fmt(m.created_at)}</span>
              </div>
              <p className="text-zinc-300 text-xs whitespace-pre-wrap break-words">{m.text}</p>
              {m.moderation_hidden && (
                <p className="text-[10px] text-red-300/80 mt-1">
                  Masqué{m.moderation_hidden_by ? ` par ${m.moderation_hidden_by}` : ""}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                {!m.moderation_hidden ? (
                  <button
                    type="button"
                    onClick={() => hideMessage(m.message_id)}
                    className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 inline-flex items-center gap-1"
                  >
                    <EyeOff className="w-3 h-3" /> Masquer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => restoreMessage(m.message_id)}
                    className="text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Restaurer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
