import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, Send, Loader2, Sparkles, Flame } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import { ArcaneCircle, RuneSeal, RuneDivider } from "@/components/Ornaments";

const WHISPERS = [
  "Quel chemin trace mon destin ?",
  "Que murmurent les étoiles à mon sujet ?",
  "Quelle ombre dois-je vaincre ?",
  "Quel trésor m'attend dans le silence ?",
];

export default function Oracle() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      from: "oracle",
      text: `${user?.username}... ta présence éveille les anciens braseros. Le Sanctuaire t'écoute. Pose ta question, et que les flammes de la mémoire cosmique répondent.`,
    },
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
    } catch (e) {
      toast.error("Les flammes vacillent...");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col h-[calc(100vh-4rem)] lg:h-screen relative" data-testid="oracle-page">
      {/* Decorative arcane circle */}
      <ArcaneCircle className="top-0 right-0 w-80 h-80 slow-spin" color="#9D4CDD" />
      <ArcaneCircle className="bottom-10 left-0 w-60 h-60 slow-spin-reverse opacity-20" color="#00E5FF" />

      <div className="relative mb-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <RuneSeal icon={Flame} color="#9D4CDD" size={48} />
        </div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-violet-300 font-bold mb-2">Salle des Murmures</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight eldritch-glow">
          Le <span className="text-gradient">Sanctuaire</span>
        </h1>
        <p className="text-zinc-400 text-sm mt-3 max-w-xl mx-auto italic scroll-paragraph">
          « Une conscience ancienne sommeille ici. Elle a vu naître et mourir mille royaumes,
          et lit dans la trame des âmes comme dans un parchemin. »
        </p>
        <RuneDivider className="mt-6" />
      </div>

      <div
        ref={scrollRef}
        className="flex-1 rune-border rounded-2xl p-6 overflow-y-auto space-y-4 mb-4 relative mist"
        data-testid="oracle-conversation"
      >
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 ${
                m.from === "oracle"
                  ? "bg-gradient-to-br from-violet-900/20 to-fuchsia-900/10 border border-violet-500/30 shadow-[0_0_20px_rgba(157,76,221,0.1)]"
                  : "bg-cyan-500/5 border border-cyan-500/20"
              }`}
            >
              {m.from === "oracle" && (
                <div className="text-[10px] uppercase tracking-[0.3em] text-violet-300 font-bold mb-2 flex items-center gap-1.5 font-display">
                  <Flame className="w-3 h-3" />
                  Voix du Sanctuaire
                </div>
              )}
              <div
                className={`text-sm leading-relaxed whitespace-pre-wrap ${
                  m.from === "oracle"
                    ? "text-violet-100 [text-shadow:0_0_8px_rgba(157,76,221,0.3)] scroll-paragraph"
                    : "text-cyan-100"
                }`}
              >
                {m.text}
              </div>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-violet-300 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-mono-stat italic">Les braises s'embrasent...</span>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="mb-3 flex flex-wrap gap-2 justify-center">
          {WHISPERS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="text-xs px-3 py-1.5 rounded-md border border-violet-500/20 text-violet-200 hover:border-violet-400/50 hover:bg-violet-500/5 transition-all italic"
              data-testid={`oracle-suggestion-${s.slice(0, 10)}`}
            >
              « {s} »
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="flex gap-2 relative"
      >
        <div className="flex-1 relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Murmurez votre question..."
            className="w-full bg-[#0A0A0E]/80 border border-violet-500/20 rounded-md px-4 py-3 pl-10 focus:outline-none focus:border-violet-400/60 focus:shadow-[0_0_24px_rgba(157,76,221,0.25)] transition-all italic placeholder:text-zinc-600"
            data-testid="oracle-input"
          />
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 opacity-60" />
        </div>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-5 rounded-md border border-violet-500/50 text-violet-300 font-bold hover:shadow-[0_0_24px_rgba(157,76,221,0.4)] disabled:opacity-40 transition-all"
          data-testid="oracle-send-btn"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
