import React from "react";
import { Gift, ScrollText, Sparkles } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

export default function TutorialStepCard({ titleKey, textKey, showRewards = false, stepNumber, replayMode }) {
  const { t } = useI18n();
  return (
    <div className="tutorial-step-card" data-testid="tutorial-step-card">
      <div className="tutorial-step-card-frame" aria-hidden />
      {stepNumber != null && (
        <div className="tutorial-step-badge">
          <Sparkles className="w-3 h-3" aria-hidden />
          {t("tutorial.step.badge", { n: stepNumber })}
        </div>
      )}
      <h3 className="tutorial-step-title">{t(titleKey)}</h3>
      <div className="tutorial-step-divider" aria-hidden />
      <p className="tutorial-step-text">{t(textKey)}</p>
      {showRewards && (
        <div className="tutorial-rewards">
          <div className="tutorial-rewards-heading">
            <Gift className="w-4 h-4" aria-hidden />
            {replayMode ? t("tutorial.reward.replayNote") : t("tutorial.reward.heading")}
          </div>
          <div className="tutorial-rewards-chips">
            <span className="tutorial-reward-chip">{t("tutorial.reward.xp")}</span>
            <span className="tutorial-reward-chip">{t("tutorial.reward.aether")}</span>
            <span className="tutorial-reward-chip">{t("tutorial.reward.badge")}</span>
          </div>
        </div>
      )}
      <ScrollText className="tutorial-step-scroll-icon" aria-hidden />
    </div>
  );
}
