import React, { useState } from "react";
import { ChevronDown, ChevronUp, Compass } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useOnboardingOptional } from "@/contexts/OnboardingContext";
import "./onboarding.css";

const HINT_KEYS = [
  "tutorial.nexus.hints.move",
  "tutorial.nexus.hints.chat",
  "tutorial.nexus.hints.hero",
  "tutorial.nexus.hints.inventory",
  "tutorial.nexus.hints.online",
  "tutorial.nexus.hints.rules",
];

/** Mini-aide non bloquante dans Nexus Online. */
export default function NexusOnboardingHints() {
  const { t } = useI18n();
  const onboarding = useOnboardingOptional();
  const [open, setOpen] = useState(false);

  const show = onboarding?.state?.eligible
    && (!onboarding.state.completed || onboarding.state.replayMode);

  if (!show) return null;

  return (
    <div className="tutorial-nexus-hints" data-testid="nexus-onboarding-hints">
      <button
        type="button"
        className="flex items-center justify-between w-full text-left mb-2"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-cyan-300 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5" />
          {t("tutorial.nexus.hints.title")}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
      </button>
      {open && (
        <ul>
          {HINT_KEYS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
