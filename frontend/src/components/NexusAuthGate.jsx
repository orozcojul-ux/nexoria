import React from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, UserPlus, X, Castle, Scroll } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { CornerOrnament, RuneDivider, RuneSeal } from "@/components/Ornaments";
import { AuthOAuthBtn, DiscordIcon } from "@/components/auth/AuthMedievalCard";

/**
 * Portail médiéval — accès Nexus réservé aux héros inscrits.
 */
export default function NexusAuthGate({ open, onClose }) {
  const { t } = useI18n();

  const discordLogin = async () => {
    try {
      const { data } = await api.get("/auth/discord/url");
      window.location.href = data.url;
    } catch {
      toast.error(t("login.discord_error"));
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6"
          onClick={onClose}
          data-testid="nexus-auth-gate"
        >
          <div className="absolute inset-0 bg-[#050302]/88 backdrop-blur-md" />

          <motion.div
            initial={{ scale: 0.88, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 28, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md"
          >
            {/* Glow halo */}
            <div
              className="absolute -inset-4 rounded-3xl pointer-events-none opacity-60"
              style={{ background: "radial-gradient(ellipse at center, rgba(201,165,101,0.18), transparent 70%)" }}
            />

            <div
              className="relative parchment rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.75)]"
              style={{ border: "1px solid rgba(201,165,101,0.35)" }}
            >
              <CornerOrnament className="absolute top-2 left-2 w-9 h-9 z-10" color="rgba(201,165,101,0.6)" />
              <CornerOrnament className="absolute top-2 right-2 w-9 h-9 z-10 flip" color="rgba(201,165,101,0.6)" />
              <CornerOrnament className="absolute bottom-2 left-2 w-9 h-9 z-10 scale-y-[-1]" color="rgba(201,165,101,0.6)" />
              <CornerOrnament className="absolute bottom-2 right-2 w-9 h-9 z-10 scale-y-[-1] flip" color="rgba(201,165,101,0.6)" />

              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 z-20 w-8 h-8 rounded-md border border-amber-900/40 hover:border-amber-600/50 hover:bg-amber-950/30 text-amber-700/80 hover:text-amber-300 flex items-center justify-center transition-all"
                aria-label={t("gate.close")}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Crest header */}
              <div
                className="relative pt-10 pb-6 px-8 text-center border-b"
                style={{
                  borderColor: "rgba(201,165,101,0.22)",
                  background: "linear-gradient(180deg, rgba(50,32,14,0.5) 0%, transparent 100%)",
                }}
              >
                <div className="flex justify-center mb-4">
                  <RuneSeal icon={Castle} color="#c9a565" size={52} />
                </div>
                <div className="text-[9px] uppercase tracking-[0.45em] text-amber-600/90 font-bold mb-2">
                  {t("gate.badge")}
                </div>
                <h2 className="font-display font-black text-2xl sm:text-[1.75rem] ancient-text leading-tight">
                  {t("gate.title")}
                </h2>
                <RuneDivider className="mt-4 max-w-[200px] mx-auto" />
              </div>

              {/* Proclamation body */}
              <div className="px-8 py-7">
                <div className="flex gap-3 items-start mb-8">
                  <Scroll className="w-5 h-5 text-amber-600/70 shrink-0 mt-0.5" />
                  <p className="text-sm text-zinc-400 leading-relaxed italic text-left">
                    {t("gate.body")}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Link
                    to="/login"
                    onClick={onClose}
                    data-testid="nexus-gate-login"
                    className="group flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg font-display font-bold text-xs uppercase tracking-[0.18em] text-amber-950 border border-amber-400/45 transition-all hover:brightness-110"
                    style={{
                      background: "linear-gradient(180deg, #e8c87a 0%, #c9a565 50%, #9a7b3c 100%)",
                      boxShadow: "0 4px 16px rgba(201,165,101,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
                    }}
                  >
                    <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    {t("gate.login")}
                  </Link>
                  <Link
                    to="/register"
                    onClick={onClose}
                    data-testid="nexus-gate-register"
                    className="group flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg font-display font-bold text-xs uppercase tracking-[0.18em] text-amber-100 border border-amber-700/50 transition-all hover:border-amber-500/60 hover:bg-amber-950/40"
                    style={{
                      background: "linear-gradient(180deg, rgba(40,25,12,0.9) 0%, rgba(20,12,6,0.95) 100%)",
                      boxShadow: "inset 0 1px 0 rgba(201,165,101,0.08)",
                    }}
                  >
                    <UserPlus className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    {t("gate.register")}
                  </Link>
                </div>

                <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(201,165,101,0.15)" }}>
                  <AuthOAuthBtn onClick={discordLogin} testid="nexus-gate-discord-btn" icon={<DiscordIcon />} variant="discord">
                    {t("auth.continue_discord")}
                  </AuthOAuthBtn>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
