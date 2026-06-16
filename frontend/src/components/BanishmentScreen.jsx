import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Clock, Scroll, Shield, AlertTriangle } from "lucide-react";
import SiteBackground from "@/components/SiteBackground";
import NexoriaCopyright from "@/components/NexoriaCopyright";
import { PremiumButton, PremiumCard } from "@/components/ui-premium";

const THEMES = {
  site: {
    kicker: "Édit du Conseil",
    title: "Exil du Royaume",
    subtitle: "Votre accès à Nexoria a été suspendu par le Conseil.",
    accent: "#ef4444",
    glow: "rgba(239,68,68,0.45)",
    border: "rgba(239,68,68,0.35)",
    veil: "from-red-950/20 via-transparent to-red-950/15",
    icon: Shield,
  },
  forum: {
    kicker: "Sceau de la Tribune",
    title: "Exclusion du Forum",
    subtitle: "Vous ne pouvez pas accéder à la Tribune des Héros pour le moment.",
    accent: "#f59e0b",
    glow: "rgba(245,158,11,0.4)",
    border: "rgba(245,158,11,0.35)",
    veil: "from-amber-950/15 via-transparent to-amber-950/10",
    icon: Scroll,
  },
};

function formatRemaining(seconds) {
  if (seconds <= 0) return "Expire bientôt…";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}j ${h}h ${m}min`;
  if (h > 0) return `${h}h ${m}min ${s}s`;
  return `${m}min ${s}s`;
}

/** Écran d'exclusion animé — site (global) ou forum uniquement. */
export default function BanishmentScreen({
  variant = "site",
  banInfo,
  onLogout,
  backTo = "/feed",
  backLabel = "Retour à l'accueil",
  testid,
}) {
  const theme = THEMES[variant] || THEMES.site;
  const Icon = theme.icon;
  const until = banInfo?.until ? new Date(banInfo.until) : null;
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!until) return undefined;
    const tick = () => setRemaining(Math.max(0, Math.floor((until - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden flex flex-col items-center justify-center p-4"
      data-testid={testid || `banishment-${variant}`}
    >
      <SiteBackground variant="app" />
      <div className={`absolute inset-0 bg-gradient-to-b ${theme.veil} pointer-events-none`} />

      {/* Motif animé — anneau de runes */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        animate={{ rotate: 360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="w-[min(90vw,36rem)] h-[min(90vw,36rem)] rounded-full border border-dashed opacity-20"
          style={{ borderColor: theme.accent }}
        />
      </motion.div>
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        animate={{ rotate: -360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="w-[min(70vw,28rem)] h-[min(70vw,28rem)] rounded-full border opacity-10"
          style={{ borderColor: theme.accent, boxShadow: `0 0 80px ${theme.glow}` }}
        />
      </motion.div>

      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 max-w-lg w-full text-center"
      >
        {/* Sceau central */}
        <motion.div
          animate={{ scale: [1, 1.04, 1], filter: [`drop-shadow(0 0 20px ${theme.glow})`, `drop-shadow(0 0 36px ${theme.glow})`, `drop-shadow(0 0 20px ${theme.glow})`] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative mx-auto mb-6 w-32 h-32"
        >
          <div
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: theme.border, background: `radial-gradient(circle at 30% 30%, ${theme.glow}, transparent 65%)` }}
          />
          <div className="absolute inset-3 rounded-full border flex items-center justify-center" style={{ borderColor: `${theme.accent}55` }}>
            <Icon className="w-14 h-14" style={{ color: theme.accent }} />
          </div>
          {[0, 45, 90, 135].map((deg) => (
            <motion.span
              key={deg}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: theme.accent,
                top: "50%",
                left: "50%",
                transform: `rotate(${deg}deg) translate(58px) translate(-50%, -50%)`,
                boxShadow: `0 0 8px ${theme.glow}`,
              }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, delay: deg / 180 }}
            />
          ))}
        </motion.div>

        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4"
          style={{ borderColor: theme.border, background: `${theme.accent}18` }}
        >
          <AlertTriangle className="w-3 h-3" style={{ color: theme.accent }} />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: theme.accent }}>
            {theme.kicker}
          </span>
        </div>

        <h1
          className="font-display font-black text-3xl sm:text-4xl tracking-tight mb-2"
          style={{ color: theme.accent, textShadow: `0 0 24px ${theme.glow}` }}
        >
          {theme.title}
        </h1>
        <p className="text-sm text-zinc-400 italic mb-6 max-w-md mx-auto">{theme.subtitle}</p>

        <PremiumCard tone="violet" className="p-6 space-y-5 text-left" style={{ borderColor: theme.border }}>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold mb-1.5" style={{ color: theme.accent }}>
              Motif de la sanction
            </div>
            <div className="text-zinc-200 leading-relaxed italic border-l-2 pl-3" style={{ borderColor: `${theme.accent}66` }}>
              {banInfo?.reason || "Non précisé"}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold mb-1.5" style={{ color: theme.accent }}>
              Durée de l'exclusion
            </div>
            <div className="flex items-center gap-2 text-zinc-100 font-mono-stat text-sm">
              <Clock className="w-4 h-4 shrink-0" style={{ color: theme.accent }} />
              {until ? until.toLocaleString("fr-FR") : "—"}
            </div>
            {until && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                  <span>Temps restant</span>
                  <span className="font-mono-stat text-zinc-300">{formatRemaining(remaining)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}88)` }}
                    animate={{ width: `${Math.max(4, 100 - (remaining / Math.max(remaining + 60, 3600)) * 100)}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            )}
          </div>
        </PremiumCard>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {variant === "forum" && (
            <Link to={backTo}>
              <PremiumButton variant="cyan" size="sm" testid="forum-ban-back">
                {backLabel}
              </PremiumButton>
            </Link>
          )}
          {variant === "site" && onLogout && (
            <PremiumButton variant="ghost" size="sm" onClick={onLogout} testid="site-ban-logout">
              Quitter
            </PremiumButton>
          )}
        </div>
      </motion.div>

      <NexoriaCopyright compact className="relative z-10 mt-8" />
    </div>
  );
}
