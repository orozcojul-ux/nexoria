import React, { useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { sfx } from "@/lib/sfx";

const SOUNDS = [
  { id: "fanfare", label: "Fanfare royale", emoji: "🎺" },
  { id: "horn", label: "Corne de guerre", emoji: "📯" },
  { id: "war", label: "Son de guerre", emoji: "⚔️" },
  { id: "bell", label: "Cloche", emoji: "🔔" },
  { id: "trumpet", label: "Trompette", emoji: "🎺" },
  { id: "chime", label: "Carillon", emoji: "✨" },
  { id: "drum", label: "Tambour", emoji: "🥁" },
];

export default function BroadcastPanel() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sound, setSound] = useState("fanfare");
  const [sending, setSending] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) { toast.error("Titre et message requis"); return; }
    if (!window.confirm("Cette alerte sera diffusée à TOUS les héros du royaume. Confirmer ?")) return;
    setSending(true);
    try {
      await api.post("/admin/broadcast", { title, message, sound });
      toast.success("Édit royal proclamé");
      setTitle(""); setMessage("");
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
    finally { setSending(false); }
  };

  return (
    <div className="relative rounded-2xl border border-yellow-500/25 bg-gradient-to-br from-[#1a1208]/90 via-[#0a0610]/90 to-[#100a18]/90 p-6 max-w-2xl overflow-hidden backdrop-blur-sm">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 20% 0%, rgba(255,215,0,0.25), transparent)" }} />
      <div className="flex items-center gap-3 mb-4 relative">
        <div className="w-10 h-10 rounded-xl border border-yellow-500/40 bg-yellow-500/10 flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]" />
        </div>
        <div>
          <h2 className="font-display font-black text-xl ancient-text text-yellow-100">Proclamation Royale</h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Alerte visible par tous les voyageurs</p>
        </div>
      </div>
      <p className="text-xs text-zinc-400 italic mb-5 scroll-paragraph relative">
        Diffuse un édit avec animation et son médiéval sur tout le royaume.
      </p>
      <form onSubmit={send} className="space-y-4 relative">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'édit..." maxLength={120}
          className="w-full bg-black/50 border border-yellow-500/25 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500/55 focus:ring-1 focus:ring-yellow-500/20"
          data-testid="broadcast-title" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message à proclamer..." maxLength={500} rows={4}
          className="w-full bg-black/50 border border-yellow-500/25 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500/55 focus:ring-1 focus:ring-yellow-500/20 resize-none"
          data-testid="broadcast-message" />
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2 block">Son de proclamation</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SOUNDS.map((s) => (
              <button key={s.id} type="button" onClick={() => { setSound(s.id); sfx[s.id]?.(); }}
                className={`px-3 py-2 rounded-lg text-xs font-bold border text-left transition-all ${sound === s.id ? "border-yellow-500/60 bg-yellow-500/15 text-yellow-200 shadow-[0_0_16px_rgba(255,215,0,0.15)]" : "border-white/10 text-zinc-400 hover:border-white/20"}`}
                data-testid={`broadcast-sound-${s.id}`}>
                <span className="mr-1.5">{s.emoji}</span>{s.label}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={sending} data-testid="broadcast-send-btn"
          className="w-full sm:w-auto px-6 py-3 rounded-lg border border-yellow-500/50 text-yellow-200 hover:shadow-[0_0_24px_rgba(255,215,0,0.35)] font-display font-bold tracking-wide flex items-center justify-center gap-2 disabled:opacity-40 bg-yellow-500/5">
          <Send className="w-4 h-4" /> Proclamer l&apos;Édit
        </button>
      </form>
    </div>
  );
}
