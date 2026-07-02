import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  canCompleteTutorial,
  firstIncompleteViewIndex,
  missingRequiredSteps,
  stepIndex,
  stepMetaById,
  TUTORIAL_STEP_META,
  CHECKLIST_LABEL_KEYS,
} from "@/lib/onboarding-steps";
import { isTutorialPermanentlyFinished } from "@/lib/onboarding-lock";

const OnboardingContext = createContext(null);

export function openOnboarding(options = {}) {
  window.dispatchEvent(new CustomEvent("nexoria:open-onboarding", { detail: options }));
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}

export function useOnboardingOptional() {
  return useContext(OnboardingContext);
}

export function OnboardingProvider({ children }) {
  const { user, refresh } = useAuth();
  const [state, setState] = useState(null);
  const [open, setOpen] = useState(false);
  const [viewIndex, setViewIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [exploringPaused, setExploringPaused] = useState(false);
  const autoStartedRef = useRef(false);
  const stepInflightRef = useRef(new Set());
  const pausedRef = useRef(false);
  const pauseReasonRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const load = useCallback(async () => {
    if (!user) {
      setState(null);
      return null;
    }
    try {
      const { data } = await api.get("/onboarding/me");
      setState(data);
      return data;
    } catch {
      return null;
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load, user?.user_id]);

  useEffect(() => {
    const onOpen = async (e) => {
      const replay = Boolean(e.detail?.replay);

      let data;
      try {
        const res = await api.get("/onboarding/me");
        data = res.data;
        setState(data);
      } catch (err) {
        const msg = formatApiError(err);
        if (err?.response?.status === 401) {
          toast.error("Session expirée — reconnecte-toi pour accéder au guide.");
        } else if (msg) {
          toast.error(msg);
        }
        return;
      }

      if (isTutorialPermanentlyFinished(user, data)) {
        toast.info("Quête déjà accomplie — le didacticiel ne peut plus être rouvert.");
        return;
      }

      setManualOpen(true);
      setShowFaq(Boolean(e.detail?.faq));
      if (replay) {
        try {
          const { data: replayData } = await api.post("/onboarding/replay", {});
          setState(replayData);
          setViewIndex(0);
          setOpen(true);
        } catch (err) {
          toast.error(formatApiError(err));
        }
      } else {
        setViewIndex(firstIncompleteViewIndex(data, user));
        setOpen(true);
      }
    };
    window.addEventListener("nexoria:open-onboarding", onOpen);
    return () => window.removeEventListener("nexoria:open-onboarding", onOpen);
  }, [load, user]);

  useEffect(() => {
    if (!user || !state || manualOpen) return;
    if (!state.eligible) return;
    if (state.completed || state.skipped) return;
    if (!state.shouldAutoOpen || autoStartedRef.current) return;
    autoStartedRef.current = true;
    setViewIndex(firstIncompleteViewIndex(state, user));
    setOpen(true);
    api.post("/onboarding/start", { replay: false }).then((r) => {
      setState(r.data);
      setViewIndex(firstIncompleteViewIndex(r.data, user));
    }).catch(() => {});
  }, [user, state, manualOpen]);

  const currentStepId = TUTORIAL_STEP_META[viewIndex]?.id || "welcome";

  const reportStep = useCallback(async (stepId, event = "visit") => {
    const step = typeof stepId === "string" ? stepId.trim() : "";
    const evt = typeof event === "string" ? event.trim() : "visit";
    if (!user || !stateRef.current?.eligible || !step || step.length < 2) return null;
    const key = `${step}:${evt}`;
    if (stepInflightRef.current.has(key)) return null;
    stepInflightRef.current.add(key);
    setLoading(true);
    try {
      const { data } = await api.post("/onboarding/step", { step, event: evt });
      setState(data);
      refresh().catch(() => {});
      if (data.rewards && !data.rewards.already_claimed) {
        toast.success(`+${data.rewards.xp} XP · +${data.rewards.aether} Écus`);
      }
      return data;
    } catch (err) {
      if (!pausedRef.current && !pauseReasonRef.current) {
        toast.error(formatApiError(err) || "Erreur didacticiel");
      }
      return null;
    } finally {
      stepInflightRef.current.delete(key);
      setLoading(false);
    }
  }, [user, refresh]);

  const start = useCallback(async (replay = false) => {
    setLoading(true);
    try {
      const { data } = await api.post("/onboarding/start", { replay });
      setState(data);
      setViewIndex(firstIncompleteViewIndex(data, user));
      setOpen(true);
      return data;
    } catch (err) {
      toast.error(formatApiError(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const skip = useCallback(async () => {
    pausedRef.current = false;
    pauseReasonRef.current = null;
    setExploringPaused(false);
    setLoading(true);
    try {
      const { data } = await api.post("/onboarding/skip", {});
      setState(data);
      setOpen(false);
      setManualOpen(false);
      await refresh();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const redirectToMissingStep = useCallback(() => {
    const missing = missingRequiredSteps(stateRef.current, user);
    if (!missing.length) return false;
    const idx = stepIndex(missing[0]);
    if (idx >= 0) setViewIndex(idx);
    return missing;
  }, [user]);

  const finish = useCallback(async () => {
    if (!user || !stateRef.current?.eligible) return null;

    if (!canCompleteTutorial(stateRef.current, user)) {
      const missing = redirectToMissingStep();
      if (missing) {
        const labels = missing.map((id) => CHECKLIST_LABEL_KEYS[id] || id).join(", ");
        toast.error(`Étapes restantes : ${labels}`);
      }
      return null;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/onboarding/complete", {});
      setState(data);
      pausedRef.current = false;
      pauseReasonRef.current = null;
      setExploringPaused(false);
      if (data?.completed) {
        window.dispatchEvent(new CustomEvent("nexoria:tutorial-completed"));
      }
      try {
        await refresh();
      } catch {
        /* refresh gère déjà la session */
      }
      if (data.rewards?.already_claimed) {
        toast.info("Récompenses déjà obtenues — quête accomplie !");
      } else if (data.rewards) {
        toast.success(`+${data.rewards.xp} XP · +${data.rewards.aether} Écus`);
      }
      if (data?.completed) {
        setOpen(false);
        setManualOpen(false);
      }
      return data;
    } catch (err) {
      toast.error(formatApiError(err) || "Erreur didacticiel");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, refresh, redirectToMissingStep]);

  const goNext = useCallback(async () => {
    const step = TUTORIAL_STEP_META[viewIndex];
    if (!step || step.id === "complete") return;

    const nextStep = TUTORIAL_STEP_META[viewIndex + 1];
    if (nextStep?.id === "complete" && !canCompleteTutorial(stateRef.current, user)) {
      const missing = redirectToMissingStep();
      if (missing) {
        const labels = missing.map((id) => CHECKLIST_LABEL_KEYS[id] || id).join(", ");
        toast.error(`Termine d'abord : ${labels}`);
      }
      return;
    }

    const done = (stateRef.current?.completedSteps || []).includes(step.id)
      || (step.id === "class" && user?.class_id);

    if (step.id === "welcome") {
      await reportStep("welcome", "advance");
    } else if (!done) {
      const event = step.acknowledge ? "acknowledge" : "advance";
      const data = await reportStep(step.id, event);
      if (!data) return;
    }

    if (viewIndex < TUTORIAL_STEP_META.length - 1) {
      setViewIndex((i) => i + 1);
    }
  }, [viewIndex, reportStep, user, redirectToMissingStep]);

  const goPrev = useCallback(() => {
    setViewIndex((i) => Math.max(0, i - 1));
  }, []);

  const acknowledge = useCallback(async () => {
    const step = TUTORIAL_STEP_META[viewIndex];
    if (!step) return;
    const data = await reportStep(step.id, "acknowledge");
    if (!data) return;
    if (viewIndex < TUTORIAL_STEP_META.length - 1) {
      setViewIndex((i) => i + 1);
    }
  }, [viewIndex, reportStep]);

  const visitStep = useCallback(async (stepId) => {
    return reportStep(stepId, "visit");
  }, [reportStep]);

  const pauseForExplore = useCallback((reason) => {
    pausedRef.current = true;
    pauseReasonRef.current = reason;
    setExploringPaused(true);
    setManualOpen(true);
    setOpen(false);
    setShowFaq(false);
  }, []);

  const resumeFromPause = useCallback(async (reason) => {
    if (!pausedRef.current) return;
    if (reason && pauseReasonRef.current && pauseReasonRef.current !== reason) return;

    const pausedStep = pauseReasonRef.current;

    let latest = stateRef.current;
    if (user) {
      try {
        const { data } = await api.get("/onboarding/me");
        latest = data;
        setState(data);
      } catch { /* keep cached state */ }
    }

    pausedRef.current = false;
    pauseReasonRef.current = null;
    setExploringPaused(false);

    if (latest?.completed || latest?.skipped || latest?.locked) return;

    const stepIdx = TUTORIAL_STEP_META.findIndex((s) => s.id === pausedStep);
    if (stepIdx >= 0 && (latest?.completedSteps || []).includes(pausedStep)) {
      setViewIndex(Math.min(stepIdx + 1, TUTORIAL_STEP_META.length - 1));
    } else if (stepIdx >= 0) {
      setViewIndex(stepIdx);
    } else {
      setViewIndex(firstIncompleteViewIndex(latest, user));
    }
    setOpen(true);
  }, [user]);

  useEffect(() => {
    const onHeroClosed = () => resumeFromPause("profile");
    const onNexusClosed = () => resumeFromPause("nexus");
    window.addEventListener("nexoria:hero-card-closed", onHeroClosed);
    window.addEventListener("nexoria:nexus-closed", onNexusClosed);
    return () => {
      window.removeEventListener("nexoria:hero-card-closed", onHeroClosed);
      window.removeEventListener("nexoria:nexus-closed", onNexusClosed);
    };
  }, [resumeFromPause]);

  /** Ferme l'overlay sans abandonner la quête (réouverture via ? Guide). */
  const minimize = useCallback(() => {
    setOpen(false);
    setShowFaq(false);
    if (!pausedRef.current) setManualOpen(true);
  }, []);

  const close = useCallback(() => {
    pausedRef.current = false;
    pauseReasonRef.current = null;
    setExploringPaused(false);
    setOpen(false);
    setManualOpen(false);
    setShowFaq(false);
  }, []);

  const value = useMemo(() => ({
    state,
    open,
    exploringPaused,
    setOpen,
    viewIndex,
    setViewIndex,
    currentStepId,
    loading,
    showFaq,
    setShowFaq,
    load,
    start,
    skip,
    finish,
    goNext,
    goPrev,
    acknowledge,
    visitStep,
    reportStep,
    close,
    minimize,
    pauseForExplore,
    resumeFromPause,
    stepMeta: stepMetaById(currentStepId),
    stepIndex: stepIndex(currentStepId),
    isDone: (id) => {
      if ((state?.completedSteps || []).includes(id)) return true;
      if (id === "class" && user?.class_id) return true;
      return false;
    },
    canComplete: canCompleteTutorial(state, user),
    missingSteps: missingRequiredSteps(state, user),
  }), [
    state, open, exploringPaused, viewIndex, currentStepId, loading, showFaq, user,
    load, start, skip, finish, goNext, goPrev, acknowledge, visitStep, reportStep, close,
    minimize, pauseForExplore, resumeFromPause,
  ]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
