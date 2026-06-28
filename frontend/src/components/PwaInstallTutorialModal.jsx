import React from "react";
import {
  X, Smartphone, Share, PlusSquare, Download, MoreVertical, Chrome,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { usePwaInstall } from "@/hooks/usePwaInstall";

/**
 * Tutorial popup — install NEXORIA PWA on Android (Chrome) and iOS (Safari).
 * @param {{ open: boolean, onClose: () => void }} props
 */
export default function PwaInstallTutorialModal({ open, onClose }) {
  const { t } = useI18n();
  const { showAndroidInstall, install, installed } = usePwaInstall();

  if (!open) return null;

  const handleAndroidInstall = async () => {
    if (showAndroidInstall) await install();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-tutorial-title"
      onClick={onClose}
      data-testid="pwa-install-tutorial-modal"
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-violet-500/30 bg-[#0c0a18] p-5 shadow-2xl shadow-violet-950/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="pwa-tutorial-title" className="font-display font-bold text-lg text-violet-100">
              {t("pwa.tutorial.title")}
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{t("pwa.tutorial.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 shrink-0"
            aria-label={t("pwa.install.dismiss")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {installed && (
          <p className="mb-4 text-xs text-emerald-400/90 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2">
            {t("pwa.tutorial.alreadyInstalled")}
          </p>
        )}

        <section className="mb-5 rounded-xl border border-green-500/20 bg-green-950/20 p-4" aria-labelledby="pwa-android-title">
          <h3 id="pwa-android-title" className="flex items-center gap-2 font-display font-bold text-sm text-green-200 mb-3">
            <Smartphone className="w-4 h-4 text-green-400" />
            {t("pwa.tutorial.android.title")}
          </h3>
          <ol className="space-y-3 text-sm text-zinc-300">
            <li className="flex gap-3">
              <Chrome className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <span>{t("pwa.tutorial.android.step1")}</span>
            </li>
            <li className="flex gap-3">
              <MoreVertical className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <span>{t("pwa.tutorial.android.step2")}</span>
            </li>
            <li className="flex gap-3">
              <Download className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <span>{t("pwa.tutorial.android.step3")}</span>
            </li>
          </ol>
          {showAndroidInstall && !installed && (
            <button
              type="button"
              onClick={handleAndroidInstall}
              data-testid="pwa-tutorial-android-install"
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold font-display tracking-wide border border-green-400/40 bg-green-500/15 text-green-100 hover:bg-green-500/25 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {t("pwa.install.button")}
            </button>
          )}
        </section>

        <section className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4" aria-labelledby="pwa-ios-title">
          <h3 id="pwa-ios-title" className="flex items-center gap-2 font-display font-bold text-sm text-cyan-200 mb-3">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            {t("pwa.tutorial.ios.title")}
          </h3>
          <ol className="space-y-3 text-sm text-zinc-300">
            <li className="flex gap-3">
              <Share className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{t("pwa.install.ios.step1")}</span>
            </li>
            <li className="flex gap-3">
              <PlusSquare className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <span>{t("pwa.install.ios.step2")}</span>
            </li>
          </ol>
        </section>

        <p className="mt-4 text-[11px] text-zinc-500 leading-relaxed italic">{t("pwa.tutorial.note")}</p>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-lg border border-white/10 text-xs font-bold text-zinc-300 hover:bg-white/5 transition-colors"
        >
          {t("pwa.install.dismiss")}
        </button>
      </div>
    </div>
  );
}
