import React from "react";
import { Check, Scroll } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { CHECKLIST_LABEL_KEYS } from "@/lib/onboarding-steps";

export default function TutorialChecklist({ checklist, compact = false, currentStepId }) {
  const { t } = useI18n();
  const items = checklist?.length
    ? checklist
    : Object.keys(CHECKLIST_LABEL_KEYS).map((id) => ({ id, status: "pending" }));

  return (
    <div className={compact ? "tutorial-mobile-checklist" : "tutorial-checklist-wrap"} data-testid="tutorial-checklist">
      <div className="tutorial-checklist-header">
        <Scroll className="w-4 h-4" aria-hidden />
        <div className="tutorial-checklist-title">{t("tutorial.checklist.title")}</div>
      </div>
      <div className="tutorial-checklist-scroll">
        {items.map((item) => {
          const done = item.status === "done";
          const current = item.id === currentStepId || item.status === "current";
          return (
            <div
              key={item.id}
              className={`tutorial-checklist-item${done ? " tutorial-checklist-item--done" : ""}${current ? " tutorial-checklist-item--current" : ""}`}
            >
              <span className="tutorial-checklist-dot" aria-hidden>
                {done && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
              </span>
              <span>{t(CHECKLIST_LABEL_KEYS[item.id] || item.id)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
