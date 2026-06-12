import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Send, Loader2, Flame, Feather, ScrollText } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import { RuneSeal, RuneDivider } from "@/components/Ornaments";
import HeroName from "@/components/HeroName";

function PostCard({ post, onReact, onOpenComments, comments, onComment, openId }) {
  const [text, setText] = useState("");
  const isOpen = openId === post.post_id;

  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-5 border-b border-cyan-500/10 last:border-0" data-testid={`feed-post-${post.post_id}`}>
      <div className="flex gap-3">
        <Link to={`/profile/${post.author?.username || ''}`} className="shrink-0">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-display font-bold text-sm ring-1 ring-cyan-500/30">
              {post.author?.avatar_url ? <img src={post.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : (post.author?.username?.[0] || "?").toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0A0A0E] border border-cyan-500/40 flex items-center justify-center text-[8px] font-mono-stat text-cyan-300 font-bold">
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
          <div className="text-zinc-200 leading-relaxed whitespace-pre-wrap break-words scroll-paragraph">{post.content}</div>

          <div className="mt-3 flex items-center gap-5 text-xs text-zinc-400">
            <button onClick={() => onReact(post.post_id)} data-testid={`react-${post.post_id}`}
              className="flex items-center gap-1.5 hover:text-pink-400 transition-colors group">
              <Heart className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-mono-stat">{post.reactions}</span>
            </button>
            <button onClick={() => onOpenComments(post.post_id)} data-testid={`comments-${post.post_id}`}
              className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span className="font-mono-stat">{post.comments_count}</span>
            </button>
          </div>

          {isOpen && (
            <div className="mt-4 pl-3 border-l-2 border-cyan-500/20 space-y-2.5" data-testid={`comments-list-${post.post_id}`}>
              {comments.map((c) => (
                <div key={c.comment_id} className="text-sm">
                  <HeroName user={c.author} size="sm" />
                  <span className="text-zinc-300 ml-2">{c.content}</span>
                </div>
              ))}
              <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onComment(post.post_id, text); setText(""); } }} className="flex gap-2 mt-2">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ajouter votre voix..."
                  className="flex-1 bg-[#0A0A0E] border border-cyan-500/20 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500/60 italic placeholder:text-zinc-600"
                  data-testid={`comment-input-${post.post_id}`} />
                <button type="submit" className="px-3 rounded-md border border-cyan-500/40 text-cyan-300 hover:border-cyan-500/70 text-sm" data-testid={`comment-submit-${post.post_id}`}>
                  <Send className="w-3 h-3" />
                </button>
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
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [comments, setComments] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [boss, setBoss] = useState(null);
  const [xpPerPost, setXpPerPost] = useState(null);

  const loadFeed = async () => {
    const { data } = await api.get("/feed");
    setPosts(data);
  };

  useEffect(() => {
    loadFeed();
    api.get("/leaderboard/xp").then((r) => setLeaderboard(r.data.slice(0, 5)));
    api.get("/boss").then((r) => setBoss(r.data));
    api.get("/game/xp-rules").then((r) => setXpPerPost(r.data.post)).catch((err) => console.warn("xp-rules", err?.message));
  }, []);

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

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="feed-page">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-2">
          <RuneSeal icon={ScrollText} color="#00E5FF" size={40} />
        </div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-bold mb-1">Carrefour des voix</div>
        <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight">
          Place <span className="text-gradient">Publique</span>
        </h1>
        <RuneDivider className="mt-4 max-w-md mx-auto" />
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          {/* Composer — like a parchment scroll */}
          <div className="parchment rounded-2xl p-4 mb-6 relative">
            <form onSubmit={publish}>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-display font-bold shrink-0 ring-1 ring-cyan-500/30">
                  {user?.username[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`Que se passe-t-il dans votre royaume, ${user?.username}?`}
                    rows={3}
                    maxLength={1000}
                    className="w-full bg-transparent text-white placeholder-zinc-500 focus:outline-none resize-none scroll-paragraph"
                    data-testid="post-composer"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-cyan-500/10">
                <span className="text-xs font-mono-stat text-zinc-500 flex items-center gap-1">
                  <Feather className="w-3 h-3" /> {content.length}/1000{xpPerPost ? ` · +${xpPerPost} XP par missive` : ""}
                </span>
                <button type="submit" disabled={posting || !content.trim()}
                  className="px-5 py-2 rounded-md border border-cyan-500/50 text-cyan-300 font-bold font-display tracking-wide hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-40 transition-all flex items-center gap-2"
                  data-testid="post-submit-btn">
                  {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Sceller
                </button>
              </div>
            </form>
          </div>

          {/* Feed */}
          <div className="glass rounded-2xl px-4 sm:px-6 py-2 mist relative">
            {posts.length === 0 && (
              <div className="py-16 text-center text-zinc-500 italic">
                Le silence règne... soyez la première voix.
              </div>
            )}
            {posts.map((p) => (
              <PostCard key={p.post_id} post={p} onReact={react} onOpenComments={openComments} comments={openId === p.post_id ? comments : []} onComment={addComment} openId={openId} />
            ))}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-4">
          {boss && (
            <div className="rune-border rounded-2xl p-4 relative overflow-hidden" data-testid="world-boss-widget">
              <div className="text-[10px] uppercase tracking-[0.3em] text-red-300 font-bold flex items-center gap-1.5 mb-1">
                <Flame className="w-3 h-3" /> Menace cosmique
              </div>
              <div className="font-display font-bold text-lg ancient-text">{boss.name}</div>
              <div className="text-xs text-zinc-300 mt-1 leading-snug italic">{boss.description}</div>
              <div className="mt-3">
                <div className="flex justify-between font-mono-stat text-xs mb-1">
                  <span className="text-zinc-400 uppercase tracking-widest">Assaut commun</span>
                  <span className="text-red-300">{boss.progress}/{boss.target}</span>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-red-500/20">
                  <div className="h-full bg-gradient-to-r from-red-600 via-violet-500 to-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" style={{ width: `${Math.min(100, (boss.progress / boss.target) * 100)}%` }} />
                </div>
              </div>
            </div>
          )}

          <div className="glass rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-3 font-display">Cinq plus brillants</div>
            <div className="space-y-1.5">
              {leaderboard.map((u, i) => (
                <Link to={`/profile/${u.username}`} key={u.user_id} className="flex items-center gap-2 py-1.5 hover:bg-white/[0.03] rounded px-2 transition-all" data-testid={`mini-leaderboard-${i}`}>
                  <span className={`font-mono-stat font-bold w-5 text-sm ${i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-orange-400" : "text-zinc-500"}`}>#{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-xs flex items-center justify-center font-bold">{u.username[0]?.toUpperCase()}</div>
                  <span className="text-sm flex-1 truncate font-display">{u.username}</span>
                  <span className="font-mono-stat text-xs text-cyan-300">{u.level}</span>
                </Link>
              ))}
            </div>
            <Link to="/leaderboards" className="block mt-3 text-xs text-cyan-400 hover:text-cyan-300 uppercase tracking-widest font-bold">Voir le Hall des Légendes →</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
