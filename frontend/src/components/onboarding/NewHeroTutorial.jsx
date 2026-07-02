import React from "react";
import { useNavigate } from "react-router-dom";
import { Minimize2, Shield, Sparkles } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useNexusSocket } from "@/contexts/NexusSocketContext";
import { useAuth } from "@/contexts/AuthContext";
import { useHeroCard } from "@/contexts/HeroCardContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { CHECKLIST_LABEL_KEYS, FAQ_ITEMS, TUTORIAL_STEP_META } from "@/lib/onboarding-steps";
import TutorialOverlay from "./TutorialOverlay";
import TutorialStepCard from "./TutorialStepCard";
import TutorialChecklist from "./TutorialChecklist";
import TutorialStepper from "./TutorialStepper";
import "./onboarding.css";

export default function NewHeroTutorial() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const ns = useNexusSocket();
  const { user } = useAuth();
  const { openHeroCard } = useHeroCard();
  const {
    state,
    open,
    viewIndex,
    loading,
    showFaq,
    setShowFaq,
    goNext,
    goPrev,
    skip,
    finish,
    acknowledge,
    visitStep,
    pauseForExplore,
    minimize,
    isDone,
    canComplete,
    missingSteps,
  } = useOnboarding();

  if (!open || !state?.eligible || state?.completed || state?.locked) return null;

  const step = TUTORIAL_STEP_META[viewIndex] || TUTORIAL_STEP_META[0];
  const isFirst = viewIndex === 0;
  const isLast = step.id === "complete";
  const stepDone = isDone(step.id);
  const hasGoTo = (step.route || step.id === "profile") && !isLast;

  const primaryLabel = (() => {
    if (isLast) return t("tutorial.actions.finish");
    if (step.id === "welcome") return t("tutorial.actions.start");
    if (step.acknowledge && !stepDone) return t("tutorial.actions.understood");
    return t("tutorial.actions.next");
  })();

  const handleGoTo = async () => {
    const stepId = step.id;
    const ok = await visitStep(stepId);
    if (!ok) return;

    pauseForExplore(stepId);

    if (stepId === "profile" && user?.user_id) {
      openHeroCard(user.user_id);
      return;
    }
    if (step.route === "nexus") {
      ns?.openNexus?.();
      return;
    }
    if (typeof step.route === "string" && step.route.startsWith("/")) {
      navigate(step.route);
    }
  };

  const handlePrimary = async () => {
    if (isLast) {
      await finish();
      return;
    }
    if (step.id === "welcome") {
      await goNext();
      return;
    }
    if (step.acknowledge && !stepDone) {
      await acknowledge();
      return;
    }
    await goNext();
  };

  return (
    <TutorialOverlay open={open} onClose={minimize}>
      <div
        className="tutorial-shell"
        data-testid="new-hero-tutorial"
        onClick={(e) => e.stopPropagation()}
      >
        <aside className="tutorial-panel tutorial-checklist-panel tutorial-panel--quest-log">
          <span className="tutorial-corner tutorial-corner--tl" aria-hidden />
          <span className="tutorial-corner tutorial-corner--tr" aria-hidden />
          <span className="tutorial-corner tutorial-corner--bl" aria-hidden />
          <span className="tutorial-corner tutorial-corner--br" aria-hidden />
          <TutorialChecklist checklist={state.checklist} currentStepId={step.id} />
        </aside>

        <div className="tutorial-panel tutorial-main-panel">
          <span className="tutorial-corner tutorial-corner--tl" aria-hidden />
          <span className="tutorial-corner tutorial-corner--tr" aria-hidden />
          <span className="tutorial-corner tutorial-corner--bl" aria-hidden />
          <span className="tutorial-corner tutorial-corner--br" aria-hidden />
          <div className="tutorial-panel-glow" aria-hidden />

          <header className="tutorial-header">
            <div className="tutorial-header-row">
              <div className="tutorial-naria-row">
                <div className="tutorial-naria-avatar" aria-hidden>
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="tutorial-quest-pill">
                    <Sparkles className="w-3 h-3" />
                    {t("tutorial.quest.title")}
                  </div>
                  <div className="tutorial-naria-name">{t("tutorial.naria.name")}</div>
                  <div className="tutorial-naria-role">{t("tutorial.naria.role")}</div>
                </div>
              </div>
              <button
                type="button"
                className="tutorial-minimize-btn"
                onClick={minimize}
                aria-label={t("tutorial.actions.minimize")}
                title={t("tutorial.actions.minimize")}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
            <TutorialStepper viewIndex={viewIndex} completedSteps={state.completedSteps} user={user} />
          </header>

          <div className="tutorial-body">
            <TutorialStepCard
              titleKey={step.titleKey}
              textKey={step.textKey}
              showRewards={isLast}
              stepNumber={viewIndex + 1}
              replayMode={Boolean(state.replayMode && state.rewardsClaimed)}
            />
            {isLast && !canComplete && missingSteps.length > 0 && (
              <div className="tutorial-warning" data-testid="tutorial-incomplete-warning">
                <p className="tutorial-warning-title">{t("tutorial.error.incompleteTitle")}</p>
                <ul className="tutorial-warning-list">
                  {missingSteps.map((id) => (
                    <li key={id}>{t(CHECKLIST_LABEL_KEYS[id] || id)}</li>
                  ))}
                </ul>
              </div>
            )}
            <TutorialChecklist checklist={state.checklist} compact currentStepId={step.id} />
            {showFaq && (
              <div className="tutorial-faq" data-testid="tutorial-faq">
                <div className="tutorial-checklist-title">{t("tutorial.faq.title")}</div>
                {FAQ_ITEMS.map((item) => (
                  <div key={item.q} className="tutorial-faq-item">
                    <div className="tutorial-faq-q">{t(item.q)}</div>
                    <div className="tutorial-faq-a">{t(item.a)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="tutorial-actions">
            <div className="tutorial-actions-left">
              {!isFirst && (
                <button type="button" className="tutorial-btn tutorial-btn--ghost" onClick={goPrev} disabled={loading}>
                  {t("tutorial.actions.previous")}
                </button>
              )}
              <button
                type="button"
                className={`tutorial-btn tutorial-btn--ghost${showFaq ? " tutorial-btn--active" : ""}`}
                onClick={() => setShowFaq((v) => !v)}
              >
                {t("tutorial.faq.toggle")}
              </button>
            </div>

            <div className="tutorial-actions-right">
              {hasGoTo && (
                <button type="button" className="tutorial-btn tutorial-btn--violet" onClick={handleGoTo} disabled={loading}>
                  {t("tutorial.actions.goTo")}
                </button>
              )}
              <button
                type="button"
                className="tutorial-btn tutorial-btn--primary"
                onClick={handlePrimary}
                disabled={loading || (isLast && !canComplete)}
              >
                {primaryLabel}
              </button>
              {!state.completed && (
                <button type="button" className="tutorial-btn tutorial-btn--ghost tutorial-btn--skip" onClick={skip} disabled={loading}>
                  {t("tutorial.actions.skip")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </TutorialOverlay>
  );
}
