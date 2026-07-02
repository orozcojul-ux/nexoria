import React from "react";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { openOnboarding, useOnboardingOptional } from "@/contexts/OnboardingContext";
import { useI18n } from "@/contexts/I18nContext";
import { isTutorialPermanentlyFinished } from "@/lib/onboarding-lock";
import "./onboarding.css";

export default function TutorialHelpButton() {
  const { user } = useAuth();
  const { t } = useI18n();
  const onboarding = useOnboardingOptional();

  if (!user || user.system_key || user.is_system) return null;

  const finished = isTutorialPermanentlyFinished(user, onboarding?.state);
  const exploring = Boolean(onboarding?.exploringPaused);

  if (finished && !exploring) return null;

  const handleClick = () => {
    if (exploring) {
      onboarding.resumeFromPause();
      return;
    }
    openOnboarding();
  };

  return (
    <button
      type="button"
      className="tutorial-help-btn"
      data-testid="tutorial-help-btn"
      onClick={handleClick}
      title={exploring ? t("tutorial.actions.resume") : t("tutorial.guide.title")}
    >
      <BookOpen className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span>{exploring ? t("tutorial.actions.resume") : t("tutorial.actions.help")}</span>
    </button>
  );
}
