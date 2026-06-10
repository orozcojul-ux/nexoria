import React, { useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { sfx } from "@/lib/sfx";

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
    <div className="rune-border rounded-2xl p-6 max-w-2xl relative mist overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]" />
        <h2 className="font-display font-black text-xl ancient-text">Proclamation Royale</h2>
      </div>
      <p className="text-xs text-zinc-400 italic mb-4 scroll-paragraph">
        « Diffuse un édit visible par tous les voyageurs avec une fanfare médiévale. »
      </p>
      <form onSubmit={send} className="space-y-3 relative">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'édit..." maxLength={120}
          className="w-full bg-[#0A0A0E] border border-yellow-500/30 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/60"
          data-testid="broadcast-title" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message à proclamer..." maxLength={500} rows={3}
          className="w-full bg-[#0A0A0E] border border-yellow-500/30 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/60"
          data-testid="broadcast-message" />
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2 block">Son médiéval</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: "fanfare", label: "🎺 Fanfare royale" },
              { id: "horn",    label: "📯 Corne de guerre" },
              { id: "bell",    label: "🔔 Cloche d'église" },
            ].map((s) => (
              <button key={s.id} type="button" onClick={() => { setSound(s.id); sfx[s.id](); }}
                className={`px-3 py-1.5 rounded text-xs font-bold border ${sound === s.id ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-300" : "border-white/10 text-zinc-400"}`}
                data-testid={`broadcast-sound-${s.id}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={sending} data-testid="broadcast-send-btn"
          className="px-5 py-2.5 rounded-md border border-yellow-500/50 text-yellow-300 hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] font-display font-bold tracking-wide flex items-center gap-2 disabled:opacity-40">
          <Send className="w-4 h-4" /> Proclamer l'Édit
        </button>
      </form>
    </div>
  );
}
