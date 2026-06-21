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
import ForumAuthorName from "@/components/forum/ForumAuthorName";
import { sfx } from "@/lib/sfx";
import { stripHtml } from "@/lib/stripHtml";
import { usePageBanner } from "@/lib/page-banners";
import "@/pages/pages-hub.css";
import "@/pages/forum.css";

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
    const catObj = categories.find((c) => c.id === cat);
    const catBanner = catObj
      ? {
          ...banner,
          kicker: "Tribune de NEXORIA",
          title: catObj.name,
          subtitle: catObj.description || CATEGORY_DESCRIPTIONS[cat] || banner.subtitle,
        }
      : banner;
    return (
      <PageShell wide testid="forum-page" banner={catBanner}>
        <ThreadList category={cat} forumMute={forumMute} onBack={goCats} onOpen={(id) => goThread(cat, id)} />
      </PageShell>
    );
  }

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const q = query.trim().toLowerCase();
  const recentFiltered = q
    ? recent.filter((tpc) => tpc.title?.toLowerCase().includes(q))
    : recent;

  return (
    <PageShell wide testid="forum-page" banner={banner}>
      <div className="forum-portal-stat">
        <Hash className="w-3 h-3" /> {categories.length} catégories · {totalThreads} sujets
      </div>

      <div className="forum-portal">
        {/* ─── LEFT : categories ─── */}
        <div className="forum-cats">
          {categories.map((c, i) => {
            const Icon = Lucide[c.icon] || Lucide.MessageCircle;
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => goThreads(c.id)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="forum-cat-btn"
                data-testid={`forum-cat-${c.id}`}
              >
                <span className="forum-cat-ico"><Icon /></span>
                <span className="forum-cat-text">
                  <span className="forum-cat-name">{c.name}</span>
                  <span className="forum-cat-desc">{c.description}</span>
                </span>
                <span className="forum-cat-count">
                  {c.thread_count || 0}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* ─── RIGHT : recent activity panel ─── */}
        <div className="forum-activity" data-testid="forum-activity">
          <div className="forum-activity-bar">
            <input
              className="forum-activity-search"
              placeholder="Rechercher un sujet…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="forum-search"
            />
            <span className="forum-activity-pill"><BookOpen className="w-3 h-3" /> Sujets</span>
            <span className="forum-activity-pill"><TrendingUp className="w-3 h-3" /> Récents</span>
          </div>

          <div className="forum-activity-head">
            <span className="forum-activity-head-label">
              <Flame className="w-3.5 h-3.5" /> Activité récente
            </span>
          </div>

          <div className="forum-activity-list">
            {recentFiltered.length === 0 ? (
              <div className="forum-activity-empty">
                {q ? "Aucun sujet ne correspond à votre recherche." : "Aucun sujet récent — ouvrez le premier débat."}
              </div>
            ) : (
              recentFiltered.map((tpc, i) => {
                const c = catMap[tpc.category];
                const TIcon = Lucide[c?.icon] || MessageCircle;
                return (
                  <button
                    key={tpc.thread_id}
                    type="button"
                    onClick={() => goThread(tpc.category, tpc.thread_id)}
                    className={`forum-topic-row ${i === 0 ? "forum-topic-row--lead" : ""}`}
                    data-testid={`forum-recent-${tpc.thread_id}`}
                  >
                    <span className="forum-topic-ico"><TIcon /></span>
                    <span className="forum-topic-body">
                      <span className="forum-topic-title">{tpc.title}</span>
                      <span className="forum-topic-sub">{c?.name || "Tribune"}</span>
                    </span>
                    <span className="forum-topic-meta">
                      <span className="forum-topic-count">
                        <MessageCircle className="w-3 h-3" /> {tpc.replies_count ?? 0}
                      </span>
                      <span className="forum-topic-date">{fmtDate(tpc.last_activity_at)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PageShell>
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

const CATEGORY_DESCRIPTIONS = {
  "salle-commune": "La Salle commune est l'espace principal d'échange entre les héros du Nexus. Discutez librement, présentez-vous et partagez vos aventures.",
  "strategies": "Partagez vos tactiques, compositions, conseils de classes et théories de combat pour préparer les futurs défis du Royaume.",
  "mythes": "Explorez le lore de NEXORIA, les récits anciens, les prophéties, les théories et les chroniques écrites par la communauté.",
  "comptoir": "Discutez des objets, badges, reliques, valeurs, échanges et opportunités commerciales du Nexus.",
  "recrutement": "Présentez votre ordre, recrutez de nouveaux membres ou trouvez une guilde prête à vous accueillir.",
  "conseil": "Posez vos questions, trouvez de l'aide, consultez les guides et accompagnez les nouveaux héros dans leurs premiers pas.",
};

const FORUM_RULES = [
  "Respecter les autres héros",
  "Rester dans le thème de la catégorie",
  "Pas de spam",
  "Pas de contenu offensant",
  "Utiliser un titre clair",
];

function ThreadList({ category, forumMute, onBack, onOpen }) {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [cat, setCat] = useState(null);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("all"); // all | pinned | recent | unanswered

  const load = async () => {
    const [t, c] = await Promise.all([
      api.get("/forum/threads", { params: { category } }),
      api.get("/forum/categories"),
    ]);
    setThreads(t.data);
    setCat(c.data.find((x) => x.id === category));
  };
  useEffect(() => { load(); }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = threads;
    if (q) list = list.filter((t) => t.title?.toLowerCase().includes(q) || t.content?.toLowerCase().includes(q));
    if (mode === "pinned") list = list.filter((t) => t.pinned);
    else if (mode === "unanswered") list = list.filter((t) => (t.replies_count || 0) === 0);
    else if (mode === "recent") list = [...list].sort((a, b) => new Date(b.last_activity_at || b.created_at) - new Date(a.last_activity_at || a.created_at));
    return list;
  }, [threads, search, mode]);

  const description = cat?.description || CATEGORY_DESCRIPTIONS[category] || "Espace de discussion de la Tribune de NEXORIA.";
  const pinned = useMemo(() => threads.filter((t) => t.pinned), [threads]);
  const stats = useMemo(() => {
    const totalReplies = threads.reduce((s, t) => s + (t.replies_count || 0), 0);
    const lastActivity = threads.reduce((m, t) => {
      const d = t.last_activity_at || t.created_at;
      return !m || (d && d > m) ? d : m;
    }, null);
    const heroes = new Set(threads.map((t) => t.user_id).filter(Boolean)).size;
    return { topics: threads.length, messages: totalReplies + threads.length, lastActivity, heroes };
  }, [threads]);

  const openCreate = () => {
    if (!user) { toast.error("Connecte-toi pour créer un sujet dans le Nexus."); return; }
    if (forumMute) {
      toast.error(`Vous êtes réduit au silence jusqu'au ${fmtDate(forumMute.until)}. Vous ne pouvez pas créer de sujet.`);
      return;
    }
    setShowNew(true);
  };

  const FILTERS = [
    { id: "all", label: "Tous" },
    { id: "pinned", label: "Épinglés" },
    { id: "recent", label: "Récents" },
    { id: "unanswered", label: "Sans réponse" },
  ];

  return (
    <>
      {/* Breadcrumb */}
      <nav className="forum-crumb" aria-label="Fil d'Ariane">
        <button type="button" onClick={onBack} className="forum-crumb-back" data-testid="forum-back">
          ← Portail communautaire
        </button>
        <span className="forum-crumb-sep">/</span>
        <span className="forum-crumb-cur">{cat?.name || category}</span>
      </nav>

      <div className="forum-cat-grid">
        {/* ─── LEFT : topics ─── */}
        <div className="forum-activity" data-testid="forum-topics-panel">
          <div className="forum-topics-bar">
            <input
              className="forum-topics-search"
              placeholder="Rechercher un sujet…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="forum-cat-search"
            />
            <button type="button" className="forum-create" onClick={openCreate} data-testid="open-new-thread">
              <Plus className="w-3.5 h-3.5" /> Créer un sujet
            </button>
          </div>
          <div className="forum-filters">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setMode(f.id)}
                className={`forum-filter ${mode === f.id ? "forum-filter--active" : ""}`}
                data-testid={`forum-filter-${f.id}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="forum-activity-head">
            <span className="forum-activity-head-label">
              <Flame className="w-3.5 h-3.5" /> Sujets récents
            </span>
            <span className="forum-panel-count">{filtered.length} sujet{filtered.length > 1 ? "s" : ""}</span>
          </div>

          <div className="forum-activity-list">
            {filtered.length === 0 ? (
              <div className="forum-activity-empty">
                {search || mode !== "all"
                  ? "Aucun sujet ne correspond à votre recherche."
                  : "Aucun sujet n'a encore été ouvert dans cette section du Nexus."}
              </div>
            ) : (
              filtered.map((t) => {
                const isNew = t.created_at && (Date.now() - new Date(t.created_at).getTime()) < 86400000;
                return (
                  <div key={t.thread_id} className="forum-topic-line" data-testid={`thread-${t.thread_id}`}>
                    <button
                      type="button"
                      onClick={() => onOpen(t.thread_id)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left bg-transparent border-0 p-0"
                      style={{ cursor: "pointer" }}
                    >
                      <span className="forum-topic-line-ico">
                        {t.pinned
                          ? <Pin className="w-4 h-4" style={{ color: "#f0ca6a" }} />
                          : <MessageCircle className="w-4 h-4" style={{ color: "#c89a3c" }} />}
                      </span>
                      <span className="forum-topic-line-body">
                        <span className="forum-topic-line-titlerow">
                          <span className="forum-topic-line-title">{t.title}</span>
                          {t.pinned && <span className="forum-badge forum-badge--pin"><Pin className="w-2.5 h-2.5" /> Épinglé</span>}
                          {t.locked && <span className="forum-badge forum-badge--lock"><Lock className="w-2.5 h-2.5" /> Fermé</span>}
                          {isNew && !t.pinned && <span className="forum-badge forum-badge--new">Nouveau</span>}
                        </span>
                        <span className="forum-topic-line-sub">
                          <ForumAuthorName author={t.author} size="sm" />
                          <span className="forum-meta-muted forum-crumb-sep">·</span>
                          <Clock className="w-3 h-3 forum-meta-muted" />
                          <span className="forum-meta-muted">{fmtDate(t.created_at)}</span>
                        </span>
                      </span>
                      <span className="forum-topic-line-meta">
                        <span className="forum-topic-count">
                          <MessageCircle className="w-3 h-3" /> {t.replies_count || 0}
                        </span>
                        <span className="forum-topic-date">
                          <Eye className="w-3 h-3 inline mr-0.5" />{t.views || 0}
                        </span>
                      </span>
                    </button>
                    {user?.user_id && user.user_id !== t.user_id && (
                      <div className="shrink-0 pl-2" onClick={(e) => e.stopPropagation()}>
                        <ReportButton
                          targetType="forum_thread"
                          targetId={t.thread_id}
                          reportedUserId={t.user_id}
                          contextLabel={t.title}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── RIGHT : category info ─── */}
        <aside>
          {/* About */}
          <div className="forum-side-panel">
            <div className="forum-side-head"><BookOpen className="w-3.5 h-3.5" /> À propos</div>
            <div className="forum-side-body">
              <p className="forum-side-desc">{description}</p>
            </div>
          </div>

          {/* Rules */}
          <div className="forum-side-panel">
            <div className="forum-side-head"><Shield className="w-3.5 h-3.5" /> Règles</div>
            <div className="forum-side-body">
              {FORUM_RULES.map((r) => (
                <div key={r} className="forum-rule-item"><Shield />{r}</div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="forum-side-panel">
            <div className="forum-side-head"><TrendingUp className="w-3.5 h-3.5" /> Statistiques</div>
            <div className="forum-side-body">
              <div className="forum-stat-line"><span className="forum-stat-line-label">Sujets</span><span className="forum-stat-line-val">{stats.topics}</span></div>
              <div className="forum-stat-line"><span className="forum-stat-line-label">Messages</span><span className="forum-stat-line-val">{stats.messages}</span></div>
              <div className="forum-stat-line"><span className="forum-stat-line-label">Héros actifs</span><span className="forum-stat-line-val">{stats.heroes}</span></div>
              <div className="forum-stat-line"><span className="forum-stat-line-label">Dernière activité</span><span className="forum-stat-line-val" style={{ fontSize: "0.62rem" }}>{stats.lastActivity ? fmtDate(stats.lastActivity) : "—"}</span></div>
            </div>
          </div>

          {/* Pinned */}
          {pinned.length > 0 && (
            <div className="forum-side-panel">
              <div className="forum-side-head"><Pin className="w-3.5 h-3.5" /> Sujets épinglés</div>
              <div className="forum-side-body">
                {pinned.slice(0, 5).map((t) => (
                  <button key={t.thread_id} type="button" className="forum-pin-mini" onClick={() => onOpen(t.thread_id)}>
                    <Pin className="w-3 h-3 shrink-0" style={{ color: "#f0ca6a" }} />
                    <span className="forum-pin-mini-title">{t.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
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
        <div className="text-xs mb-3 flex flex-wrap gap-3 items-center">
          <ForumAuthorName author={t.author} size="sm" />
          <span className="forum-meta-muted">· {fmtDate(t.created_at)}</span>
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
              <div className="text-xs flex flex-wrap items-center gap-1">
                <ForumAuthorName author={r.author} size="sm" />
                <span className="forum-meta-muted">· {fmtDate(r.created_at)}</span>
              </div>
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
