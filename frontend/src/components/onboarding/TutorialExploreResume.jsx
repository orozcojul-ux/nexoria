import React from "react";
import { BookOpen } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useOnboardingOptional } from "@/contexts/OnboardingContext";
import "./onboarding.css";

/** Bouton flottant pour reprendre le didacticiel après « Y aller ». */
export default function TutorialExploreResume() {
  const { t } = useI18n();
  const onboarding = useOnboardingOptional();

  const show = onboarding?.exploringPaused
    && onboarding?.state?.eligible
    && !onboarding.state.completed
    && !onboarding.state.locked
    && !onboarding.state.skipped;

  if (!show) return null;

  return (
    <button
      type="button"
      className="tutorial-resume-btn"
      data-testid="tutorial-resume-btn"
      onClick={() => onboarding.resumeFromPause()}
    >
      <BookOpen className="w-4 h-4 shrink-0" aria-hidden />
      <span>{t("tutorial.actions.resume")}</span>
    </button>
  );
}
