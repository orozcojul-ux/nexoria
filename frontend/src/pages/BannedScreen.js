import React from "react";
import { Skull, Clock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import StarField from "@/components/StarField";
import { RuneDivider } from "@/components/Ornaments";

export default function BannedScreen({ banInfo }) {
  const { logout } = useAuth();
  const { t } = useI18n();

  const until = banInfo?.until ? new Date(banInfo.until) : null;
  const remaining = until ? Math.max(0, Math.floor((until - Date.now()) / 1000)) : 0;
  const hours = Math.floor(remaining / 3600);
  const mins = Math.floor((remaining % 3600) / 60);

  return (
    <div className="min-h-screen bg-[#030305] text-white relative overflow-hidden flex items-center justify-center p-4" data-testid="banned-screen">
      <StarField density={80} />
      <div className="absolute inset-0 bg-gradient-to-b from-red-900/10 via-transparent to-red-900/10 pointer-events-none" />

      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 max-w-xl w-full text-center">
        <motion.div animate={{ rotate: [0, -3, 3, 0] }} transition={{ duration: 4, repeat: Infinity }} className="inline-block mb-6">
          <Skull className="w-24 h-24 mx-auto text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]" />
        </motion.div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/40 bg-red-500/10 mb-4">
          <AlertTriangle className="w-3 h-3 text-red-400" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-red-400 font-bold">Édit du Conseil</span>
        </div>

        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter mb-4 text-red-300 [text-shadow:0_0_20px_rgba(239,68,68,0.5)]">
          {t("banned.title")}
        </h1>

        <RuneDivider className="my-6 max-w-md mx-auto" />

        <div className="glass rounded-xl p-6 space-y-4 text-left max-w-md mx-auto" style={{ borderColor: "rgba(239,68,68,0.25)" }}>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-red-400 font-bold mb-1">{t("banned.reason")}</div>
            <div className="text-zinc-200 italic">{banInfo?.reason || "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-red-400 font-bold mb-1">{t("banned.until")}</div>
            <div className="text-zinc-200 font-mono-stat flex items-center gap-2">
              <Clock className="w-3 h-3" />
              {until ? until.toLocaleString() : "—"}
            </div>
            {remaining > 0 && (
              <div className="text-xs text-zinc-500 mt-1 font-mono-stat">
                Reste: {hours}h {mins}min
              </div>
            )}
          </div>
        </div>

        <button onClick={logout} className="mt-6 px-5 py-2 rounded-md border border-white/10 text-zinc-300 hover:border-white/30 text-sm" data-testid="banned-logout-btn">
          Quitter
        </button>
      </motion.div>
    </div>
  );
}
