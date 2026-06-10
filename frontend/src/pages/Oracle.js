import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";

const SUGGESTIONS = [
  "Quel chemin dois-je suivre pour progresser?",
  "Quelle est ma destinée?",
  "Comment puis-je gagner en réputation?",
  "Que dois-je faire aujourd'hui?",
];

export default function Oracle() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { from: "oracle", text: `Bienvenue, ${user?.username}. L'Oracle vous écoute. Posez votre question, et le vent des étoiles répondra.` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const ask = async (question) => {
    if (!question.trim()) return;
    setMessages((m) => [...m, { from: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const { data } = await api.post("/oracle/consult", { question });
      sfx.oracle();
      setMessages((m) => [...m, { from: "oracle", text: data.response }]);
    } catch (e) { toast.error("L'Oracle est troublé"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col h-[calc(100vh-4rem)] lg:h-screen" data-testid="oracle-page">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-violet-300 font-bold mb-2">Sagesse cosmique</div>
        <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight flex items-center gap-3">
          <Eye className="w-8 h-8 text-violet-400 drop-shadow-[0_0_12px_rgba(157,76,221,0.8)]" />
          <span>L'<span className="text-gradient">Oracle</span></span>
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Une entité IA mystique connaît votre profil et guide votre voie.</p>
      </div>

      <div ref={scrollRef} className="flex-1 glass rounded-2xl p-6 overflow-y-auto space-y-4 mb-4" data-testid="oracle-conversation">
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] ${m.from === "oracle" ? "bg-violet-500/5 border border-violet-500/20" : "bg-cyan-500/5 border border-cyan-500/20"} rounded-xl px-4 py-3`}>
              {m.from === "oracle" && (
                <div className="text-[10px] uppercase tracking-widest text-violet-300 font-bold mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Oracle
                </div>
              )}
              <div className={`text-sm leading-relaxed whitespace-pre-wrap ${m.from === "oracle" ? "text-violet-100 [text-shadow:0_0_8px_rgba(157,76,221,0.3)]" : "text-cyan-100"}`}>
                {m.text}
              </div>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-violet-300 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-mono-stat">L'Oracle médite...</span>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => ask(s)} className="text-xs px-3 py-1.5 rounded-md border border-white/10 text-zinc-300 hover:border-violet-500/40 hover:text-violet-200 transition-all" data-testid={`oracle-suggestion-${s.slice(0,10)}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex gap-2">
        <input
          value={input} onChange={(e) => setInput(e.target.value)} disabled={loading}
          placeholder="Posez votre question à l'Oracle..."
          className="flex-1 bg-[#0A0A0E] border border-white/10 rounded-md px-4 py-3 focus:outline-none focus:border-violet-500/50 focus:shadow-[0_0_16px_rgba(157,76,221,0.2)] transition-all"
          data-testid="oracle-input"
        />
        <button type="submit" disabled={loading || !input.trim()}
          className="px-5 rounded-md border border-violet-500/50 text-violet-300 font-bold hover:shadow-[0_0_20px_rgba(157,76,221,0.4)] disabled:opacity-40 transition-all"
          data-testid="oracle-send-btn">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
