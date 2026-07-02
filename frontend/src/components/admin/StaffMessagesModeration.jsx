import React, { useCallback, useEffect, useState } from "react";
import { MessageCircle, Search, EyeOff, RotateCcw, Newspaper, MessagesSquare } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { PremiumButton } from "@/components/ui-premium";

const fmt = (s) => (s ? new Date(s).toLocaleString("fr-FR") : "—");

export default function StaffMessagesModeration() {
  const [view, setView] = useState("messages");
  const [userQuery, setUserQuery] = useState("");
  const [textQuery, setTextQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentSource, setCommentSource] = useState("all");
  const [loading, setLoading] = useState(false);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 120 };
      if (userQuery.trim()) params.user_id = userQuery.trim();
      if (textQuery.trim()) params.q = textQuery.trim();
      const { data } = await api.get("/admin/moderation/friend-messages", { params });
      setMessages(data);
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur chargement messagerie");
    } finally {
      setLoading(false);
    }
  }, [userQuery, textQuery]);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 120, source: commentSource };
      if (userQuery.trim()) params.user_id = userQuery.trim();
      const { data } = await api.get("/admin/moderation/comments", { params });
      setComments(data);
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur chargement commentaires");
    } finally {
      setLoading(false);
    }
  }, [userQuery, commentSource]);

  useEffect(() => {
    if (view === "messages") loadMessages();
    else loadComments();
  }, [view, loadMessages, loadComments]);

  const hideMessage = async (messageId) => {
    try {
      await api.post(`/admin/moderation/friend-messages/${messageId}/hide`, {
        reason: "Masqué par le staff",
      });
      toast.success("Message masqué");
      loadMessages();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const restoreMessage = async (messageId) => {
    try {
      await api.post(`/admin/moderation/friend-messages/${messageId}/restore`);
      toast.success("Message restauré");
      loadMessages();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <section className="space-y-4" data-testid="staff-messages-mod">
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => setView("messages")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
            view === "messages" ? "border-cyan-500/50 text-cyan-200 bg-cyan-500/10" : "border-white/10 text-zinc-500"
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5 inline mr-1" />
          Messagerie héros
        </button>
        <button
          type="button"
          onClick={() => setView("comments")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
            view === "comments" ? "border-violet-500/50 text-violet-200 bg-violet-500/10" : "border-white/10 text-zinc-500"
          }`}
        >
          <Newspaper className="w-3.5 h-3.5 inline mr-1" />
          Commentaires
        </button>
      </div>

      <form
        className="flex flex-wrap gap-2 items-end"
        onSubmit={(e) => { e.preventDefault(); view === "messages" ? loadMessages() : loadComments(); }}
      >
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">User ID</label>
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="usr_…"
            className="w-44 bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-sm"
          />
        </div>
        {view === "messages" && (
          <div className="flex-1 min-w-[12rem]">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Recherche texte</label>
            <input
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
              placeholder="Mot-clé dans le message…"
              className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-sm"
            />
          </div>
        )}
        {view === "comments" && (
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Source</label>
            <select
              value={commentSource}
              onChange={(e) => setCommentSource(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-sm"
            >
              <option value="all">Tous</option>
              <option value="news">Articles</option>
              <option value="feed">Fil social</option>
            </select>
          </div>
        )}
        <PremiumButton type="submit" variant="cyan" size="sm" icon={Search} disabled={loading}>
          Chercher
        </PremiumButton>
      </form>

      <p className="text-xs text-zinc-500 italic">
        Lecture réservée au staff — messagerie privée entre héros liés, commentaires fil et actualités.
        Naria veille sur le Nexus ; masquez ici manuellement si besoin.
      </p>

      {loading ? (
        <div className="text-zinc-500 text-sm py-4">Chargement…</div>
      ) : view === "messages" ? (
        messages.length === 0 ? (
          <div className="text-zinc-500 text-sm italic py-4">Aucun message trouvé.</div>
        ) : (
          <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
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
        )
      ) : comments.length === 0 ? (
        <div className="text-zinc-500 text-sm italic py-4">Aucun commentaire trouvé.</div>
      ) : (
        <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
          {comments.map((c) => (
            <div
              key={`${c.source}-${c.comment_id}`}
              className={`rounded-xl border p-3 text-sm ${
                c.moderation_hidden || c.hidden ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div className="flex flex-wrap gap-2 text-[10px] text-zinc-500 mb-1">
                <MessagesSquare className="w-3 h-3" />
                <span className="uppercase tracking-wider text-violet-300">{c.source === "news" ? "Article" : "Fil"}</span>
                <span className="font-bold text-zinc-300">{c.username || c.user_id}</span>
                <span className="ml-auto">{fmt(c.created_at)}</span>
              </div>
              <p className="text-zinc-300 text-xs whitespace-pre-wrap break-words">{c.text || c.content}</p>
              {(c.moderation_hidden || c.hidden) && (
                <p className="text-[10px] text-red-300/80 mt-1">Masqué / modéré</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
