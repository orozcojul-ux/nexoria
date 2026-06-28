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
import { useI18n } from "@/contexts/I18nContext";
import { translateApiError } from "@/lib/i18n-api";
import { PageShell, PremiumCard, PremiumButton, PremiumModal } from "@/components/ui-premium";
import HtmlEditor from "@/components/admin/HtmlEditor";
import ForumRichContent from "@/components/forum/ForumRichContent";
import TranslatableText from "@/components/content/TranslatableText";
import TranslatableContent from "@/components/content/TranslatableContent";
import { ReportButton } from "@/components/ReportContentModal";
import ForumBannedView from "@/components/forum/ForumBannedView";
import ForumModPanel from "@/components/forum/ForumModPanel";
import ForumAuthorName from "@/components/forum/ForumAuthorName";
import { sfx } from "@/lib/sfx";
import { stripHtml } from "@/lib/stripHtml";
import { usePageBanner } from "@/lib/page-banners";
import "@/pages/pages-hub.css";
import "@/pages/forum.css";

const FORUM_RULE_KEYS = [
  "forum.rule.respect",
  "forum.rule.onTopic",
  "forum.rule.noSpam",
  "forum.rule.noOffensive",
  "forum.rule.clearTitle",
];

function normalizeSearchText(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function threadMatchesQuery(thread, query) {
  const q = normalizeSearchText(query.trim());
  if (!q) return true;
  const haystack = normalizeSearchText(
    [
      thread.title,
      thread.content,
      stripHtml(thread.content_html || ""),
      thread.author?.username,
      thread.author?.display_name,
    ]
      .filter(Boolean)
      .join(" "),
  );
  return haystack.includes(q);
}

function getCategoryDescription(t, category) {
  const key = `forum.cat.${category}`;
  const result = t(key);
  return result !== key ? result : t("forum.defaultDescription");
}

function getCategoryName(t, category, fallback = "") {
  const key = `forum.catName.${category}`;
  const result = t(key);
  return result !== key ? result : fallback;
}

function ForumTopicTitle({ threadId, title, className = "" }) {
  return (
    <TranslatableText
      as="span"
      text={title}
      entityType="forum_thread"
      entityId={threadId}
      field="title"
      compact
      className={className}
    />
  );
}

export default function Forum() {
  const { t, fmtDate } = useI18n();
  const banner = usePageBanner("forum");
  const [searchParams, setSearchParams] = useSearchParams();
  const cat = searchParams.get("cat");
  const threadId = searchParams.get("thread");
  const [categories, setCategories] = useState([]);
  const [recent, setRecent] = useState([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
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
          toast.error(translateApiError(t, err, "forum.loadFailed"));
        }
      } finally {
        setAccessLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return undefined;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/forum/search", { params: { q, limit: 30 } });
        setSearchResults(data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const totalThreads = useMemo(
    () => categories.reduce((n, c) => n + (c.thread_count || 0), 0),
    [categories],
  );

  const q = query.trim();
  const topicsToShow = useMemo(() => {
    if (q.length >= 2) return searchResults;
    if (q.length === 1) return recent.filter((tpc) => threadMatchesQuery(tpc, q));
    return recent;
  }, [q, recent, searchResults]);

  if (accessLoading) {
    return (
      <PageShell wide testid="forum-page" banner={banner}>
        <PremiumCard tone="cyan" className="p-12 text-center text-zinc-500 italic">{t("forum.loading")}</PremiumCard>
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
          kicker: t("forum.kicker"),
          title: getCategoryName(t, cat, catObj.name),
          subtitle: getCategoryDescription(t, cat) || banner.subtitle,
        }
      : banner;
    return (
      <PageShell wide testid="forum-page" banner={catBanner}>
        <ThreadList category={cat} forumMute={forumMute} onBack={goCats} onOpen={(id) => goThread(cat, id)} />
      </PageShell>
    );
  }

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return (
    <PageShell wide testid="forum-page" banner={banner}>
      <div className="forum-portal-stat">
        <Hash className="w-3 h-3" /> {t("forum.categoriesCount", { cats: categories.length, threads: totalThreads })}
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
                  <span className="forum-cat-name">{getCategoryName(t, c.id, c.name)}</span>
                  <span className="forum-cat-desc">{getCategoryDescription(t, c.id)}</span>
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
              placeholder={t("forum.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="forum-search"
            />
            <span className="forum-activity-pill"><BookOpen className="w-3 h-3" /> {t("forum.threads")}</span>
            <span className="forum-activity-pill"><TrendingUp className="w-3 h-3" /> {t("forum.filter.recent")}</span>
          </div>

          <div className="forum-activity-head">
            <span className="forum-activity-head-label">
              <Flame className="w-3.5 h-3.5" /> {t("forum.recent")}
            </span>
          </div>

          <div className="forum-activity-list">
            {searchLoading && q.length >= 2 ? (
              <div className="forum-activity-empty">{t("forum.loading")}</div>
            ) : topicsToShow.length === 0 ? (
              <div className="forum-activity-empty">
                {q ? t("forum.noSearchResults") : t("forum.noRecentTopics")}
              </div>
            ) : (
              topicsToShow.map((tpc, i) => {
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
                      <span className="forum-topic-title">
                        <ForumTopicTitle threadId={tpc.thread_id} title={tpc.title} />
                      </span>
                      <span className="forum-topic-sub">{getCategoryName(t, tpc.category, c?.name) || t("forum.defaultCategory")}</span>
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
  const { t, fmtDate } = useI18n();
  const hottest = [...categories].sort((a, b) => (b.thread_count || 0) - (a.thread_count || 0)).slice(0, 4);
  const recentFiltered = useMemo(
    () => (query.trim() ? recent.filter((tpc) => threadMatchesQuery(tpc, query)) : recent),
    [recent, query],
  );

  return (
    <div className="forum-sidebar space-y-4" data-testid="forum-sidebar">
      {forumMute && (
        <PremiumCard tone="gold" className="p-3 border-amber-500/30">
          <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold mb-1">{t("forum.muteActive")}</div>
          <p className="text-xs text-zinc-400 italic">{t("forum.mutedUntil", { date: fmtDate(forumMute.until) })}</p>
        </PremiumCard>
      )}
      <PremiumCard tone="gold" className="p-4">
        <div className="text-[9px] uppercase tracking-[0.3em] text-amber-400/80 font-bold mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" /> {t("forum.statsPanelTitle")}
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border border-white/10 bg-black/25 py-2">
            <div className="font-mono-stat text-lg text-cyan-300">{totalThreads}</div>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500">{t("forum.stat.topics")}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 py-2">
            <div className="font-mono-stat text-lg text-amber-300">{categories.length}</div>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500">{t("forum.stat.rooms")}</div>
          </div>
        </div>
      </PremiumCard>

      <PremiumCard tone="cyan" className="p-4">
        <label className="text-[9px] uppercase tracking-[0.3em] text-cyan-400/80 font-bold mb-2 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" /> {t("forum.searchLabel")}
        </label>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t("forum.filterTopics")}
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm"
          data-testid="forum-search"
        />
      </PremiumCard>

      {recent.length > 0 && (
        <PremiumCard tone="violet" className="p-4">
          <div className="text-[9px] uppercase tracking-[0.3em] text-violet-300/80 font-bold mb-3 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" /> {t("forum.recent")}
          </div>
          <div className="space-y-2">
            {recentFiltered.length === 0 && query.trim() ? (
              <div className="text-xs text-zinc-500 italic">{t("forum.noSearchResults")}</div>
            ) : recentFiltered.map((tpc) => (
              <button
                key={tpc.thread_id}
                type="button"
                onClick={() => onOpenRecent(tpc)}
                className="w-full text-left rounded-lg border border-white/5 bg-black/20 px-2.5 py-2 hover:border-violet-500/30 transition-colors"
                data-testid={`forum-recent-${tpc.thread_id}`}
              >
                <div className="text-xs font-display font-semibold text-white truncate">
                  <ForumTopicTitle threadId={tpc.thread_id} title={tpc.title} />
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{fmtDate(tpc.last_activity_at)}</div>
              </button>
            ))}
          </div>
        </PremiumCard>
      )}

      {hottest.length > 0 && (
        <PremiumCard tone="emerald" className="p-4">
          <div className="text-[9px] uppercase tracking-[0.3em] text-emerald-300/80 font-bold mb-3">{t("forum.popularRooms")}</div>
          <div className="space-y-1.5">
            {hottest.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onOpenCat(c.id)}
                className="w-full flex justify-between text-xs text-zinc-300 hover:text-white py-1"
              >
                <span className="truncate">{getCategoryName(t, c.id, c.name)}</span>
                <span className="font-mono-stat text-cyan-400 shrink-0 ml-2">{c.thread_count}</span>
              </button>
            ))}
          </div>
        </PremiumCard>
      )}

      <PremiumCard tone="gold" className="p-4">
        <div className="text-[9px] uppercase tracking-[0.3em] text-amber-300/80 font-bold mb-2 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" /> {t("forum.charterTitle")}
        </div>
        <ul className="text-[11px] text-zinc-400 space-y-1.5 leading-relaxed">
          <li className="flex gap-2"><Shield className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" /> {t("forum.charter.respect")}</li>
          <li className="flex gap-2"><Shield className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" /> {t("forum.charter.noSpam")}</li>
          <li className="flex gap-2"><Shield className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" /> {t("forum.charter.exclusion")}</li>
        </ul>
      </PremiumCard>
    </div>
  );
}

function ThreadList({ category, forumMute, onBack, onOpen }) {
  const { t, fmtDate } = useI18n();
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [cat, setCat] = useState(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [mode, setMode] = useState("all"); // all | pinned | recent | unanswered

  const load = async () => {
    try {
      const [{ data: threadData }, { data: catData }] = await Promise.all([
        api.get("/forum/threads", { params: { category } }),
        api.get("/forum/categories"),
      ]);
      setThreads(threadData || []);
      setCat((catData || []).find((x) => x.id === category));
    } catch {
      setThreads([]);
    }
  };
  useEffect(() => { load(); }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return undefined;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/forum/search", { params: { q, category, limit: 50 } });
        setSearchResults(data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, category]);

  const filtered = useMemo(() => {
    const q = search.trim();
    let list = q.length >= 2 ? searchResults : threads;
    if (q && q.length < 2) list = list.filter((thread) => threadMatchesQuery(thread, q));
    if (mode === "pinned") list = list.filter((thread) => thread.pinned);
    else if (mode === "unanswered") list = list.filter((thread) => (thread.replies_count || 0) === 0);
    else if (mode === "recent") list = [...list].sort((a, b) => new Date(b.last_activity_at || b.created_at) - new Date(a.last_activity_at || a.created_at));
    return list;
  }, [threads, search, searchResults, mode]);

  const description = getCategoryDescription(t, category);
  const pinned = useMemo(() => threads.filter((th) => th.pinned), [threads]);
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
    if (!user) { toast.error(t("forum.loginToCreate")); return; }
    if (forumMute) {
      toast.error(t("forum.mutedUntilCreate", { date: fmtDate(forumMute.until) }));
      return;
    }
    setShowNew(true);
  };

  const FILTERS = [
    { id: "all", label: t("forum.filter.all") },
    { id: "pinned", label: t("forum.filter.pinned") },
    { id: "recent", label: t("forum.filter.recent") },
    { id: "unanswered", label: t("forum.filter.unanswered") },
  ];

  return (
    <>
      {/* Breadcrumb */}
      <nav className="forum-crumb" aria-label={t("forum.breadcrumb")}>
        <button type="button" onClick={onBack} className="forum-crumb-back" data-testid="forum-back">
          {t("forum.portalBack")}
        </button>
        <span className="forum-crumb-sep">/</span>
        <span className="forum-crumb-cur">{getCategoryName(t, category, cat?.name) || category}</span>
      </nav>

      <div className="forum-cat-grid">
        {/* ─── LEFT : topics ─── */}
        <div className="forum-activity" data-testid="forum-topics-panel">
          <div className="forum-topics-bar">
            <input
              className="forum-topics-search"
              placeholder={t("forum.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="forum-cat-search"
            />
            <button type="button" className="forum-create" onClick={openCreate} data-testid="open-new-thread">
              <Plus className="w-3.5 h-3.5" /> {t("forum.createTopic")}
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
              <Flame className="w-3.5 h-3.5" /> {t("forum.recentTopics")}
            </span>
            <span className="forum-panel-count">{t("forum.topicCount", { count: filtered.length })}</span>
          </div>

          <div className="forum-activity-list">
            {searchLoading && search.trim().length >= 2 ? (
              <div className="forum-activity-empty">{t("forum.loading")}</div>
            ) : filtered.length === 0 ? (
              <div className="forum-activity-empty">
                {search || mode !== "all"
                  ? t("forum.noSearchResults")
                  : t("forum.noTopicsInSection")}
              </div>
            ) : (
              filtered.map((th) => {
                const isNew = th.created_at && (Date.now() - new Date(th.created_at).getTime()) < 86400000;
                return (
                  <div key={th.thread_id} className="forum-topic-line" data-testid={`thread-${th.thread_id}`}>
                    <button
                      type="button"
                      onClick={() => onOpen(th.thread_id)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left bg-transparent border-0 p-0"
                      style={{ cursor: "pointer" }}
                    >
                      <span className="forum-topic-line-ico">
                        {th.pinned
                          ? <Pin className="w-4 h-4" style={{ color: "#f0ca6a" }} />
                          : <MessageCircle className="w-4 h-4" style={{ color: "#c89a3c" }} />}
                      </span>
                      <span className="forum-topic-line-body">
                        <span className="forum-topic-line-titlerow">
                          <span className="forum-topic-line-title">
                            <TranslatableText
                              as="span"
                              text={th.title}
                              entityType="forum_thread"
                              entityId={th.thread_id}
                              field="title"
                              compact
                            />
                          </span>
                          {th.pinned && <span className="forum-badge forum-badge--pin"><Pin className="w-2.5 h-2.5" /> {t("forum.pinned")}</span>}
                          {th.locked && <span className="forum-badge forum-badge--lock"><Lock className="w-2.5 h-2.5" /> {t("forum.badge.closed")}</span>}
                          {isNew && !th.pinned && <span className="forum-badge forum-badge--new">{t("forum.badge.new")}</span>}
                        </span>
                        <span className="forum-topic-line-sub">
                          <ForumAuthorName author={th.author} size="sm" />
                          <span className="forum-meta-muted forum-crumb-sep">·</span>
                          <Clock className="w-3 h-3 forum-meta-muted" />
                          <span className="forum-meta-muted">{fmtDate(th.created_at)}</span>
                        </span>
                      </span>
                      <span className="forum-topic-line-meta">
                        <span className="forum-topic-count">
                          <MessageCircle className="w-3 h-3" /> {th.replies_count || 0}
                        </span>
                        <span className="forum-topic-date">
                          <Eye className="w-3 h-3 inline mr-0.5" />{th.views || 0}
                        </span>
                      </span>
                    </button>
                    {user?.user_id && user.user_id !== th.user_id && (
                      <div className="shrink-0 pl-2" onClick={(e) => e.stopPropagation()}>
                        <ReportButton
                          targetType="forum_thread"
                          targetId={th.thread_id}
                          reportedUserId={th.user_id}
                          contextLabel={th.title}
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
            <div className="forum-side-head"><BookOpen className="w-3.5 h-3.5" /> {t("forum.about")}</div>
            <div className="forum-side-body">
              <p className="forum-side-desc">{description}</p>
            </div>
          </div>

          {/* Rules */}
          <div className="forum-side-panel">
            <div className="forum-side-head"><Shield className="w-3.5 h-3.5" /> {t("forum.rules")}</div>
            <div className="forum-side-body">
              {FORUM_RULE_KEYS.map((key) => (
                <div key={key} className="forum-rule-item"><Shield />{t(key)}</div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="forum-side-panel">
            <div className="forum-side-head"><TrendingUp className="w-3.5 h-3.5" /> {t("forum.stats")}</div>
            <div className="forum-side-body">
              <div className="forum-stat-line"><span className="forum-stat-line-label">{t("forum.stat.topics")}</span><span className="forum-stat-line-val">{stats.topics}</span></div>
              <div className="forum-stat-line"><span className="forum-stat-line-label">{t("forum.stat.messages")}</span><span className="forum-stat-line-val">{stats.messages}</span></div>
              <div className="forum-stat-line"><span className="forum-stat-line-label">{t("forum.stat.heroes")}</span><span className="forum-stat-line-val">{stats.heroes}</span></div>
              <div className="forum-stat-line"><span className="forum-stat-line-label">{t("forum.lastActivity")}</span><span className="forum-stat-line-val" style={{ fontSize: "0.62rem" }}>{stats.lastActivity ? fmtDate(stats.lastActivity) : "—"}</span></div>
            </div>
          </div>

          {/* Pinned */}
          {pinned.length > 0 && (
            <div className="forum-side-panel">
              <div className="forum-side-head"><Pin className="w-3.5 h-3.5" /> {t("forum.pinnedTopics")}</div>
              <div className="forum-side-body">
                {pinned.slice(0, 5).map((th) => (
                  <button key={th.thread_id} type="button" className="forum-pin-mini" onClick={() => onOpen(th.thread_id)}>
                    <Pin className="w-3 h-3 shrink-0" style={{ color: "#f0ca6a" }} />
                    <span className="forum-pin-mini-title">
                      <ForumTopicTitle threadId={th.thread_id} title={th.title} />
                    </span>
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
  const { t, fmtDate } = useI18n();
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const plain = stripHtml(contentHtml).trim();
    if (plain.length < 10) {
      toast.error(t("forum.messageTooShort"));
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
      toast.success(t("forum.topicCreated"));
      sfx.success();
      await onCreated();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.forum_muted) {
        toast.error(t("forum.mutedCreateFailed", { date: fmtDate(detail.until) }));
      } else {
        toast.error(typeof detail === "string" ? detail : t("forum.createFailed"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <PremiumModal open onClose={onClose} title={t("forum.openDebate")} icon={Scroll} maxWidth="max-w-3xl" testid="new-thread-dialog">
      <form onSubmit={submit} className="p-5 space-y-4">
        <input
          value={title}
          required
          minLength={5}
          maxLength={120}
          placeholder={t("forum.eloquentTitle")}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm"
          data-testid="thread-title"
        />
        <HtmlEditor
          label={t("forum.topicContent")}
          hint={t("forum.contentHint")}
          value={contentHtml}
          onChange={setContentHtml}
          minHeight={180}
          variant="forum"
          testid="thread-content-editor"
        />
        <PremiumButton type="submit" variant="gold" size="sm" disabled={saving} className="w-full" testid="thread-submit">
          {t("forum.publishWithXp")}
        </PremiumButton>
      </form>
    </PremiumModal>
  );
}

function ThreadView({ threadId, category, forumMute, onBack, onDeleted }) {
  const { t, fmtDate } = useI18n();
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
    const catRow = c.data.find((x) => x.id === category);
    setCatName(getCategoryName(t, category, catRow?.name) || category);
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
      const detail = err.response?.data?.detail;
      if (detail?.forum_muted) {
        toast.error(t("forum.mutedUntilReply", { date: fmtDate(detail.until) }));
      } else {
        toast.error(typeof detail === "string" ? detail : t("forum.errorGeneric"));
      }
    }
  };

  const togglePin = async () => { await api.post(`/forum/threads/${threadId}/pin`); load(); };
  const toggleLock = async () => { await api.post(`/forum/threads/${threadId}/lock`); load(); };
  const remove = async () => {
    if (!window.confirm(t("forum.deleteTopicConfirm"))) return;
    await api.delete(`/forum/threads/${threadId}`);
    toast.success(t("forum.topicRemoved"));
    onDeleted();
  };
  const deleteReply = async (replyId) => {
    if (!window.confirm(t("forum.deleteReplyConfirm"))) return;
    await api.delete(`/forum/replies/${replyId}`);
    toast.success(t("forum.replyRemoved"));
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
      toast.error(t("forum.contentTooShort"));
      return;
    }
    setSavingEdit(true);
    try {
      if (editReply) {
        await api.put(`/forum/replies/${editReply.reply_id}`, { content: plain, content_html: editHtml });
        toast.success(t("forum.replyEdited"));
        setEditReply(null);
      } else {
        if (plain.length < 10) {
          toast.error(t("forum.messageTooShortEdit"));
          return;
        }
        await api.put(`/forum/threads/${threadId}`, {
          title: editTitle.trim(),
          content: plain,
          content_html: editHtml,
        });
        toast.success(t("forum.topicEdited"));
        setEditThread(false);
      }
      setEditHtml("");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.detail || t("forum.errorGeneric"));
    } finally {
      setSavingEdit(false);
    }
  };

  if (!data) {
    return <PremiumCard tone="cyan" className="p-12 text-center text-zinc-500">{t("forum.loadingThread")}</PremiumCard>;
  }

  const thread = data.thread;
  const canDelete = isStaff || user?.user_id === thread.user_id;

  return (
    <>
      <nav className="forum-breadcrumb mb-4 text-xs text-zinc-500">
        <button type="button" onClick={onBack} className="text-cyan-400 hover:text-cyan-300" data-testid="thread-back">
          {catName}
        </button>
        <span className="mx-2">/</span>
        <span className="text-zinc-300 truncate inline-block max-w-[12rem] align-bottom">
          <TranslatableText
            as="span"
            text={thread.title}
            entityType="forum_thread"
            entityId={thread.thread_id}
            field="title"
            compact
          />
        </span>
      </nav>

      <PremiumCard tone="gold" className="p-5 mb-4">
        <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
          <h1 className="font-display font-black text-2xl flex-1 min-w-0">
            {thread.pinned && <Pin className="w-4 h-4 inline text-yellow-400 mr-1" />}
            {thread.locked && <Lock className="w-4 h-4 inline text-red-400 mr-1" />}
            <TranslatableText
              as="span"
              text={thread.title}
              entityType="forum_thread"
              entityId={thread.thread_id}
              field="title"
            />
          </h1>
          <div className="flex gap-1 flex-wrap">
            {isStaff && (
              <>
                <button type="button" onClick={openThreadEdit} title={t("common.edit")} className="p-1.5 rounded border border-white/10 text-cyan-400 hover:bg-white/[0.03]" data-testid="thread-edit">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={togglePin} title={t("forum.pinAction")} className="p-1.5 rounded border border-white/10 text-yellow-400 hover:bg-white/[0.03]" data-testid="thread-pin">
                  <Pin className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={toggleLock} title={t("forum.lockAction")} className="p-1.5 rounded border border-white/10 text-red-400 hover:bg-white/[0.03]" data-testid="thread-lock">
                  <Lock className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {canDelete && (
              <button type="button" onClick={remove} title={t("common.delete")} className="p-1.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/5" data-testid="thread-delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {user?.user_id && user.user_id !== thread.user_id && (
              <ReportButton
                targetType="forum_thread"
                targetId={threadId}
                reportedUserId={thread.user_id}
                contextLabel={thread.title}
                className="p-1.5"
              />
            )}
          </div>
        </div>
        <div className="text-xs mb-3 flex flex-wrap gap-3 items-center">
          <ForumAuthorName author={thread.author} size="sm" />
          <span className="forum-meta-muted">· {fmtDate(thread.created_at)}</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {t("forum.viewsWithCount", { count: thread.views })}</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {t("forum.repliesWithCount", { count: thread.replies_count })}</span>
        </div>
        <TranslatableContent
          html={thread.content_html}
          plain={thread.content}
          entityType="forum_thread"
          entityId={thread.thread_id}
          field="content"
        />
        {isStaff && thread.user_id !== user?.user_id && (
          <div className="mt-3 pt-2 border-t border-white/8">
            <ForumModPanel targetUser={thread.author} onDone={load} />
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
                    contextLabel={t("forum.replyReportContext", { username: r.author?.username || "?" })}
                  />
                )}
                {isStaff && (
                  <button type="button" onClick={() => openReplyEdit(r)} className="text-cyan-400 hover:text-cyan-300 p-1" title={t("common.edit")}>
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
                {(isStaff || user?.user_id === r.user_id) && (
                  <button type="button" onClick={() => deleteReply(r.reply_id)} className="text-red-400 hover:text-red-300 p-1" title={t("common.delete")}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <TranslatableContent
              html={r.content_html}
              plain={r.content}
              entityType="forum_reply"
              entityId={r.reply_id}
              field="content"
            />
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
          <PremiumCard tone="violet" className="text-center text-zinc-500 italic py-6">{t("forum.firstToReply")}</PremiumCard>
        )}
      </div>

      {!thread.locked && forumMute && (
        <PremiumCard tone="gold" className="p-4 text-center text-sm text-amber-200/90 italic">
          {t("forum.mutedReadOnly", { date: fmtDate(forumMute.until) })}
          {forumMute.reason && <span className="block text-xs text-zinc-500 mt-1">{t("forum.muteReason", { reason: forumMute.reason })}</span>}
        </PremiumCard>
      )}

      {!thread.locked && !forumMute && (
        <PremiumCard tone="cyan" className="p-4">
          <form onSubmit={reply} className="space-y-3" data-testid="reply-form">
            <HtmlEditor
              label={t("forum.yourReply")}
              value={replyHtml}
              onChange={setReplyHtml}
              minHeight={120}
              variant="forum"
              testid="reply-editor"
            />
            <div className="flex justify-between items-center">
              <div className="text-[10px] text-zinc-500 italic">{t("forum.xpPerReply")}</div>
              <PremiumButton type="submit" variant="cyan" size="sm" icon={Send} testid="reply-submit">
                {t("forum.reply")}
              </PremiumButton>
            </div>
          </form>
        </PremiumCard>
      )}
      {(editThread || editReply) && (
        <PremiumModal
          open
          onClose={() => { setEditThread(false); setEditReply(null); setEditHtml(""); }}
          title={editReply ? t("forum.editReplyTitle") : t("forum.editTopicTitle")}
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
                placeholder={t("forum.titlePlaceholder")}
              />
            )}
            <HtmlEditor value={editHtml} onChange={setEditHtml} minHeight={140} label={t("forum.contentLabel")} variant="forum" />
            <PremiumButton type="submit" variant="cyan" size="sm" disabled={savingEdit} className="w-full">
              {t("common.save")}
            </PremiumButton>
          </form>
        </PremiumModal>
      )}
    </>
  );
}
