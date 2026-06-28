import React, { useMemo } from "react";
import {
  X, Smartphone, Download,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { isAndroidChrome, isIosSafari } from "@/lib/pwa";
import "./PwaInstallTutorialModal.css";

const ANDROID_STEPS = [
  { image: "/assets/pwa/android-step1-chrome.svg", titleKey: "pwa.tutorial.android.s1.title", descKey: "pwa.tutorial.android.s1.desc" },
  { image: "/assets/pwa/android-step2-menu.svg", titleKey: "pwa.tutorial.android.s2.title", descKey: "pwa.tutorial.android.s2.desc" },
  { image: "/assets/pwa/android-step3-confirm.svg", titleKey: "pwa.tutorial.android.s3.title", descKey: "pwa.tutorial.android.s3.desc" },
];

const IOS_STEPS = [
  { image: "/assets/pwa/ios-step1-safari.svg", titleKey: "pwa.tutorial.ios.s1.title", descKey: "pwa.tutorial.ios.s1.desc" },
  { image: "/assets/pwa/ios-step2-add-home.svg", titleKey: "pwa.tutorial.ios.s2.title", descKey: "pwa.tutorial.ios.s2.desc" },
  { image: "/assets/pwa/ios-step3-home.svg", titleKey: "pwa.tutorial.ios.s3.title", descKey: "pwa.tutorial.ios.s3.desc" },
];

const BENEFIT_KEYS = ["pwa.tutorial.benefit1", "pwa.tutorial.benefit2", "pwa.tutorial.benefit3"];

function TutorialStep({ index, image, title, description }) {
  return (
    <li className="pwa-tutorial-step">
      <div className="pwa-tutorial-step__visual">
        <img src={image} alt="" loading="lazy" decoding="async" />
        <span className="pwa-tutorial-step__num" aria-hidden>{index}</span>
      </div>
      <div>
        <h4 className="pwa-tutorial-step__title">{title}</h4>
        <p className="pwa-tutorial-step__desc">{description}</p>
      </div>
    </li>
  );
}

function TutorialSection({ platform, title, steps, t, badgeLabel, accentIcon: AccentIcon, children }) {
  const isAndroid = platform === "android";
  return (
    <section
      className={`pwa-tutorial-section pwa-tutorial-section--${platform}`}
      aria-labelledby={`pwa-${platform}-title`}
    >
      <div className="pwa-tutorial-section__head">
        <h3 id={`pwa-${platform}-title`} className="pwa-tutorial-section__title">
          <AccentIcon className="w-4 h-4" />
          {title}
        </h3>
        {badgeLabel && <span className="pwa-tutorial-badge">{badgeLabel}</span>}
      </div>
      <ol className="pwa-tutorial-steps">
        {steps.map((step, i) => (
          <TutorialStep
            key={step.titleKey}
            index={i + 1}
            image={step.image}
            title={t(step.titleKey)}
            description={t(step.descKey)}
          />
        ))}
      </ol>
      {children}
    </section>
  );
}

/**
 * Tutorial popup — install NEXORIA PWA on Android (Chrome) and iOS (Safari).
 * @param {{ open: boolean, onClose: () => void }} props
 */
export default function PwaInstallTutorialModal({ open, onClose }) {
  const { t } = useI18n();
  const { showAndroidInstall, install, installed } = usePwaInstall();

  const deviceHint = useMemo(() => {
    if (isAndroidChrome()) return "android";
    if (isIosSafari()) return "ios";
    return null;
  }, [open]);

  if (!open) return null;

  const handleAndroidInstall = async () => {
    if (showAndroidInstall) await install();
  };

  const yourDeviceLabel = t("pwa.tutorial.yourDevice");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-tutorial-title"
      onClick={onClose}
      data-testid="pwa-install-tutorial-modal"
    >
      <div className="pwa-tutorial-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="pwa-tutorial-title" className="font-display font-bold text-lg text-violet-100">
              {t("pwa.tutorial.title")}
            </h2>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed max-w-prose">{t("pwa.tutorial.subtitle")}</p>
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

        <div className="pwa-tutorial-benefits">
          <div className="pwa-tutorial-benefits__title">{t("pwa.tutorial.benefitsTitle")}</div>
          {BENEFIT_KEYS.map((key) => (
            <div key={key} className="pwa-tutorial-benefits__item">
              <span className="pwa-tutorial-benefits__dot" aria-hidden />
              <span>{t(key)}</span>
            </div>
          ))}
        </div>

        <TutorialSection
          platform="android"
          title={t("pwa.tutorial.android.title")}
          steps={ANDROID_STEPS}
          t={t}
          badgeLabel={deviceHint === "android" ? yourDeviceLabel : null}
          accentIcon={Smartphone}
        >
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
        </TutorialSection>

        <TutorialSection
          platform="ios"
          title={t("pwa.tutorial.ios.title")}
          steps={IOS_STEPS}
          t={t}
          badgeLabel={deviceHint === "ios" ? yourDeviceLabel : null}
          accentIcon={Smartphone}
        />

        <p className="pwa-tutorial-note">{t("pwa.tutorial.note")}</p>

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

export { ANDROID_STEPS, IOS_STEPS };
