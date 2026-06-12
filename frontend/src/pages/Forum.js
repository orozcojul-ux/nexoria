import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Lucide from "lucide-react";
import { Scroll, ChevronLeft, MessageCircle, Eye, Pin, Lock, Trash2, Send, X, Plus, Clock } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { RuneSeal, RuneDivider } from "@/components/Ornaments";
import StarField from "@/components/StarField";
import HeroName from "@/components/HeroName";
import { sfx } from "@/lib/sfx";

const fmtDate = (s) => s ? new Date(s).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export default function Forum() {
  const [view, setView] = useState({ kind: "cats" }); // cats | threads | thread
  const [categories, setCategories] = useState([]);

  useEffect(() => { api.get("/forum/categories").then((r) => setCategories(r.data)); }, []);

  if (view.kind === "threads") return <ThreadList category={view.category} onBack={() => setView({ kind: "cats" })} onOpen={(thread_id) => setView({ kind: "thread", thread_id, category: view.category })} />;
  if (view.kind === "thread") return <ThreadView threadId={view.thread_id} onBack={() => setView({ kind: "threads", category: view.category })} />;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 relative" data-testid="forum-page">
      <StarField density={50} />
      <div className="text-center mb-8 relative">
        <div className="flex justify-center mb-3"><RuneSeal icon={Scroll} color="#EAB308" size={48} /></div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-yellow-400 font-bold mb-1">Tribune</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">Forum des <span className="text-gradient">Héros</span></h1>
        <p className="text-zinc-400 text-sm mt-2 italic scroll-paragraph max-w-2xl mx-auto">« Là où les voix s'élèvent et où les idées forgent l'histoire. »</p>
        <RuneDivider className="mt-5 max-w-md mx-auto" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {categories.map((c) => {
          const Icon = Lucide[c.icon] || Lucide.MessageCircle;
          return (
            <motion.button key={c.id} onClick={() => setView({ kind: "threads", category: c.id })}
              whileHover={{ scale: 1.02 }} className="glass rounded-2xl p-5 text-left border-2 border-yellow-500/10 hover:border-yellow-500/40 transition-all"
              data-testid={`forum-cat-${c.id}`}>
              <Icon className="w-8 h-8 text-yellow-400 mb-3" style={{ filter: "drop-shadow(0 0 8px rgba(234,179,8,0.5))" }} />
              <h3 className="font-display font-bold text-lg ancient-text mb-1">{c.name}</h3>
              <p className="text-xs text-zinc-400 italic mb-3">{c.description}</p>
              <div className="flex justify-between text-[10px] font-mono-stat font-bold uppercase tracking-widest">
                <span className="text-cyan-400">{c.thread_count} sujet{c.thread_count > 1 ? "s" : ""}</span>
                <span className="text-zinc-500">{c.last_activity_at ? `act. ${fmtDate(c.last_activity_at)}` : "—"}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function ThreadList({ category, onBack, onOpen }) {
  const [threads, setThreads] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [cat, setCat] = useState(null);

  const load = async () => {
    const [t, c] = await Promise.all([
      api.get(`/forum/threads`, { params: { category } }),
      api.get("/forum/categories"),
    ]);
    setThreads(t.data);
    setCat(c.data.find((x) => x.id === category));
  };
  useEffect(() => { load(); }, [category]);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="thread-list">
      <button onClick={onBack} className="mb-4 text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-sm" data-testid="forum-back">
        <ChevronLeft className="w-4 h-4" /> Catégories
      </button>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-black text-3xl ancient-text">{cat?.name || category}</h2>
        <button onClick={() => setShowNew(true)} data-testid="open-new-thread"
          className="px-4 py-2 rounded border border-yellow-500/50 text-yellow-300 font-bold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau sujet
        </button>
      </div>
      <div className="space-y-2">
        {threads.length === 0 && <div className="text-center text-zinc-500 italic py-12">Aucun sujet — soyez le premier à prendre la parole</div>}
        {threads.map((t) => (
          <button key={t.thread_id} onClick={() => onOpen(t.thread_id)} data-testid={`thread-${t.thread_id}`}
            className="w-full glass rounded-xl p-4 text-left hover:bg-white/[0.03] transition-all flex gap-3 items-start">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                {t.pinned && <Pin className="w-3 h-3 text-yellow-400" />}
                {t.locked && <Lock className="w-3 h-3 text-red-400" />}
                <span className="font-display font-bold truncate">{t.title}</span>
              </div>
              <div className="text-xs text-zinc-500 flex items-center gap-2 flex-wrap">
                <HeroName user={t.author} size="sm" /> · <Clock className="w-3 h-3 inline" /> {fmtDate(t.created_at)}
              </div>
            </div>
            <div className="text-right text-[10px] font-mono-stat font-bold uppercase tracking-widest shrink-0">
              <div className="text-cyan-400 flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {t.replies_count}</div>
              <div className="text-zinc-500 flex items-center gap-1"><Eye className="w-3 h-3" /> {t.views}</div>
            </div>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {showNew && <NewThreadDialog category={category} onClose={() => setShowNew(false)} onCreated={async () => { setShowNew(false); await load(); }} />}
      </AnimatePresence>
    </div>
  );
}

function NewThreadDialog({ category, onClose, onCreated }) {
  const [form, setForm] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/forum/threads", { category, ...form });
      toast.success("Sujet créé (+30 XP)");
      sfx.success();
      await onCreated();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
    finally { setSaving(false); }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="rune-border rounded-2xl p-6 max-w-xl w-full space-y-3" data-testid="new-thread-dialog">
        <div className="flex justify-between">
          <h3 className="font-display font-black text-xl text-gradient">Ouvrir un débat</h3>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-zinc-500" /></button>
        </div>
        <input value={form.title} required minLength={5} maxLength={120} placeholder="Titre éloquent..."
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="thread-title" />
        <textarea value={form.content} required minLength={10} maxLength={5000} rows={6}
          placeholder="Exposez votre propos..." onChange={(e) => setForm({ ...form, content: e.target.value })}
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="thread-content" />
        <button type="submit" disabled={saving}
          className="w-full py-2 rounded border border-yellow-500/50 text-yellow-300 font-bold text-sm disabled:opacity-40" data-testid="thread-submit">
          Publier (+30 XP)
        </button>
      </motion.form>
    </motion.div>
  );
}

function ThreadView({ threadId, onBack }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [text, setText] = useState("");
  const isStaff = user?.role === "admin" || user?.role === "moderator";

  const load = async () => {
    const r = await api.get(`/forum/threads/${threadId}`);
    setData(r.data);
  };
  useEffect(() => { load(); }, [threadId]);

  const reply = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api.post(`/forum/threads/${threadId}/replies`, { content: text.trim() });
      sfx.click();
      setText(""); await load();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };

  const togglePin = async () => { await api.post(`/forum/threads/${threadId}/pin`); load(); };
  const toggleLock = async () => { await api.post(`/forum/threads/${threadId}/lock`); load(); };
  const remove = async () => {
    if (!window.confirm("Supprimer ce sujet ?")) return;
    await api.delete(`/forum/threads/${threadId}`);
    toast.success("Sujet retiré"); onBack();
  };

  if (!data) return <div className="p-12 text-center text-zinc-500">Chargement...</div>;
  const t = data.thread;
  const canDelete = isStaff || user?.user_id === t.user_id;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="thread-view">
      <button onClick={onBack} className="mb-4 text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-sm" data-testid="thread-back">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>
      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
          <h1 className="font-display font-black text-2xl ancient-text flex-1 min-w-0">
            {t.pinned && <Pin className="w-4 h-4 inline text-yellow-400 mr-1" />}
            {t.locked && <Lock className="w-4 h-4 inline text-red-400 mr-1" />}
            {t.title}
          </h1>
          {isStaff && (
            <div className="flex gap-1">
              <button onClick={togglePin} title="Épingler" className="p-1.5 rounded border border-white/10 text-yellow-400 hover:bg-white/[0.03]" data-testid="thread-pin"><Pin className="w-3.5 h-3.5" /></button>
              <button onClick={toggleLock} title="Verrouiller" className="p-1.5 rounded border border-white/10 text-red-400 hover:bg-white/[0.03]" data-testid="thread-lock"><Lock className="w-3.5 h-3.5" /></button>
            </div>
          )}
          {canDelete && (
            <button onClick={remove} title="Supprimer" className="p-1.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/5" data-testid="thread-delete"><Trash2 className="w-3.5 h-3.5" /></button>
          )}
        </div>
        <div className="text-xs text-zinc-500 mb-3"><HeroName user={t.author} size="sm" /> · {fmtDate(t.created_at)}</div>
        <div className="text-zinc-200 whitespace-pre-wrap leading-relaxed scroll-paragraph">{t.content}</div>
      </div>

      <div className="space-y-3 mb-4" data-testid="replies-list">
        {data.replies.map((r) => (
          <div key={r.reply_id} className="glass rounded-xl p-4" data-testid={`reply-${r.reply_id}`}>
            <div className="text-xs text-zinc-500 mb-1.5"><HeroName user={r.author} size="sm" /> · {fmtDate(r.created_at)}</div>
            <div className="text-zinc-200 whitespace-pre-wrap text-sm">{r.content}</div>
          </div>
        ))}
        {data.replies.length === 0 && <div className="text-center text-zinc-500 italic py-6">Soyez le premier à réagir</div>}
      </div>

      {!t.locked && (
        <form onSubmit={reply} className="glass rounded-xl p-4 space-y-2" data-testid="reply-form">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Votre réponse..." rows={3}
            className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="reply-input" />
          <div className="flex justify-between items-center">
            <div className="text-[10px] text-zinc-500 italic">+10 XP par contribution</div>
            <button type="submit" className="px-4 py-1.5 rounded border border-cyan-500/40 text-cyan-300 text-sm font-bold flex items-center gap-1" data-testid="reply-submit">
              <Send className="w-3 h-3" /> Répondre
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
