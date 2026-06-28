import React, { useState } from "react";
import { Download, Smartphone, Share, PlusSquare, X } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { isMobileDevice } from "@/lib/pwa";

/**
 * Discrete PWA install prompt — mobile-first, NEXORIA styling.
 * @param {{ variant?: "settings" | "compact", className?: string }} props
 */
export default function InstallAppButton({ variant = "settings", className = "" }) {
  const { t } = useI18n();
  const { visible, showAndroidInstall, showIosHelp, install, installed } = usePwaInstall();
  const [iosOpen, setIosOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("nexoria_pwa_dismissed") === "1";
    } catch {
      return false;
    }
  });

  const onMobile = isMobileDevice();
  const showInSettings = variant === "settings" && onMobile && !installed;
  const showCompact = variant === "compact" && visible && !dismissed;

  if (installed || (!showInSettings && !showCompact)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("nexoria_pwa_dismissed", "1");
    } catch { /* ignore */ }
  };

  const handleAndroidInstall = async () => {
    if (showAndroidInstall) {
      await install();
    }
  };

  const cardClass = variant === "compact"
    ? "rounded-xl border border-violet-500/30 bg-violet-950/40 backdrop-blur-sm p-3 shadow-lg shadow-violet-900/20"
    : "rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-950/50 to-[#070711]/80 p-4";

  return (
    <>
      <div className={`relative ${className}`} data-testid="install-app-button">
        {variant === "compact" && (
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-2 right-2 p-1 rounded-md text-zinc-500 hover:text-zinc-300"
            aria-label={t("pwa.install.dismiss")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <div className={cardClass}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg border border-violet-500/40 bg-violet-500/10 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-violet-300" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <div className="font-display font-bold text-sm text-violet-100">{t("pwa.install.title")}</div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{t("pwa.install.subtitle")}</p>

              {showAndroidInstall && (
                <button
                  type="button"
                  onClick={handleAndroidInstall}
                  data-testid="pwa-install-android"
                  className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold font-display tracking-wide border border-violet-400/50 bg-violet-500/20 text-violet-100 hover:bg-violet-500/30 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t("pwa.install.button")}
                </button>
              )}

              {showIosHelp && (
                <button
                  type="button"
                  onClick={() => setIosOpen(true)}
                  data-testid="pwa-install-ios-help"
                  className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold font-display tracking-wide border border-cyan-400/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20 transition-colors"
                >
                  <Share className="w-3.5 h-3.5" />
                  {t("pwa.install.ios.button")}
                </button>
              )}

              {showInSettings && !showAndroidInstall && !showIosHelp && (
                <p className="text-[11px] text-zinc-500 mt-2 italic">{t("pwa.install.waiting")}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {iosOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-ios-title"
          onClick={() => setIosOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-violet-500/30 bg-[#0c0a18] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 id="pwa-ios-title" className="font-display font-bold text-violet-100">{t("pwa.install.ios.title")}</h3>
              <button type="button" onClick={() => setIosOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>
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
            <button
              type="button"
              onClick={() => setIosOpen(false)}
              className="mt-4 w-full py-2 rounded-lg border border-white/10 text-xs font-bold text-zinc-300 hover:bg-white/5"
            >
              {t("pwa.install.dismiss")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
