import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import NewHeroTutorial from "@/components/onboarding/NewHeroTutorial";
import OnboardingRouteTracker from "@/components/onboarding/OnboardingRouteTracker";
import TutorialExploreResume from "@/components/onboarding/TutorialExploreResume";

/** Hôte global du Guide du Nouveau Héros (provider monté dans App.js). */
export default function OnboardingHost() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <>
      <NewHeroTutorial />
      <TutorialExploreResume />
      <OnboardingRouteTracker />
    </>
  );
}
