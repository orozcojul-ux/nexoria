/** Didacticiel terminé définitivement — plus de réouverture possible. */
export function isTutorialPermanentlyFinished(user, state) {
  return Boolean(state?.locked || state?.completed || user?.tutorialCompleted);
}
