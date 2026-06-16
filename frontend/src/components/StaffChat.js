import React, { useEffect, useState, useRef } from "react";
import { Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { sfx } from "@/lib/sfx";
import HeroName from "@/components/HeroName";

const EMOTES = {
  ":sword:": "⚔️",
  ":shield:": "🛡️",
  ":crown:": "👑",
  ":fire:": "🔥",
  ":star:": "⭐",
  ":heart:": "❤️",
  ":skull:": "💀",
  ":sparkles:": "✨",
};

const ROLE_RING = {
  admin: "ring-2 ring-yellow-400/80 shadow-[0_0_12px_rgba(250,204,21,0.45)]",
  moderator: "ring-2 ring-orange-400/70 shadow-[0_0_10px_rgba(251,146,60,0.35)]",
};

const ROLE_AVATAR_BG = {
  admin: "bg-gradient-to-br from-yellow-500/90 via-violet-600 to-purple-900",
  moderator: "bg-gradient-to-br from-orange-500 to-amber-700",
};

function renderEmotes(text) {
  return text.replace(/:[a-z]+:/g, (m) => EMOTES[m] || m);
}

export default function StaffChat() {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const scrollRef = useRef(null);
  const lastCount = useRef(0);

  const load = async () => {
    try {
      const { data } = await api.get("/staff/chat");
      if (data.length > lastCount.current && lastCount.current > 0) sfx.click();
      lastCount.current = data.length;
      setMsgs(data);
    } catch {}
  };
  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const { data } = await api.post("/staff/chat", { content: text });
      if (data?.deleted) {
        setMsgs((prev) => prev.filter((m) => !m.msg_id.startsWith(data.deleted) && m.msg_id !== data.deleted));
        toast.success("Message supprimé");
      } else if (data?.msg_id) {
        setMsgs((prev) => [...prev, data]);
      }
      setText("");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const insertEmote = (code) => setText((t) => `${t}${code} `);

  return (
    <div className="glass rounded-2xl p-4 h-[600px] flex flex-col" data-testid="staff-chat">
      <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-3">
        <MessageCircle className="w-4 h-4 text-violet-400" />
        <div className="font-display font-bold ancient-text">Chambre des Anciens — Chat staff</div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
        {msgs.length === 0 && <div className="text-center text-sm text-zinc-500 italic py-12">Aucun message — soyez le premier à parler</div>}
        {msgs.map((m) => {
          const ring = ROLE_RING[m.author_role] || "ring-1 ring-violet-500/30";
          const bg = ROLE_AVATAR_BG[m.author_role] || "bg-gradient-to-br from-violet-500 to-cyan-500";
          const isSystem = m.system || m.author_id === "system";
          return (
            <div key={m.msg_id} className={`flex gap-2 group ${isSystem ? "opacity-90" : ""}`} data-testid={`staff-msg-${m.msg_id}`}>
              <div className={`w-7 h-7 rounded-full ${bg} ${ring} flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden`}>
                {m.author_avatar ? <img src={m.author_avatar} alt="" className="w-full h-full object-cover" /> : (isSystem ? "⚙" : m.author_username[0]?.toUpperCase())}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className={`font-display font-bold text-sm ${m.author_role === "admin" ? "text-yellow-300" : m.author_role === "moderator" ? "text-orange-300" : ""}`}>
                    {isSystem ? m.author_username : <HeroName user={m} size="sm" showIcon={false} />}
                  </span>
                  {!isSystem && (
                    <span className={`text-[9px] uppercase tracking-widest font-bold ${m.author_role === "admin" ? "text-violet-300" : "text-orange-300"}`}>
                      {m.author_role === "admin" ? "Sage" : "Modérateur"}
                    </span>
                  )}
                  <span className="text-[9px] font-mono-stat text-zinc-600" title="ID pour /delete">{m.msg_id.slice(0, 10)}…</span>
                  <span className="text-[10px] font-mono-stat text-zinc-600">{new Date(m.created_at).toLocaleTimeString()}</span>
                </div>
                <div className={`text-sm break-words ${isSystem ? "text-zinc-400 italic" : "text-zinc-200"}`}>{renderEmotes(m.content)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 flex-wrap mb-2 pt-2 border-t border-white/5">
        {Object.keys(EMOTES).map((code) => (
          <button key={code} type="button" onClick={() => insertEmote(code)} className="text-sm px-1.5 py-0.5 rounded hover:bg-white/5" title={code}>
            {EMOTES[code]}
          </button>
        ))}
        <span className="text-[9px] text-zinc-600 self-center ml-1">/delete · /help</span>
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message ou /delete smsg_abc…" maxLength={1000}
          className="flex-1 bg-[#0A0A0E] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50"
          data-testid="staff-chat-input" />
        <button type="submit" className="px-3 rounded-md border border-violet-500/40 text-violet-300 hover:border-violet-500/70" data-testid="staff-chat-send">
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
}
