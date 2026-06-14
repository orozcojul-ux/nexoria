/**
 * NEXORIA — Tableau de bord (Vue d'ensemble).
 * Premium dashboard: 5 KPI stats + interactive Nexus map + social feed + sidebar widgets.
 */
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Heart, MessageCircle, Send, Loader2, Flame, Feather, ScrollText, Trash2,
  Users as UsersIcon, Eye, Calendar, ShieldCheck, Sparkles, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import { sfx } from "@/lib/sfx";
import HeroName from "@/components/HeroName";
import NexusMapWidget from "@/components/NexusMapWidget";
import { PremiumSection, PremiumCard, PremiumButton } from "@/components/ui-premium";

function StatCard({ icon: Icon, label, value, sub, color, testid }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="relative rounded-2xl border p-4 overflow-hidden backdrop-blur"
      style={{
        background: `linear-gradient(135deg, ${color}1A 0%, rgba(15,8,32,0.85) 100%)`,
        borderColor: `${color}55`,
        boxShadow: `0 0 22px ${color}22, inset 0 0 10px ${color}11`,
      }}
      data-testid={testid}
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-50 pointer-events-none" style={{ background: color }} />
      <div className="relative flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}25`, boxShadow: `0 0 14px ${color}55` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] uppercase tracking-[0.35em] font-bold text-zinc-400">{label}</div>
          <div className="font-mono-stat font-black text-2xl text-white mt-0.5">{value}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5 truncate">{sub}</div>
        </div>
      </div>
    </motion.div>
  );
}

function PostCard({ post, onReact, onOpenComments, comments, onComment, openId, currentUser, onDelete }) {
  const [text, setText] = useState("");
  const isOpen = openId === post.post_id;
  const canDelete = currentUser && (
    currentUser.user_id === post.user_id ||
    currentUser.role === "admin" ||
    currentUser.role === "moderator"
  );

  return (
    <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-4 border-b border-violet-500/10 last:border-0" data-testid={`feed-post-${post.post_id}`}>
      <div className="flex gap-3">
        <Link to={`/profile/${post.author?.username || ''}`} className="shrink-0">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-display font-bold text-sm ring-1 ring-violet-400/30">
              {post.author?.avatar_url ? <img src={post.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : (post.author?.username?.[0] || "?").toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0A0A0E] border border-violet-400/40 flex items-center justify-center text-[8px] font-mono-stat text-violet-300 font-bold">
              {post.author?.level || 1}
            </div>
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
            <Link to={`/profile/${post.author?.username || ''}`} className="hover:opacity-80 transition-opacity">
              <HeroName user={post.author} size="base" />
            </Link>
            <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-cyan-400">{post.author?.class_name}</span>
            <span className="text-xs text-zinc-600">· {new Date(post.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">{post.content}</div>
          <div className="mt-3 flex items-center gap-5 text-xs text-zinc-400">
            <button onClick={() => onReact(post.post_id)} data-testid={`react-${post.post_id}`}
              className="flex items-center gap-1.5 hover:text-pink-400 transition-colors group">
              <Heart className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-mono-stat">{post.reactions}</span>
            </button>
            <button onClick={() => onOpenComments(post.post_id)} data-testid={`comments-${post.post_id}`}
              className="flex items-center gap-1.5 hover:text-cyan-300 transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span className="font-mono-stat">{post.comments_count}</span>
            </button>
            {canDelete && (
              <button onClick={() => onDelete(post.post_id)} data-testid={`delete-post-${post.post_id}`}
                className="flex items-center gap-1.5 text-zinc-600 hover:text-red-400 transition-colors ml-auto">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {isOpen && (
            <div className="mt-3 pl-3 border-l border-violet-400/20 space-y-2">
              {comments.map((c) => (
                <div key={c.comment_id} className="text-sm">
                  <span className="font-bold text-cyan-300">{c.author?.username}</span>
                  <span className="text-zinc-300 ml-2">{c.content}</span>
                </div>
              ))}
              <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; onComment(post.post_id, text); setText(""); }} className="flex gap-2 mt-2">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Votre réponse..."
                  className="flex-1 bg-white/5 border border-violet-400/20 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-violet-400/60"
                  data-testid={`comment-input-${post.post_id}`} />
                <button type="submit" className="px-3 py-1.5 rounded bg-violet-500/20 border border-violet-400/40 text-violet-200 text-xs font-bold" data-testid={`comment-submit-${post.post_id}`}>Sceller</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default function Feed() {
  const { user, refresh } = useAuth();
  const { presence } = useNexusSocket();
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [comments, setComments] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [boss, setBoss] = useState(null);
  const [xpPerPost, setXpPerPost] = useState(null);
  const [stats, setStats] = useState({
    heroes: 0, heroes_online: 0, guilds: 0, events: 0,
    new_signups: 0, visits_today: 0, server_stability: 99.9,
  });

  const loadFeed = async () => {
    const { data } = await api.get("/feed");
    setPosts(data);
  };

  useEffect(() => {
    loadFeed();
    api.get("/leaderboard/xp").then((r) => setLeaderboard(r.data.slice(0, 5))).catch(() => {});
    api.get("/boss").then((r) => setBoss(r.data)).catch(() => {});
    api.get("/game/xp-rules").then((r) => setXpPerPost(r.data.post)).catch(() => {});
    api.get("/stats/public").then((r) => setStats((s) => ({ ...s, ...r.data }))).catch(() => {});
  }, []);

  // Heroes online — pull from WebSocket presence (real-time)
  const heroesOnline = presence?.total ?? stats.heroes_online;

  const publish = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      const { data } = await api.post("/posts", { content });
      sfx.success();
      const gained = data?.xp_gained ?? xpPerPost ?? 0;
      toast.success(`Votre voix résonne dans le royaume (+${gained} XP)`);
      setContent("");
      await loadFeed();
      await refresh();
    } catch (err) {
      console.error("Publish failed", err);
      toast.error("Le scribe est troublé...");
    }
    finally { setPosting(false); }
  };

  const react = async (postId) => {
    try { await api.post(`/posts/${postId}/react`); sfx.click(); await loadFeed(); }
    catch (err) { console.error("React failed", err); }
  };

  const openComments = async (postId) => {
    if (openId === postId) { setOpenId(null); return; }
    setOpenId(postId);
    const { data } = await api.get(`/posts/${postId}/comments`);
    setComments(data);
  };

  const addComment = async (postId, text) => {
    await api.post(`/posts/${postId}/comments`, { content: text });
    sfx.click();
    const { data } = await api.get(`/posts/${postId}/comments`);
    setComments(data);
    await loadFeed();
    await refresh();
  };

  const deletePost = async (postId) => {
    if (!window.confirm("Supprimer définitivement cette publication ?")) return;
    try {
      await api.delete(`/posts/${postId}`);
      toast.success("Publication retirée");
      sfx.click();
      await loadFeed();
    } catch (e) { toast.error(e.response?.data?.detail || "Suppression impossible"); }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6" data-testid="feed-page">
      {/* === HEADER === */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-violet-300 font-bold mb-1">Tableau de bord</div>
          <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight">
            Bonjour, <span className="text-gradient">{user?.username}</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1 italic">Voici l'état du Nexus aujourd'hui — les Voiles te sont favorables.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-green-400/40 bg-green-500/10">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: "0 0 8px rgba(74,222,128,0.9)" }} />
          <span className="text-[10px] uppercase tracking-[0.3em] text-green-200 font-bold">Nexus Online · Live</span>
        </div>
      </div>

      {/* === 5 STAT CARDS === */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="dashboard-stats">
        <StatCard icon={Sparkles}    label="Héros connectés"   value={heroesOnline}            sub="En temps réel"        color="#00E5FF" testid="stat-heroes-online" />
        <StatCard icon={Eye}         label="Visites aujourd'hui" value={stats.visits_today}    sub="Dernières 24h"        color="#9D4CDD" testid="stat-visits" />
        <StatCard icon={Calendar}    label="Événements actifs" value={stats.events}            sub="En cours"             color="#F59E0B" testid="stat-events" />
        <StatCard icon={ShieldCheck} label="Stabilité serveur" value={`${stats.server_stability}%`} sub="Disponibilité"   color="#10B981" testid="stat-stability" />
        <StatCard icon={UsersIcon}   label="Nouveaux inscrits" value={stats.new_signups}       sub="Dernières 24h"        color="#EC4899" testid="stat-signups" />
      </div>

      {/* === NEXUS MAP === */}
      <NexusMapWidget />

      {/* === MAIN GRID === */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left column — Composer + Feed */}
        <div className="lg:col-span-8 space-y-6">
          {/* COMPOSER */}
          <PremiumCard tone="cyan" hover={false} testid="composer-card">
            <form onSubmit={publish}>
              <div className="flex items-center gap-3 mb-3">
                <ScrollText className="w-4 h-4 text-cyan-300" />
                <div className="text-[10px] uppercase tracking-[0.35em] text-cyan-300 font-bold">Carrefour des voix · Compose</div>
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-display font-bold shrink-0 ring-1 ring-cyan-400/30">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Que se passe-t-il dans ton royaume, ${user?.username || "héros"} ?`}
                  rows={3}
                  maxLength={1000}
                  className="flex-1 bg-transparent text-white placeholder-zinc-500 focus:outline-none resize-none"
                  data-testid="post-composer"
                />
              </div>
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-cyan-500/10">
                <span className="text-xs font-mono-stat text-zinc-500 flex items-center gap-1">
                  <Feather className="w-3 h-3" /> {content.length}/1000{xpPerPost ? ` · +${xpPerPost} XP` : ""}
                </span>
                <PremiumButton type="submit" variant="cyan" size="md" icon={posting ? Loader2 : Send} disabled={posting || !content.trim()} testid="post-submit-btn">
                  Sceller
                </PremiumButton>
              </div>
            </form>
          </PremiumCard>

          {/* FEED */}
          <PremiumSection title="Activité de la communauté" subtitle={`${posts.length} parchemin(s)`} icon={ScrollText} tone="cyan">
            <PremiumCard hover={false} tone="cyan" className="!p-0">
              <div className="px-5 py-2">
                {posts.length === 0 && (
                  <div className="py-16 text-center text-zinc-500 italic">
                    Le silence règne… sois la première voix.
                  </div>
                )}
                {posts.map((p) => (
                  <PostCard
                    key={p.post_id}
                    post={p}
                    onReact={react}
                    onOpenComments={openComments}
                    comments={openId === p.post_id ? comments : []}
                    onComment={addComment}
                    openId={openId}
                    currentUser={user}
                    onDelete={deletePost}
                  />
                ))}
              </div>
            </PremiumCard>
          </PremiumSection>
        </div>

        {/* Right sidebar */}
        <aside className="lg:col-span-4 space-y-4">
          {boss && (
            <PremiumCard tone="red" testid="world-boss-widget">
              <div className="text-[10px] uppercase tracking-[0.3em] text-red-300 font-bold flex items-center gap-1.5 mb-1">
                <Flame className="w-3 h-3" /> Menace cosmique
              </div>
              <div className="font-display font-black text-lg text-white">{boss.name}</div>
              <div className="text-xs text-zinc-300 mt-1 leading-snug italic line-clamp-3">{boss.description}</div>
              <div className="mt-3">
                <div className="flex justify-between font-mono-stat text-xs mb-1">
                  <span className="text-zinc-400 uppercase tracking-widest">Assaut commun</span>
                  <span className="text-red-300">{boss.progress}/{boss.target}</span>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-red-500/30">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-red-500"
                    style={{
                      width: `${Math.min(100, (boss.progress / boss.target) * 100)}%`,
                      boxShadow: "0 0 10px rgba(239,68,68,0.8)",
                    }}
                  />
                </div>
              </div>
              <Link to="/events" className="block mt-3 text-[10px] uppercase tracking-[0.3em] font-bold text-red-300 hover:text-red-200">
                Voir l'événement →
              </Link>
            </PremiumCard>
          )}

          <PremiumCard tone="gold" testid="mini-leaderboard">
            <div className="text-[10px] uppercase tracking-[0.3em] text-yellow-300 font-bold mb-3 flex items-center gap-1.5">
              <Trophy className="w-3 h-3" /> Cinq plus brillants
            </div>
            <div className="space-y-1.5">
              {leaderboard.map((u, i) => (
                <Link
                  to={`/profile/${u.username}`}
                  key={u.user_id}
                  className="flex items-center gap-2 py-1.5 hover:bg-white/[0.04] rounded px-2 transition-all"
                  data-testid={`mini-leaderboard-${i}`}
                >
                  <span className={`font-mono-stat font-black w-5 text-sm ${i === 0 ? "text-yellow-300" : i === 1 ? "text-zinc-300" : i === 2 ? "text-orange-400" : "text-zinc-500"}`}>#{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-xs flex items-center justify-center font-bold ring-1 ring-violet-400/30">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : u.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm flex-1 truncate font-display text-white">{u.username}</span>
                  <span className="font-mono-stat text-xs text-cyan-300">{u.level}</span>
                </Link>
              ))}
            </div>
            <Link to="/leaderboards" className="block mt-3 text-[10px] uppercase tracking-[0.3em] font-bold text-yellow-300 hover:text-yellow-200">
              Hall des Légendes →
            </Link>
          </PremiumCard>
        </aside>
      </div>
    </div>
  );
}
