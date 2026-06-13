import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Plus, X, ChevronLeft, Send, Clock, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { RuneSeal, RuneDivider } from "@/components/Ornaments";
import StarField from "@/components/StarField";
import HeroName from "@/components/HeroName";
import { sfx } from "@/lib/sfx";

const STATUS_LABEL = { open: "Ouvert", in_progress: "En cours", resolved: "Résolu", closed: "Clos" };
const STATUS_COLOR = { open: "#3B82F6", in_progress: "#EAB308", resolved: "#10B981", closed: "#71717A" };
const CATEGORY_LABEL = { general: "Général", bug: "Anomalie", account: "Compte", other: "Autre" };
const fmtDate = (s) => s ? new Date(s).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    const { data } = await api.get("/tickets/mine");
    setTickets(data);
  };
  useEffect(() => { load(); }, []);

  if (selected) return <TicketView ticketId={selected} onBack={() => { setSelected(null); load(); }} />;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 relative" data-testid="tickets-page">
      <StarField density={40} />
      <div className="text-center mb-8 relative">
        <div className="flex justify-center mb-3"><RuneSeal icon={Mail} color="#EAB308" size={48} /></div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-yellow-400 font-bold mb-1">Doléances au Conseil</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">Mes <span className="text-gradient">Missives</span></h1>
        <p className="text-zinc-400 text-sm mt-2 italic scroll-paragraph max-w-2xl mx-auto">« Le Conseil ouvre une oreille à toutes les voix du royaume. »</p>
        <RuneDivider className="mt-5 max-w-md mx-auto" />
      </div>

      <div className="flex justify-between items-center mb-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">Mes missives ({tickets.length})</div>
        <button onClick={() => setShowCreate(true)} data-testid="open-create-ticket"
          className="px-4 py-2 rounded border border-yellow-500/50 text-yellow-300 font-bold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvelle doléance
        </button>
      </div>

      <div className="space-y-2">
        {tickets.length === 0 && <div className="text-center text-zinc-500 italic py-12">Aucune missive — adressez-vous au Conseil quand vous le souhaiterez</div>}
        {tickets.map((t) => (
          <button key={t.ticket_id} onClick={() => setSelected(t.ticket_id)} data-testid={`ticket-${t.ticket_id}`}
            className="w-full glass rounded-xl p-4 text-left hover:bg-white/[0.03] flex gap-3 items-center">
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold truncate">{t.subject}</div>
              <div className="text-xs text-zinc-500 flex items-center gap-2">
                <Clock className="w-3 h-3" /> {fmtDate(t.updated_at)} · {CATEGORY_LABEL[t.category] || t.category}
              </div>
            </div>
            <span className="px-2 py-1 rounded text-[10px] uppercase tracking-widest font-bold shrink-0"
              style={{ background: `${STATUS_COLOR[t.status]}20`, color: STATUS_COLOR[t.status] }}>
              {STATUS_LABEL[t.status]}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showCreate && <CreateTicketDialog onClose={() => setShowCreate(false)} onCreated={async () => { setShowCreate(false); await load(); }} />}
      </AnimatePresence>
    </div>
  );
}

function CreateTicketDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({ subject: "", body: "", category: "general" });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/tickets", form);
      toast.success("Doléance soumise — le Conseil va l'examiner");
      sfx.success();
      await onCreated();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
    finally { setSaving(false); }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="rune-border rounded-2xl p-6 max-w-lg w-full space-y-3" data-testid="create-ticket-dialog">
        <div className="flex justify-between">
          <h3 className="font-display font-black text-xl text-gradient">Adresser une missive</h3>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-zinc-500" /></button>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1 block">Catégorie</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="ticket-category">
            <option value="general">Général</option>
            <option value="bug">Anomalie / Bug</option>
            <option value="account">Compte / Identifiants</option>
            <option value="other">Autre</option>
          </select>
        </div>
        <input value={form.subject} required minLength={5} maxLength={150} placeholder="Sujet de la missive..."
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="ticket-subject" />
        <textarea value={form.body} required minLength={10} maxLength={3000} rows={6}
          placeholder="Détaillez votre demande..." onChange={(e) => setForm({ ...form, body: e.target.value })}
          className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="ticket-body" />
        <button type="submit" disabled={saving}
          className="w-full py-2 rounded border border-yellow-500/50 text-yellow-300 font-bold text-sm disabled:opacity-40" data-testid="ticket-submit">
          Envoyer la missive
        </button>
      </motion.form>
    </motion.div>
  );
}

function TicketView({ ticketId, onBack }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [text, setText] = useState("");
  const isStaff = user?.role === "admin" || user?.role === "moderator";

  const load = async () => {
    const { data } = await api.get(`/tickets/${ticketId}`);
    setData(data);
  };
  useEffect(() => { load(); }, [ticketId]);

  const reply = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await api.post(`/tickets/${ticketId}/replies`, { content: text.trim() });
    setText(""); load();
  };
  const setStatus = async (status) => {
    await api.put(`/tickets/${ticketId}/status`, { status });
    toast.success(`Statut mis à jour : ${STATUS_LABEL[status]}`);
    load();
  };

  if (!data) return <div className="p-12 text-center text-zinc-500">Chargement...</div>;
  const t = data.ticket;
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="ticket-view">
      <button onClick={onBack} className="mb-4 text-cyan-400 flex items-center gap-1 text-sm" data-testid="ticket-back">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>
      <div className="glass rounded-2xl p-5 mb-4 border-2" style={{ borderColor: `${STATUS_COLOR[t.status]}40` }}>
        <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
          <h1 className="font-display font-black text-2xl ancient-text flex-1">{t.subject}</h1>
          <span className="px-2 py-1 rounded text-[10px] uppercase tracking-widest font-bold"
            style={{ background: `${STATUS_COLOR[t.status]}20`, color: STATUS_COLOR[t.status] }}>
            {STATUS_LABEL[t.status]}
          </span>
        </div>
        <div className="text-xs text-zinc-500 mb-3"><HeroName user={t.author} size="sm" /> · {fmtDate(t.created_at)} · {CATEGORY_LABEL[t.category]}</div>
        <div className="text-zinc-200 whitespace-pre-wrap text-sm scroll-paragraph">{t.body}</div>
        {isStaff && (
          <div className="flex gap-1 mt-4 flex-wrap" data-testid="ticket-status-actions">
            {["open", "in_progress", "resolved", "closed"].map((s) => (
              <button key={s} onClick={() => setStatus(s)} disabled={t.status === s}
                className="px-2.5 py-1 rounded border text-[10px] uppercase tracking-widest font-bold disabled:opacity-40"
                style={{ borderColor: `${STATUS_COLOR[s]}40`, color: STATUS_COLOR[s] }}
                data-testid={`status-${s}`}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4" data-testid="ticket-replies">
        {data.replies.map((r) => (
          <div key={r.reply_id} className={`glass rounded-xl p-3 ${r.is_staff ? "border border-violet-500/30 bg-violet-500/5" : ""}`} data-testid={`treply-${r.reply_id}`}>
            <div className="text-xs text-zinc-500 mb-1 flex items-center gap-2">
              <HeroName user={r.author} size="sm" /> · {fmtDate(r.created_at)}
              {r.is_staff && <span className="text-[9px] uppercase tracking-widest font-bold text-violet-300">Conseil</span>}
            </div>
            <div className="text-zinc-200 whitespace-pre-wrap text-sm">{r.content}</div>
          </div>
        ))}
        {data.replies.length === 0 && <div className="text-center text-zinc-500 italic py-4">Aucune réponse pour l'instant.</div>}
      </div>

      {t.status !== "closed" && (
        <form onSubmit={reply} className="glass rounded-xl p-4 space-y-2" data-testid="ticket-reply-form">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Votre réponse..." rows={3}
            className="w-full bg-[#0A0A0E] border border-white/10 rounded px-3 py-2 text-sm" data-testid="ticket-reply-input" />
          <button type="submit" className="px-4 py-1.5 rounded border border-cyan-500/40 text-cyan-300 text-sm font-bold flex items-center gap-1" data-testid="ticket-reply-submit">
            <Send className="w-3 h-3" /> Répondre
          </button>
        </form>
      )}
    </div>
  );
}
