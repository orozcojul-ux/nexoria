import React from "react";
import { Globe, Loader2, RotateCcw } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";

export default function ContentTranslationBar({
  isTranslated,
  loading,
  unavailable,
  canRetry,
  showOriginal,
  onTranslate,
  onToggle,
  compact = false,
  className = "",
}) {
  const { t } = useI18n();

  if (loading) {
    if (compact) return null;
    return (
      <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 ${className}`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        {t("contentTranslate.loading")}
      </div>
    );
  }

  if (unavailable) {
    if (compact) return null;
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          {t("contentTranslate.unavailable")}
        </span>
        {canRetry && (
          <button
            type="button"
            onClick={onTranslate}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-violet-300 hover:text-violet-200 font-bold"
          >
            <Globe className="w-3 h-3" />
            {t("contentTranslate.retry")}
          </button>
        )}
      </div>
    );
  }

  if (!isTranslated && !showOriginal) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? "inline-flex ml-2" : ""} ${className}`}>
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-cyan-400/90 font-bold">
        <Globe className="w-3 h-3" />
        {showOriginal ? t("contentTranslate.showingOriginal") : t("contentTranslate.autoTranslated")}
      </span>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-violet-300 hover:text-violet-200 font-bold"
      >
        <RotateCcw className="w-3 h-3" />
        {showOriginal ? t("contentTranslate.showTranslation") : t("contentTranslate.showOriginal")}
      </button>
    </div>
  );
}
