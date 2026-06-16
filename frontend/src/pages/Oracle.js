import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Sparkles, Flame, BookOpen, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/lib/sfx";
import { PageShell, PremiumButton } from "@/components/ui-premium";
import { usePageBanner } from "@/lib/page-banners";

const WHISPERS = [
  "Quel chemin trace mon destin ?",
  "Que murmurent les étoiles à mon sujet ?",
  "Quelle ombre dois-je vaincre ?",
  "Quel trésor m'attend dans le silence ?",
];

export default function Oracle() {
  const banner = usePageBanner("oracle");
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      from: "oracle",
      text: `${user?.username}... ta présence éveille les anciens braseros. Le Sanctuaire t'écoute. Pose ta question, et que les flammes de la mémoire cosmique répondent.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    api.get("/oracle/status").then((r) => setStatus(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const ask = async (question) => {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { from: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const { data } = await api.post("/oracle/consult", { question });
      sfx.oracle();
      setMessages((m) => [...m, { from: "oracle", text: data.response }]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Les flammes vacillent...");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      className="flex flex-col min-h-[calc(100dvh-5rem)] lg:min-h-0"
      testid="oracle-page"
      banner={banner}
    >
      {status && (
        <div className={`rounded-xl border px-4 py-3 text-sm flex flex-wrap items-center gap-3 ${!status.llm_configured ? "border-amber-500/45 bg-amber-500/10" : status.access_ok ? "border-cyan-500/30 bg-cyan-500/5" : "border-amber-500/35 bg-amber-500/8"}`} data-testid="oracle-access-banner">
          {!status.llm_configured ? (
            <span className="text-amber-200 leading-relaxed">
              L&apos;Oracle ne peut pas répondre : ajoutez <code className="text-amber-100/90">EMERGENT_LLM_KEY</code> ou <code className="text-amber-100/90">ANTHROPIC_API_KEY</code> dans <code className="text-amber-100/90">backend/.env</code>, puis redémarrez le serveur.
            </span>
          ) : !status.level_ok ? (
            <span className="flex items-center gap-2 text-amber-300"><Lock className="w-4 h-4" /> Niveau 10 requis pour entrer au Sanctuaire.</span>
          ) : !status.access_ok ? (
            <span className="text-amber-200">Accès limité — atteignez le niveau 20 ou améliorez le <strong>Sanctuaire</strong> de votre royaume (niv. 30).</span>
          ) : status.unlimited ? (
            <span className="text-cyan-300">Consultations illimitées — Lien à l&apos;Oracle actif.</span>
          ) : (
            <span className="text-zinc-300">
              Consultations aujourd&apos;hui : <strong className="text-cyan-300">{status.used_today}/{status.daily_limit}</strong>
              {status.sanctuary_level > 0 && " (bonus Sanctuaire)"}
            </span>
          )}
          {!status.unlimited && status.access_ok && (
            <Link to="/shop" className="text-[10px] uppercase tracking-widest font-bold text-amber-300 hover:text-amber-200 ml-auto">
              Lien à l&apos;Oracle → Boutique
            </Link>
          )}
        </div>
      )}
      <div className="oracle-layout flex-1 min-h-0">
        <aside className="oracle-side-panel hidden lg:block space-y-4">
          <div>
            <div className="text-[9px] uppercase tracking-[0.25em] text-cyan-400/70 font-bold mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" /> Rites
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Chaque consultation nourrit la quête « Sagesse de l'Oracle ». Les réponses sont générées à partir de ton profil et de l'univers Nexoria.
            </p>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-[0.25em] text-violet-400/70 font-bold mb-2">Murmures suggérés</div>
            <div className="space-y-1.5">
              {WHISPERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  disabled={loading}
                  className="w-full text-left text-[11px] text-zinc-400 hover:text-violet-200 px-2 py-1.5 rounded-lg border border-transparent hover:border-violet-500/25 hover:bg-violet-500/5 transition-all"
                >
                  « {s} »
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div
          className="flex flex-col min-h-0 flex-1 rounded-xl border border-violet-500/20 overflow-hidden"
          style={{ background: "linear-gradient(180deg, rgba(12,8,28,0.95) 0%, rgba(6,4,14,0.98) 100%)" }}
          data-testid="oracle-conversation"
        >
          <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2 shrink-0">
            <Flame className="w-4 h-4 text-violet-400" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-violet-300 font-bold">Voix du Sanctuaire</span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-4 min-h-[16rem] lg:min-h-0">
            {messages.map((m, i) => (
              <motion.div
                key={`msg-${i}-${m.from}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                    m.from === "oracle"
                      ? "bg-violet-950/40 border border-violet-500/30 rounded-tl-sm"
                      : "bg-cyan-950/30 border border-cyan-500/25 rounded-tr-sm"
                  }`}
                >
                  {m.from === "oracle" && (
                    <div className="text-[9px] uppercase tracking-[0.25em] text-violet-400 font-bold mb-1.5 flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Oracle
                    </div>
                  )}
                  <div className={`text-sm leading-relaxed whitespace-pre-wrap ${m.from === "oracle" ? "text-violet-100" : "text-cyan-50"}`}>
                    {m.text}
                  </div>
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-violet-300 text-sm pl-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="italic">Les braises s'embrasent...</span>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="px-4 py-2 flex flex-wrap gap-2 justify-center border-t border-white/5 lg:hidden">
              {WHISPERS.map((s) => (
                <PremiumButton key={s} variant="ghost" size="sm" onClick={() => ask(s)} disabled={loading}>
                  « {s.slice(0, 28)}… »
                </PremiumButton>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); ask(input); }}
            className="flex gap-2 p-3 border-t border-white/10 shrink-0 bg-black/20"
          >
            <div className="flex-1 relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                placeholder="Murmurez votre question..."
                className="w-full bg-black/50 border border-violet-500/25 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-violet-400/50 text-white placeholder:text-zinc-600 text-sm"
                data-testid="oracle-input"
              />
              <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400/50" />
            </div>
            <PremiumButton type="submit" variant="violet" disabled={loading || !input.trim()} testid="oracle-send-btn">
              <Send className="w-4 h-4" />
            </PremiumButton>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
