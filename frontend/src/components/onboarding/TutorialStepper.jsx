import React from "react";
import { useI18n } from "@/contexts/I18nContext";
import { checklistProgress, TUTORIAL_STEP_META } from "@/lib/onboarding-steps";

const STEP_LABEL_KEYS = {
  welcome: "tutorial.step.welcome",
  profile: "tutorial.checklist.profile",
  class: "tutorial.checklist.class",
  community: "tutorial.checklist.community",
  nexus: "tutorial.checklist.nexus",
  chat: "tutorial.checklist.chat",
  progression: "tutorial.checklist.progression",
  complete: "tutorial.checklist.complete",
};

export default function TutorialStepper({ viewIndex, completedSteps = [], user }) {
  const { t } = useI18n();
  const doneSet = new Set(completedSteps);
  if (user?.class_id) doneSet.add("class");
  const { percent } = checklistProgress({ completedSteps: [...doneSet] }, user);

  return (
    <div className="tutorial-stepper" data-testid="tutorial-stepper">
      <div className="tutorial-stepper-track" aria-hidden>
        <div className="tutorial-stepper-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="tutorial-stepper-meta">
        <span className="tutorial-stepper-count">
          {t("tutorial.progress.label", { current: viewIndex + 1, total: TUTORIAL_STEP_META.length })}
        </span>
        <span className="tutorial-stepper-percent">{percent}%</span>
      </div>
      <div className="tutorial-stepper-dots" role="list" aria-label={t("tutorial.progress.aria")}>
        {TUTORIAL_STEP_META.map((step, i) => {
          const done = doneSet.has(step.id) || (step.id === "welcome" && i < viewIndex);
          const current = i === viewIndex;
          return (
            <div
              key={step.id}
              role="listitem"
              className={`tutorial-stepper-dot${done ? " tutorial-stepper-dot--done" : ""}${current ? " tutorial-stepper-dot--current" : ""}`}
              title={t(STEP_LABEL_KEYS[step.id] || step.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
