import React, { useEffect, useState } from "react";
import { Shield, ShieldAlert, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

/** Bannière persistante en haut de l'écran après alerte Naria/Shumi. */
export default function ModerationNoticeBanner() {
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const onNotice = (e) => {
      const d = e.detail || {};
      setNotice({
        message: d.message,
        actor: d.actor,
        title: d.title || (d.actor ? `${d.actor} — Sentinelle` : "Modération"),
        blocked: !!d.blocked,
      });
    };
    window.addEventListener("nexoria:moderation-notice", onNotice);
    return () => window.removeEventListener("nexoria:moderation-notice", onNotice);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(null), notice.blocked ? 18000 : 14000);
    return () => clearTimeout(id);
  }, [notice]);

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="fixed top-16 left-0 right-0 z-[60] px-4 pointer-events-none"
        >
          <div
            className={`mx-auto max-w-2xl pointer-events-auto flex gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-md overflow-hidden ${
              notice.blocked
                ? "border-red-500/50 bg-red-950/90"
                : "border-amber-500/50 bg-amber-950/90"
            }`}
            role="alert"
            data-testid="moderation-notice-banner"
          >
            <div className={`shrink-0 ${notice.blocked ? "text-red-400" : "text-amber-400"}`}>
              {notice.blocked ? <ShieldAlert className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm text-white">{notice.title}</p>
              <p className="text-sm text-zinc-200 mt-1 leading-relaxed">{notice.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="shrink-0 text-zinc-500 hover:text-white p-1"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
