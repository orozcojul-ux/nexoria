import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { X, Repeat, Sparkles, AlertTriangle, ShoppingBag, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { sfx } from "@/lib/sfx";
import ClassImage from "@/components/ClassImage";
import { useI18n } from "@/i18n/LanguageProvider";
import { normalizeClassId } from "@/lib/translate-game";

export default function ClassChangeModal({ open, onClose, user, onChanged }) {
  const { t } = useI18n();
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      api.get("/game/classes").then((r) => setClasses(r.data || [])).catch(() => {});
      setSelected(null);
    }
  }, [open]);

  const freeUsed = Number(user?.class_changes_used || 0);
  const credits = Number(user?.class_change_credits || 0);
  const hasBetaChange = Boolean(user?.beta_class_change_available);
  const isBetaTester = Boolean(user?.beta_access && user?.beta_key_used);
  const hasFree = freeUsed < 1;
  const canChange = hasBetaChange || hasFree || credits > 0;

  const scrollLabel = credits > 1
    ? t("classChange.scrollsCount_other", { count: credits })
    : t("classChange.scrollsCount", { count: credits });

  const currentClassId = normalizeClassId(user?.class_id);

  const confirm = async () => {
    if (!selected || selected === currentClassId) return;
    setSaving(true);
    try {
      const { data: profile } = await api.put("/profile", { class_id: selected });
      sfx.success?.();
      toast.success(t("classChange.success"));
      await onChanged?.(profile);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || t("classChange.failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
          data-testid="class-change-modal"
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl rounded-2xl border border-violet-500/40 bg-gradient-to-br from-[#120a18] via-[#0A0613] to-[#0d1018] p-6 shadow-[0_0_60px_rgba(168,85,247,0.25)] max-h-[90vh] overflow-y-auto"
          >
            <button onClick={onClose} className="absolute top-3 right-3 text-zinc-400 hover:text-white" aria-label={t("common.close")}>
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Repeat className="w-5 h-5 text-violet-300" />
              <h3 className="font-display font-black text-xl text-violet-100">{t("classChange.title")}</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              {t("classChange.current")}{" "}
              <span className="text-cyan-300 font-bold">{user?.class_name}</span>
            </p>

            {hasBetaChange ? (
              <div className="mb-4 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5 text-xs text-cyan-100 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 shrink-0" />
                {t("classChange.betaFree")}
              </div>
            ) : hasFree ? (
              <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                {t("classChange.free")}
              </div>
            ) : credits > 0 ? (
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200 flex items-center gap-2">
                <Repeat className="w-4 h-4 shrink-0" />
                {t("classChange.scrollsLeft")} <strong>{scrollLabel}</strong>.
              </div>
            ) : (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-200">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {isBetaTester ? t("classChange.noBeta") : t("classChange.noFree")}
                </div>
                <Link to="/shop" onClick={onClose} className="inline-flex items-center gap-1 mt-1 text-amber-300 font-bold hover:text-amber-200">
                  <ShoppingBag className="w-3.5 h-3.5" /> {t("classChange.buyScroll")}
                </Link>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {classes.map((c) => {
                const isCurrent = c.id === currentClassId;
                const isSel = selected === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={isCurrent || !canChange}
                    onClick={() => setSelected(c.id)}
                    className={`p-3 rounded-xl border text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSel ? "border-violet-400/80 bg-violet-500/15 shadow-[0_0_16px_rgba(168,85,247,0.35)]" : "border-white/10 hover:border-white/30 bg-white/[0.03]"
                    }`}
                    data-testid={`class-opt-${c.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <ClassImage classId={c.id} color="#a855f7" size={28} alt={c.name} />
                      <div className="min-w-0">
                        <div className="font-display font-bold text-sm text-white truncate">{c.name}</div>
                        {isCurrent && (
                          <div className="text-[9px] uppercase tracking-wider text-cyan-400">
                            {t("classChange.currentTag")}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={confirm}
              disabled={!selected || selected === currentClassId || !canChange || saving}
              className="mt-5 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-display font-black uppercase tracking-widest text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] transition-transform"
              data-testid="class-change-confirm"
            >
              {saving ? t("classChange.saving") : t("classChange.confirm")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
