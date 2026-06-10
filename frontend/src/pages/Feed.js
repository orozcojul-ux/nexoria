import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Send, Loader2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";

function PostCard({ post, onReact, onOpenComments, comments, onComment, openId }) {
  const [text, setText] = useState("");
  const isOpen = openId === post.post_id;

  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-5 border-b border-white/5" data-testid={`feed-post-${post.post_id}`}>
      <div className="flex gap-3">
        <Link to={`/profile/${post.author?.username || ''}`} className="shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-bold text-sm">
            {post.author?.avatar_url ? <img src={post.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : (post.author?.username?.[0] || "?").toUpperCase()}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
            <Link to={`/profile/${post.author?.username || ''}`} className="font-display font-bold text-white hover:text-cyan-400">{post.author?.username || "Anonyme"}</Link>
            <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-400">{post.author?.class_name}</span>
            <span className="font-mono-stat text-xs text-zinc-500">Niv. {post.author?.level || 1}</span>
            <span className="text-xs text-zinc-600">· {new Date(post.created_at).toLocaleString("fr-FR")}</span>
          </div>
          <div className="text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">{post.content}</div>

          <div className="mt-3 flex items-center gap-5 text-xs text-zinc-400">
            <button onClick={() => onReact(post.post_id)} data-testid={`react-${post.post_id}`}
              className="flex items-center gap-1 hover:text-pink-400 transition-colors group">
              <Heart className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-mono-stat">{post.reactions}</span>
            </button>
            <button onClick={() => onOpenComments(post.post_id)} data-testid={`comments-${post.post_id}`}
              className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span className="font-mono-stat">{post.comments_count}</span>
            </button>
          </div>

          {isOpen && (
            <div className="mt-4 pl-3 border-l border-cyan-500/20 space-y-2" data-testid={`comments-list-${post.post_id}`}>
              {comments.map((c) => (
                <div key={c.comment_id} className="text-sm">
                  <span className="font-bold text-cyan-300">{c.author?.username}</span>
                  <span className="text-zinc-300 ml-2">{c.content}</span>
                </div>
              ))}
              <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onComment(post.post_id, text); setText(""); } }} className="flex gap-2 mt-2">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Commenter..."
                  className="flex-1 bg-[#0A0A0E] border border-white/10 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500/50"
                  data-testid={`comment-input-${post.post_id}`} />
                <button type="submit" className="px-3 rounded-md border border-cyan-500/30 text-cyan-300 hover:border-cyan-500/60 text-sm" data-testid={`comment-submit-${post.post_id}`}>
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

  const loadFeed = async () => {
    const { data } = await api.get("/feed");
    setPosts(data);
  };

  useEffect(() => {
    loadFeed();
    api.get("/leaderboard/xp").then((r) => setLeaderboard(r.data.slice(0, 5)));
    api.get("/boss").then((r) => setBoss(r.data));
  }, []);

  const publish = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      await api.post("/posts", { content });
      sfx.success();
      toast.success("Publication créée +20 XP");
      setContent("");
      await loadFeed();
      await refresh();
    } catch { toast.error("Erreur"); }
    finally { setPosting(false); }
  };

  const react = async (postId) => {
    try {
      await api.post(`/posts/${postId}/react`);
      sfx.click();
      await loadFeed();
    } catch {}
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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 grid lg:grid-cols-12 gap-6" data-testid="feed-page">
      <div className="lg:col-span-8">
        {/* Composer */}
        <div className="glass rounded-2xl p-4 mb-6">
          <form onSubmit={publish}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Que se passe-t-il dans votre royaume, ${user?.username}?`}
              rows={3}
              maxLength={1000}
              className="w-full bg-transparent text-white placeholder-zinc-500 focus:outline-none resize-none"
              data-testid="post-composer"
            />
            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <span className="text-xs font-mono-stat text-zinc-500">{content.length}/1000 · +20 XP</span>
              <button type="submit" disabled={posting || !content.trim()}
                className="px-5 py-2 rounded-md border border-cyan-500/50 text-cyan-300 font-bold hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-40 transition-all flex items-center gap-2"
                data-testid="post-submit-btn">
                {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Publier
              </button>
            </div>
          </form>
        </div>

        {/* Feed */}
        <div className="glass rounded-2xl px-4 sm:px-6 py-2">
          {posts.length === 0 && <div className="py-12 text-center text-zinc-500">Aucun message. Soyez le premier héros à parler.</div>}
          {posts.map((p) => (
            <PostCard key={p.post_id} post={p} onReact={react} onOpenComments={openComments} comments={openId === p.post_id ? comments : []} onComment={addComment} openId={openId} />
          ))}
        </div>
      </div>

      {/* Sidebar widgets */}
      <aside className="lg:col-span-4 space-y-4">
        {boss && (
          <div className="glass glass-violet rounded-2xl p-4" data-testid="world-boss-widget">
            <div className="text-[10px] uppercase tracking-[0.3em] text-violet-300 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Boss Mondial
            </div>
            <div className="font-display font-bold text-lg mt-1">{boss.name}</div>
            <div className="text-xs text-zinc-400 mt-1 leading-snug">{boss.description}</div>
            <div className="mt-3">
              <div className="flex justify-between font-mono-stat text-xs mb-1">
                <span className="text-zinc-400">Progression</span>
                <span className="text-violet-300">{boss.progress}/{boss.target}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-red-500" style={{ width: `${Math.min(100, (boss.progress / boss.target) * 100)}%` }} />
              </div>
            </div>
          </div>
        )}

        <div className="glass rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">Top 5 XP</div>
          <div className="space-y-1.5">
            {leaderboard.map((u, i) => (
              <Link to={`/profile/${u.username}`} key={u.user_id} className="flex items-center gap-2 py-1 hover:bg-white/5 rounded px-2 transition-all" data-testid={`mini-leaderboard-${i}`}>
                <span className={`font-mono-stat font-bold w-5 text-sm ${i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-orange-400" : "text-zinc-500"}`}>#{i + 1}</span>
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-xs flex items-center justify-center font-bold">{u.username[0]?.toUpperCase()}</div>
                <span className="text-sm flex-1 truncate">{u.username}</span>
                <span className="font-mono-stat text-xs text-cyan-300">Niv.{u.level}</span>
              </Link>
            ))}
          </div>
          <Link to="/leaderboards" className="block mt-3 text-xs text-cyan-400 hover:underline">Voir tous les classements →</Link>
        </div>
      </aside>
    </div>
  );
}
