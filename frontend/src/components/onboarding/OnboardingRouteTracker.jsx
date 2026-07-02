import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useOnboardingOptional } from "@/contexts/OnboardingContext";

const ROUTE_STEP_MAP = {
  "/hero": "profile",
  "/communaute": "community",
  "/classes": "class",
  "/inventory": "progression",
  "/quests": "progression",
};

/** Déclenche la validation d'étape quand le joueur visite une page clé. */
export default function OnboardingRouteTracker() {
  const location = useLocation();
  const onboarding = useOnboardingOptional();
  const reportStepRef = useRef(onboarding?.reportStep);
  const isDoneRef = useRef(onboarding?.isDone);
  const exploringRef = useRef(onboarding?.exploringPaused);
  const reportedRef = useRef(new Set());

  reportStepRef.current = onboarding?.reportStep;
  isDoneRef.current = onboarding?.isDone;
  exploringRef.current = onboarding?.exploringPaused;

  useEffect(() => {
    if (!onboarding?.state?.eligible) return;
    if (exploringRef.current) return;
    const path = location.pathname.replace(/\/$/, "") || "/";
    const stepId = ROUTE_STEP_MAP[path];
    if (!stepId || typeof stepId !== "string") return;
    if (isDoneRef.current?.(stepId)) return;
    if (reportedRef.current.has(stepId)) return;
    reportedRef.current.add(stepId);
    reportStepRef.current?.(stepId, "visit")?.finally?.(() => {
      if (isDoneRef.current?.(stepId)) return;
      reportedRef.current.delete(stepId);
    });
  }, [location.pathname, onboarding?.state?.eligible, onboarding?.exploringPaused]);

  useEffect(() => {
    if (!onboarding?.state?.completedSteps) return;
    onboarding.state.completedSteps.forEach((id) => reportedRef.current.add(id));
  }, [onboarding?.state?.completedSteps]);

  return null;
}
