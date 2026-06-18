import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Lucide from "lucide-react";
import {
  Scroll, MessageCircle, Eye, Pin, Lock, Trash2, Send, Plus,
  Clock, Hash, Search, Flame, BookOpen, TrendingUp, Shield, Edit3,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell, PremiumCard, PremiumButton, PremiumModal } from "@/components/ui-premium";
import HtmlEditor from "@/components/admin/HtmlEditor";
import ForumRichContent from "@/components/forum/ForumRichContent";
import { ReportButton } from "@/components/ReportContentModal";
import ForumBannedView from "@/components/forum/ForumBannedView";
import ForumModPanel from "@/components/forum/ForumModPanel";
import HeroName from "@/components/HeroName";
import { sfx } from "@/lib/sfx";
import { stripHtml } from "@/lib/stripHtml";
import { usePageBanner } from "@/lib/page-banners";
import "@/pages/pages-hub.css";

const fmtDate = (s) =>
  s ? new Date(s).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export default function Forum() {
  const banner = usePageBanner("forum");
  const [searchParams, setSearchParams] = useSearchParams();
  const cat = searchParams.get("cat");
  const threadId = searchParams.get("thread");
  const [categories, setCategories] = useState([]);
  const [recent, setRecent] = useState([]);
  const [query, setQuery] = useState("");
  const [forumBan, setForumBan] = useState(null);
  const [forumMute, setForumMute] = useState(null);
  const [accessLoading, setAccessLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setAccessLoading(true);
      try {
        const { data: access } = await api.get("/forum/access-status");
        if (access?.forum_banned) {
          setForumBan(access);
          setForumMute(null);
          return;
        }
        setForumBan(null);
        setForumMute(access?.forum_muted ? access : null);

        const [c, r] = await Promise.all([
          api.get("/forum/categories"),
          api.get("/forum/recent", { params: { limit: 8 } }).catch(() => ({ data: [] })),
        ]);
        setCategories(c.data);
        setRecent(r.data || []);
      } catch (err) {
        const detail = err?.response?.data?.detail;
        if (detail?.forum_banned) {
          setForumBan(detail);
        } else {
          toast.error("Impossible de charger le forum");
        }
      } finally {
        setAccessLoading(false);
      }
    })();
  }, []);

  const totalThreads = useMemo(
    () => categories.reduce((n, c) => n + (c.thread_count || 0), 0),
    [categories],
  );

  if (accessLoading) {
    return (
      <PageShell wide testid="forum-page" banner={banner}>
        <PremiumCard tone="cyan" className="p-12 text-center text-zinc-500 italic">Ouverture de la Tribune…</PremiumCard>
      </PageShell>
    );
  }

  if (forumBan) {
    return <ForumBannedView banInfo={forumBan} />;
  }

  const goCats = () => setSearchParams({});
  const goThreads = (category) => setSearchParams({ cat: category });
  const goThread = (category, id) => setSearchParams({ cat: category, thread: id });

  const sidebar = (
    <ForumSidebar
      categories={categories}
      recent={recent}
      totalThreads={totalThreads}
      query={query}
      onQueryChange={setQuery}
      onOpenRecent={(t) => goThread(t.category, t.thread_id)}
      onOpenCat={goThreads}
      forumMute={forumMute}
    />
  );

  if (threadId && cat) {
    return (
      <ForumShell banner={banner} sidebar={sidebar}>
        <ThreadView threadId={threadId} category={cat} forumMute={forumMute} onBack={() => goThreads(cat)} onDeleted={goCats} />
      </ForumShell>
    );
  }

  if (cat) {
    return (
      <ForumShell banner={banner} sidebar={sidebar}>
        <ThreadList category={cat} query={query} forumMute={forumMute} onBack={goCats} onOpen={(id) => goThread(cat, id)} />
      </ForumShell>
    );
  }

  return (
    <ForumShell banner={banner} sidebar={sidebar}>
      <div className="flex justify-end mb-4">
        <span className="hub-stat-pill">
          <Hash className="w-3 h-3" /> {categories.length} catégories · {totalThreads} sujets
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map((c, i) => {
          const Icon = Lucide[c.icon] || Lucide.MessageCircle;
          return (
            <motion.button
              key={c.id}
              type="button"
              onClick={() => goThreads(c.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="forum-cat-card"
              data-testid={`forum-cat-${c.id}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(234,179,8,0.12)", boxShadow: "0 0 12px rgba(234,179,8,0.15)" }}
                >
                  <Icon className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-base text-white mb-0.5">{c.name}</h3>
                  <p className="text-xs text-zinc-500 line-clamp-2">{c.description}</p>
                  <div className="flex items-center gap-3 mt-3 text-[10px] font-mono-stat font-bold uppercase tracking-wider">
                    <span className="text-cyan-400 flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {c.thread_count} sujet{c.thread_count > 1 ? "s" : ""}
                    </span>
                    <span className="text-zinc-600">{c.last_activity_at ? fmtDate(c.last_activity_at) : "—"}</span>
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </ForumShell>
  );
}

function ForumShell({ children, sidebar, banner }) {
  return (
    <PageShell wide testid="forum-page" banner={banner}>
      <div className="forum-layout">
        <div className="forum-layout__main">{children}</div>
        <aside className="forum-layout__aside">{sidebar}</aside>
      </div>
    </PageShell>
  );
}

function ForumSidebar({ categories, recent, totalThreads, query, onQueryChange, onOpenRecent, onOpenCat, forumMute }) {
  const hottest = [...categories].sort((a, b) => (b.thread_count || 0) - (a.thread_count || 0)).slice(0, 4);

  return (
    <div className="forum-sidebar space-y-4" data-testid="forum-sidebar">
      {forumMute && (
        <PremiumCard tone="gold" className="p-3 border-amber-500/30">
          <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold mb-1">Mute actif</div>
          <p className="text-xs text-zinc-400 italic">Publication désactivée jusqu'au {fmtDate(forumMute.until)}</p>
        </PremiumCard>
      )}
      <PremiumCard tone="gold" className="p-4">
        <div className="text-[9px] uppercase tracking-[0.3em] text-amber-400/80 font-bold mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" /> Tribune en chiffres
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border border-white/10 bg-black/25 py-2">
            <div className="font-mono-stat text-lg text-cyan-300">{totalThreads}</div>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500">Sujets</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 py-2">
            <div className="font-mono-stat text-lg text-amber-300">{categories.length}</div>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500">Salles</div>
          </div>
        </div>
      </PremiumCard>

      <PremiumCard tone="cyan" className="p-4">
        <label className="text-[9px] uppercase tracking-[0.3em] text-cyan-400/80 font-bold mb-2 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" /> Recherche
        </label>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Filtrer les sujets..."
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm"
          data-testid="forum-search"
        />
      </PremiumCard>

      {recent.length > 0 && (
        <PremiumCard tone="violet" className="p-4">
          <div className="text-[9px] uppercase tracking-[0.3em] text-violet-300/80 font-bold mb-3 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" /> Activité récente
          </div>
          <div className="space-y-2">
            {recent.map((t) => (
              <button
                key={t.thread_id}
                type="button"
                onClick={() => onOpenRecent(t)}
                className="w-full text-left rounded-lg border border-white/5 bg-black/20 px-2.5 py-2 hover:border-violet-500/30 transition-colors"
                data-testid={`forum-recent-${t.thread_id}`}
              >
                <div className="text-xs font-display font-semibold text-white truncate">{t.title}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{fmtDate(t.last_activity_at)}</div>
              </button>
            ))}
          </div>
        </PremiumCard>
      )}

      {hottest.length > 0 && (
        <PremiumCard tone="emerald" className="p-4">
          <div className="text-[9px] uppercase tracking-[0.3em] text-emerald-300/80 font-bold mb-3">Salles populaires</div>
          <div className="space-y-1.5">
            {hottest.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onOpenCat(c.id)}
                className="w-full flex justify-between text-xs text-zinc-300 hover:text-white py-1"
              >
                <span className="truncate">{c.name}</span>
                <span className="font-mono-stat text-cyan-400 shrink-0 ml-2">{c.thread_count}</span>
              </button>
            ))}
          </div>
        </PremiumCard>
      )}

      <PremiumCard tone="gold" className="p-4">
        <div className="text-[9px] uppercase tracking-[0.3em] text-amber-300/80 font-bold mb-2 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" /> Charte de la Tribune
        </div>
        <ul className="text-[11px] text-zinc-400 space-y-1.5 leading-relaxed">
          <li className="flex gap-2"><Shield className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" /> Respect et courtoisie entre héros.</li>
          <li className="flex gap-2"><Shield className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" /> Pas de spam ni contenu hors-sujet.</li>
          <li className="flex gap-2"><Shield className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" /> Exclusion forum ≠ ban du site (Conseil).</li>
        </ul>
      </PremiumCard>
    </div>
  );
}

function ThreadList({ category, query, forumMute, onBack, onOpen }) {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [cat, setCat] = useState(null);

  const load = async () => {
    const [t, c] = await Promise.all([
      api.get("/forum/threads", { params: { category } }),
      api.get("/forum/categories"),
    ]);
    setThreads(t.data);
    setCat(c.data.find((x) => x.id === category));
  };
  useEffect(() => { load(); }, [category]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => t.title?.toLowerCase().includes(q) || t.content?.toLowerCase().includes(q));
  }, [threads, query]);

  return (
    <>
      <nav className="forum-breadcrumb mb-4 text-xs text-zinc-500" aria-label="Fil d'Ariane">
        <button type="button" onClick={onBack} className="text-cyan-400 hover:text-cyan-300" data-testid="forum-back">
          Catégories
        </button>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">{cat?.name || category}</span>
      </nav>

      <div className="hub-page-header mb-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[9px] uppercase tracking-[0.25em] text-amber-400/70 font-bold">Catégorie</div>
            <h2 className="font-display font-black text-xl text-white">{cat?.name || category}</h2>
            {cat?.description && <p className="text-xs text-zinc-500 mt-1">{cat.description}</p>}
          </div>
          <PremiumButton
            variant="gold"
            size="sm"
            icon={Plus}
            onClick={() => {
              if (forumMute) {
                toast.error(`Vous êtes réduit au silence jusqu'au ${fmtDate(forumMute.until)}. Vous ne pouvez pas créer de sujet.`);
                return;
              }
              setShowNew(true);
            }}
            testid="open-new-thread"
          >
            Nouveau sujet
          </PremiumButton>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
        {filtered.length === 0 && (
          <div className="text-center text-zinc-500 italic py-14 text-sm">
            {query ? "Aucun sujet ne correspond à votre recherche" : "Aucun sujet — soyez le premier à prendre la parole"}
          </div>
        )}
        {filtered.map((t) => (
          <div key={t.thread_id} className="forum-thread-row flex items-center gap-0">
            <button
              type="button"
              onClick={() => onOpen(t.thread_id)}
              data-testid={`thread-${t.thread_id}`}
              className="flex flex-1 items-center gap-3 min-w-0 text-left bg-transparent border-0 p-0"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                {t.pinned ? <Pin className="w-3.5 h-3.5 text-yellow-400" /> : <MessageCircle className="w-3.5 h-3.5 text-zinc-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {t.locked && <Lock className="w-3 h-3 text-red-400 shrink-0" />}
                  <span className="font-display font-semibold text-sm text-white truncate">{t.title}</span>
                </div>
                <div className="text-[11px] text-zinc-500 flex items-center gap-2 flex-wrap">
                  <HeroName user={t.author} size="sm" />
                  <span>·</span>
                  <Clock className="w-3 h-3 inline" />
                  {fmtDate(t.created_at)}
                </div>
              </div>
              <div className="text-right text-[10px] font-mono-stat font-bold shrink-0 space-y-0.5">
                <div className="text-cyan-400 flex items-center gap-1 justify-end">
                  <MessageCircle className="w-3 h-3" /> {t.replies_count}
                </div>
                <div className="text-zinc-600 flex items-center gap-1 justify-end">
                  <Eye className="w-3 h-3" /> {t.views}
                </div>
              </div>
            </button>
            {user?.user_id && user.user_id !== t.user_id && (
              <div className="shrink-0 pr-3" onClick={(e) => e.stopPropagation()}>
                <ReportButton
                  targetType="forum_thread"
                  targetId={t.thread_id}
                  reportedUserId={t.user_id}
                  contextLabel={t.title}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showNew && (
          <NewThreadDialog category={category} onClose={() => setShowNew(false)} onCreated={async () => { setShowNew(false); await load(); }} />
        )}
      </AnimatePresence>
    </>
  );
}

function NewThreadDialog({ category, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const plain = stripHtml(contentHtml).trim();
    if (plain.length < 10) {
      toast.error("Le message doit contenir au moins 10 caractères");
      return;
    }
    setSaving(true);
    try {
      await api.post("/forum/threads", {
        category,
        title: title.trim(),
        content: plain,
        content_html: contentHtml,
      });
      toast.success("Sujet créé (+30 XP)");
      sfx.success();
      await onCreated();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.forum_muted) {
        toast.error(`Vous êtes réduit au silence jusqu'au ${fmtDate(detail.until)}. Création impossible.`);
      } else {
        toast.error(typeof detail === "string" ? detail : "Erreur lors de la création du sujet");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumModal open onClose={onClose} title="Ouvrir un débat" icon={Scroll} maxWidth="max-w-3xl" testid="new-thread-dialog">
      <form onSubmit={submit} className="p-5 space-y-4">
        <input
          value={title}
          required
          minLength={5}
          maxLength={120}
          placeholder="Titre éloquent..."
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm"
          data-testid="thread-title"
        />
        <HtmlEditor
          label="Contenu du sujet"
          hint="Mise en forme, émojis :sword: :crown:, images et liens"
          value={contentHtml}
          onChange={setContentHtml}
          minHeight={180}
          variant="forum"
          testid="thread-content-editor"
        />
        <PremiumButton type="submit" variant="gold" size="sm" disabled={saving} className="w-full" testid="thread-submit">
          Publier (+30 XP)
        </PremiumButton>
      </form>
    </PremiumModal>
  );
}

function ThreadView({ threadId, category, forumMute, onBack, onDeleted }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [replyHtml, setReplyHtml] = useState("");
  const [catName, setCatName] = useState(category);
  const [editThread, setEditThread] = useState(false);
  const [editReply, setEditReply] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editHtml, setEditHtml] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const isStaff = user?.role === "admin" || user?.role === "moderator";

  const load = async () => {
    const [r, c] = await Promise.all([
      api.get(`/forum/threads/${threadId}`),
      api.get("/forum/categories"),
    ]);
    setData(r.data);
    setCatName(c.data.find((x) => x.id === category)?.name || category);
  };
  useEffect(() => { load(); }, [threadId, category]);

  const reply = async (e) => {
    e.preventDefault();
    const plain = stripHtml(replyHtml).trim();
    if (!plain) return;
    try {
      await api.post(`/forum/threads/${threadId}/replies`, { content: plain, content_html: replyHtml });
      sfx.click();
      setReplyHtml("");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const togglePin = async () => { await api.post(`/forum/threads/${threadId}/pin`); load(); };
  const toggleLock = async () => { await api.post(`/forum/threads/${threadId}/lock`); load(); };
  const remove = async () => {
    if (!window.confirm("Supprimer ce sujet ?")) return;
    await api.delete(`/forum/threads/${threadId}`);
    toast.success("Sujet retiré");
    onDeleted();
  };
  const deleteReply = async (replyId) => {
    if (!window.confirm("Supprimer cette réponse ?")) return;
    await api.delete(`/forum/replies/${replyId}`);
    toast.success("Réponse supprimée");
    await load();
  };

  const openThreadEdit = () => {
    if (!data) return;
    setEditTitle(data.thread.title || "");
    setEditHtml(data.thread.content_html || data.thread.content || "");
    setEditThread(true);
  };

  const openReplyEdit = (r) => {
    setEditReply(r);
    setEditHtml(r.content_html || r.content || "");
    setEditTitle("");
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    const plain = stripHtml(editHtml).trim();
    if (plain.length < 2) {
      toast.error("Contenu trop court");
      return;
    }
    setSavingEdit(true);
    try {
      if (editReply) {
        await api.put(`/forum/replies/${editReply.reply_id}`, { content: plain, content_html: editHtml });
        toast.success("Réponse modifiée");
        setEditReply(null);
      } else {
        if (plain.length < 10) {
          toast.error("Message trop court");
          return;
        }
        await api.put(`/forum/threads/${threadId}`, {
          title: editTitle.trim(),
          content: plain,
          content_html: editHtml,
        });
        toast.success("Sujet modifié");
        setEditThread(false);
      }
      setEditHtml("");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    } finally {
      setSavingEdit(false);
    }
  };

  if (!data) {
    return <PremiumCard tone="cyan" className="p-12 text-center text-zinc-500">Chargement...</PremiumCard>;
  }

  const t = data.thread;
  const canDelete = isStaff || user?.user_id === t.user_id;

  return (
    <>
      <nav className="forum-breadcrumb mb-4 text-xs text-zinc-500">
        <button type="button" onClick={onBack} className="text-cyan-400 hover:text-cyan-300" data-testid="thread-back">
          {catName}
        </button>
        <span className="mx-2">/</span>
        <span className="text-zinc-300 truncate inline-block max-w-[12rem] align-bottom">{t.title}</span>
      </nav>

      <PremiumCard tone="gold" className="p-5 mb-4">
        <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
          <h1 className="font-display font-black text-2xl flex-1 min-w-0">
            {t.pinned && <Pin className="w-4 h-4 inline text-yellow-400 mr-1" />}
            {t.locked && <Lock className="w-4 h-4 inline text-red-400 mr-1" />}
            {t.title}
          </h1>
          <div className="flex gap-1 flex-wrap">
            {isStaff && (
              <>
                <button type="button" onClick={openThreadEdit} title="Modifier" className="p-1.5 rounded border border-white/10 text-cyan-400 hover:bg-white/[0.03]" data-testid="thread-edit">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={togglePin} title="Épingler" className="p-1.5 rounded border border-white/10 text-yellow-400 hover:bg-white/[0.03]" data-testid="thread-pin">
                  <Pin className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={toggleLock} title="Verrouiller" className="p-1.5 rounded border border-white/10 text-red-400 hover:bg-white/[0.03]" data-testid="thread-lock">
                  <Lock className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {canDelete && (
              <button type="button" onClick={remove} title="Supprimer" className="p-1.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/5" data-testid="thread-delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {user?.user_id && user.user_id !== t.user_id && (
              <ReportButton
                targetType="forum_thread"
                targetId={threadId}
                reportedUserId={t.user_id}
                contextLabel={t.title}
                className="p-1.5"
              />
            )}
          </div>
        </div>
        <div className="text-xs text-zinc-500 mb-3 flex flex-wrap gap-3 items-center">
          <span><HeroName user={t.author} size="sm" /></span>
          <span>· {fmtDate(t.created_at)}</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {t.views} vues</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {t.replies_count} réponses</span>
        </div>
        <ForumRichContent html={t.content_html} plain={t.content} />
        {isStaff && t.user_id !== user?.user_id && (
          <div className="mt-3 pt-2 border-t border-white/8">
            <ForumModPanel targetUser={t.author} onDone={load} />
          </div>
        )}
      </PremiumCard>

      <div className="space-y-3 mb-4" data-testid="replies-list">
        {data.replies.map((r) => (
          <PremiumCard key={r.reply_id} tone="cyan" testid={`reply-${r.reply_id}`}>
            <div className="flex justify-between items-start gap-2 mb-1.5">
              <div className="text-xs text-zinc-500"><HeroName user={r.author} size="sm" /> · {fmtDate(r.created_at)}</div>
              <div className="flex gap-1 items-center">
                {user?.user_id && user.user_id !== r.user_id && (
                  <ReportButton
                    targetType="forum_reply"
                    targetId={r.reply_id}
                    reportedUserId={r.user_id}
                    contextLabel={`Réponse de ${r.author?.username || "?"}`}
                  />
                )}
                {isStaff && (
                  <button type="button" onClick={() => openReplyEdit(r)} className="text-cyan-400 hover:text-cyan-300 p-1" title="Modifier">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
                {(isStaff || user?.user_id === r.user_id) && (
                  <button type="button" onClick={() => deleteReply(r.reply_id)} className="text-red-400 hover:text-red-300 p-1" title="Supprimer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <ForumRichContent html={r.content_html} plain={r.content} />
            {isStaff && r.user_id !== user?.user_id && (
              <div className="mt-3 pt-2 border-t border-white/8">
                <ForumModPanel
                  targetUser={r.author}
                  onDone={load}
                />
              </div>
            )}
          </PremiumCard>
        ))}
        {data.replies.length === 0 && (
          <PremiumCard tone="violet" className="text-center text-zinc-500 italic py-6">Soyez le premier à réagir</PremiumCard>
        )}
      </div>

      {!t.locked && forumMute && (
        <PremiumCard tone="gold" className="p-4 text-center text-sm text-amber-200/90 italic">
          Vous êtes en mute forum — lecture seule jusqu'au {fmtDate(forumMute.until)}.
          {forumMute.reason && <span className="block text-xs text-zinc-500 mt-1">Motif : {forumMute.reason}</span>}
        </PremiumCard>
      )}

      {!t.locked && !forumMute && (
        <PremiumCard tone="cyan" className="p-4">
          <form onSubmit={reply} className="space-y-3" data-testid="reply-form">
            <HtmlEditor
              label="Votre réponse"
              value={replyHtml}
              onChange={setReplyHtml}
              minHeight={120}
              variant="forum"
              testid="reply-editor"
            />
            <div className="flex justify-between items-center">
              <div className="text-[10px] text-zinc-500 italic">+10 XP par contribution</div>
              <PremiumButton type="submit" variant="cyan" size="sm" icon={Send} testid="reply-submit">
                Répondre
              </PremiumButton>
            </div>
          </form>
        </PremiumCard>
      )}
      {(editThread || editReply) && (
        <PremiumModal
          open
          onClose={() => { setEditThread(false); setEditReply(null); setEditHtml(""); }}
          title={editReply ? "Modifier la réponse" : "Modifier le sujet"}
          icon={Edit3}
          maxWidth="max-w-3xl"
          testid="forum-edit-modal"
        >
          <form onSubmit={saveEdit} className="p-5 space-y-4">
            {editThread && (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm"
                required
                minLength={5}
                maxLength={120}
                placeholder="Titre du sujet"
              />
            )}
            <HtmlEditor value={editHtml} onChange={setEditHtml} minHeight={140} label="Contenu" variant="forum" />
            <PremiumButton type="submit" variant="cyan" size="sm" disabled={savingEdit} className="w-full">
              Enregistrer
            </PremiumButton>
          </form>
        </PremiumModal>
      )}
    </>
  );
}
