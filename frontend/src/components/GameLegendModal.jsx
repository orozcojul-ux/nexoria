import React, { useEffect, useState } from "react";
import { BookOpen, X, Crown, Coins, Sparkles, Trophy, Map, ShoppingBag, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { RANK_STYLES } from "@/lib/rank-styles";
import RankBadge from "@/components/RankBadge";

const STORAGE_KEY = "nexoria_legend_seen_v1";

const SECTIONS = [
  {
    id: "intro",
    icon: Crown,
    titleKey: "legend.intro.title",
    bodyKey: "legend.intro.body",
  },
  {
    id: "server",
    icon: Calendar,
    titleKey: "legend.server.title",
    bodyKey: "legend.server.body",
    highlight: true,
  },
  {
    id: "xp",
    icon: Sparkles,
    titleKey: "legend.xp.title",
    bodyKey: "legend.xp.body",
  },
  {
    id: "aether",
    icon: Coins,
    titleKey: "legend.aether.title",
    bodyKey: "legend.aether.body",
  },
  {
    id: "season",
    icon: Trophy,
    titleKey: "legend.season.title",
    bodyKey: "legend.season.body",
    highlight: true,
  },
  {
    id: "quests",
    icon: Map,
    titleKey: "legend.quests.title",
    bodyKey: "legend.quests.body",
  },
  {
    id: "shop",
    icon: ShoppingBag,
    titleKey: "legend.shop.title",
    bodyKey: "legend.shop.body",
  },
];

export function useGameLegend() {
  const [open, setOpen] = useState(false);
  const openLegend = () => setOpen(true);
  const closeLegend = () => {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
  };
  return { open, openLegend, closeLegend, setOpen };
}

export default function GameLegendModal({ open, onClose }) {
  const { t } = useI18n();
  const ranks = Object.keys(RANK_STYLES);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          data-testid="game-legend-modal"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
            className="relative w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl border border-amber-500/35 bg-gradient-to-br from-[#1a1208] via-[#0f0a18] to-[#0a0613] shadow-[0_0_60px_rgba(201,165,101,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-amber-500/20 bg-black/20">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="font-display font-black text-lg text-amber-100 tracking-wide">{t("legend.modal.title")}</h2>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-amber-500/70 font-bold">{t("legend.modal.subtitle")}</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/20" data-testid="legend-close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(88vh-5rem)] px-5 py-4 space-y-4">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.id}
                    className={`rounded-xl border p-4 ${s.highlight ? "border-amber-500/45 bg-amber-500/[0.07] shadow-[inset_0_0_30px_rgba(245,158,11,0.06)]" : "border-white/10 bg-white/[0.02]"}`}
                    data-testid={`legend-section-${s.id}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${s.highlight ? "text-amber-400" : "text-violet-400"}`} />
                      <h3 className={`font-display font-bold text-sm ${s.highlight ? "text-amber-200" : "text-white"}`}>
                        {t(s.titleKey)}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{t(s.bodyKey)}</p>
                  </div>
                );
              })}

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <h3 className="font-display font-bold text-sm text-white mb-2">{t("legend.ranks.title")}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ranks.map((r) => (
                    <div
                      key={r}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-lg border border-white/10 bg-black/20"
                    >
                      <RankBadge rank={r} size="lg" />
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider text-center"
                        style={{ color: RANK_STYLES[r].color }}
                      >
                        {r}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-amber-500/15 bg-black/25">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-lg border border-amber-500/45 bg-amber-500/10 text-amber-200 text-xs font-bold uppercase tracking-widest hover:bg-amber-500/20 transition-colors"
                data-testid="legend-understood"
              >
                {t("legend.modal.cta")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Auto-open once for new players */
export function GameLegendAutoOpen({ openLegend }) {
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const t = setTimeout(() => openLegend(), 1200);
        return () => clearTimeout(t);
      }
    } catch {}
    return undefined;
  }, [openLegend]);
  return null;
}
