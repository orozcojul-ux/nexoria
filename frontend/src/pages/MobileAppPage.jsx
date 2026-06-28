import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Smartphone, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { PageShell } from "@/components/ui-premium";
import SiteFooter from "@/components/SiteFooter";
import SiteBackground from "@/components/SiteBackground";
import PwaInstallTutorialModal from "@/components/PwaInstallTutorialModal";

export default function MobileAppPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [tutorialOpen, setTutorialOpen] = useState(true);
  const backTo = user ? "/feed" : "/";

  const content = (
    <PageShell testid="mobile-app-page">
      <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
        <header className="text-center mb-8">
          <p className="text-[10px] uppercase tracking-[0.35em] text-violet-400/80 font-display mb-2">
            {t("pwa.page.kicker")}
          </p>
          <div className="mx-auto w-16 h-16 rounded-2xl border border-violet-500/40 bg-violet-500/10 flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-violet-300" />
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl uppercase tracking-wide text-violet-100">
            {t("pwa.page.title")}
          </h1>
          <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{t("pwa.page.subtitle")}</p>
        </header>

        <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-950/40 to-[#070711]/80 p-5 text-center">
          <img
            src="/icons/icon-192.png"
            alt=""
            width={96}
            height={96}
            className="mx-auto rounded-2xl border border-violet-500/30 shadow-lg shadow-violet-900/30 mb-4"
          />
          <p className="text-xs text-zinc-500 mb-4">{t("pwa.page.hint")}</p>
          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            data-testid="mobile-app-open-tutorial"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold font-display tracking-wide border border-violet-400/50 bg-violet-500/20 text-violet-100 hover:bg-violet-500/30 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            {t("pwa.page.openTutorial")}
          </button>
        </div>

        <Link
          to={backTo}
          className="mt-8 inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          data-testid="mobile-app-back-link"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {user ? t("pwa.page.backDashboard") : t("pwa.page.backHome")}
        </Link>
      </div>

      <PwaInstallTutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </PageShell>
  );

  if (user) return content;

  return (
    <div className="min-h-screen bg-[var(--nx-bg)] text-white relative">
      <SiteBackground variant="app" />
      <main className="relative z-10 pt-8 pb-4">{content}</main>
      <SiteFooter />
    </div>
  );
}
