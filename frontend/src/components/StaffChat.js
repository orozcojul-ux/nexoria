import React, { useEffect, useState, useRef } from "react";
import { Send, MessageCircle } from "lucide-react";
import api from "@/lib/api";
import { sfx } from "@/lib/sfx";

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
      await api.post("/staff/chat", { content: text });
      setText("");
      await load();
    } catch {}
  };

  return (
    <div className="glass rounded-2xl p-4 h-[600px] flex flex-col" data-testid="staff-chat">
      <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-3">
        <MessageCircle className="w-4 h-4 text-violet-400" />
        <div className="font-display font-bold ancient-text">Chambre des Anciens — Chat staff</div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
        {msgs.length === 0 && <div className="text-center text-sm text-zinc-500 italic py-12">Aucun message — soyez le premier à parler</div>}
        {msgs.map((m) => (
          <div key={m.msg_id} className="flex gap-2" data-testid={`staff-msg-${m.msg_id}`}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold shrink-0">
              {m.author_avatar ? <img src={m.author_avatar} alt="" className="w-full h-full rounded-full object-cover" /> : m.author_username[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-display font-bold text-sm text-cyan-300">{m.author_username}</span>
                <span className={`text-[9px] uppercase tracking-widest font-bold ${m.author_role === "admin" ? "text-violet-300" : "text-orange-300"}`}>
                  {m.author_role === "admin" ? "Sage" : "Modérateur"}
                </span>
                <span className="text-[10px] font-mono-stat text-zinc-600">{new Date(m.created_at).toLocaleTimeString()}</span>
              </div>
              <div className="text-sm text-zinc-200 break-words">{m.content}</div>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2 mt-3 pt-3 border-t border-white/5">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message au staff..." maxLength={1000}
          className="flex-1 bg-[#0A0A0E] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-violet-500/50"
          data-testid="staff-chat-input" />
        <button type="submit" className="px-3 rounded-md border border-violet-500/40 text-violet-300 hover:border-violet-500/70" data-testid="staff-chat-send">
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
}
