import React, { useEffect, useState } from "react";
import { MessageCircle, Send, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { LOCALE_MAP } from "@/lib/languages";
import HeroName from "@/components/HeroName";
import { resolveMediaUrl } from "@/lib/user-avatar";
import { PremiumButton } from "@/components/ui-premium";
import { sfx } from "@/lib/sfx";
import TranslatableText from "@/components/content/TranslatableText";

export default function NewsComments({ newsId }) {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const isStaff = user?.role === "admin" || user?.role === "moderator";
  const locale = LOCALE_MAP[lang] || "fr-FR";

  const load = async () => {
    try {
      const { data } = await api.get(`/news/${newsId}/comments`);
      setComments(data);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [newsId]);

  const submit = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (content.length < 2) return;
    setSending(true);
    try {
      const { data } = await api.post(`/news/${newsId}/comments`, { content });
      setComments((c) => [...c, data]);
      setText("");
      sfx.success();
      toast.success(t("news.comments.published"));
    } catch (err) {
      toast.error(err.response?.data?.detail || t("errors.generic"));
    } finally {
      setSending(false);
    }
  };

  const remove = async (commentId) => {
    if (!window.confirm(t("news.comments.hideConfirm"))) return;
    try {
      await api.delete(`/news/comments/${commentId}`);
      setComments((c) => c.filter((x) => x.comment_id !== commentId));
      toast.success(t("news.comments.moderated"));
    } catch (err) {
      toast.error(err.response?.data?.detail || t("errors.generic"));
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-[var(--nx-border)] bg-[var(--nx-surface)] p-5" data-testid="news-comments">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-4 h-4 text-cyan-400" />
        <h2 className="font-display font-bold text-lg text-white">
          {t("news.comments.title")}{" "}
          <span className="text-zinc-500 font-mono-stat text-sm">({comments.length})</span>
        </h2>
      </div>

      {user && (
        <form onSubmit={submit} className="mb-5 flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("news.comments.placeholder")}
            maxLength={800}
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
            data-testid="news-comment-input"
          />
          <PremiumButton type="submit" variant="cyan" size="sm" icon={sending ? Loader2 : Send} disabled={sending || text.trim().length < 2} testid="news-comment-submit">
            {t("news.comments.publish")}
          </PremiumButton>
        </form>
      )}

      {loading && <p className="text-zinc-500 text-sm italic">{t("news.comments.loading")}</p>}
      {!loading && comments.length === 0 && (
        <p className="text-zinc-500 text-sm italic">{t("news.comments.empty")}</p>
      )}

      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.comment_id} className="flex gap-3 p-3 rounded-xl border border-white/8 bg-white/[0.02]" data-testid={`news-comment-${c.comment_id}`}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
              {resolveMediaUrl(c.avatar_url) ? <img src={resolveMediaUrl(c.avatar_url)} alt="" className="w-full h-full object-cover" /> : c.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <HeroName user={{ username: c.username, role: c.role, country_code: c.country_code }} size="sm" />
                <span className="text-[10px] text-zinc-600 font-mono-stat shrink-0">
                  {new Date(c.created_at).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="text-sm text-zinc-300 mt-1 leading-relaxed">
                <TranslatableText
                  as="span"
                  text={c.content}
                  entityType="news_comment"
                  entityId={c.comment_id}
                  field="content"
                  compact
                />
              </div>
            </div>
            {(isStaff || c.user_id === user?.user_id) && (
              <button type="button" onClick={() => remove(c.comment_id)} className="text-zinc-600 hover:text-red-400 p-1 shrink-0" title={t("news.comments.delete")}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
