/** Config canonique des étapes du Guide du Nouveau Héros. */
export const TUTORIAL_STEP_META = [
  { id: "welcome", titleKey: "tutorial.welcome.title", textKey: "tutorial.welcome.text", route: null },
  { id: "profile", titleKey: "tutorial.profile.title", textKey: "tutorial.profile.text", route: "profile", acknowledge: true },
  { id: "class", titleKey: "tutorial.class.title", textKey: "tutorial.class.text", route: "/classes", acknowledge: true },
  { id: "community", titleKey: "tutorial.community.title", textKey: "tutorial.community.text", route: "/communaute" },
  { id: "nexus", titleKey: "tutorial.nexusOnline.title", textKey: "tutorial.nexusOnline.text", route: "nexus" },
  { id: "chat", titleKey: "tutorial.chat.title", textKey: "tutorial.chat.text", acknowledge: true },
  { id: "progression", titleKey: "tutorial.rewards.title", textKey: "tutorial.rewards.text", route: "/inventory", acknowledge: true },
  { id: "complete", titleKey: "tutorial.complete.title", textKey: "tutorial.complete.text", route: null },
];

export const CHECKLIST_LABEL_KEYS = {
  profile: "tutorial.checklist.profile",
  class: "tutorial.checklist.class",
  community: "tutorial.checklist.community",
  nexus: "tutorial.checklist.nexus",
  chat: "tutorial.checklist.chat",
  progression: "tutorial.checklist.progression",
  complete: "tutorial.checklist.complete",
};

export const FAQ_ITEMS = [
  { q: "tutorial.faq.xp.q", a: "tutorial.faq.xp.a" },
  { q: "tutorial.faq.aether.q", a: "tutorial.faq.aether.a" },
  { q: "tutorial.faq.badges.q", a: "tutorial.faq.badges.a" },
  { q: "tutorial.faq.nexus.q", a: "tutorial.faq.nexus.a" },
  { q: "tutorial.faq.report.q", a: "tutorial.faq.report.a" },
  { q: "tutorial.faq.naria.q", a: "tutorial.faq.naria.a" },
  { q: "tutorial.faq.community.q", a: "tutorial.faq.community.a" },
];

export function stepMetaById(id) {
  return TUTORIAL_STEP_META.find((s) => s.id === id) || TUTORIAL_STEP_META[0];
}

export function stepIndex(id) {
  return TUTORIAL_STEP_META.findIndex((s) => s.id === id);
}

/** Index de la première étape non complétée (ou écran final). */
export function firstIncompleteViewIndex(state, user) {
  if (!state) return 0;
  const done = new Set(state.completedSteps || []);
  if (user?.class_id) done.add("class");
  for (let i = 0; i < TUTORIAL_STEP_META.length; i++) {
    const { id } = TUTORIAL_STEP_META[i];
    if (id === "complete") return canCompleteTutorial(state, user) ? i : Math.max(0, i - 1);
    if (id !== "welcome" && !done.has(id)) return i;
  }
  return TUTORIAL_STEP_META.length - 1;
}

export const REQUIRED_TUTORIAL_STEPS = [
  "profile", "class", "community", "nexus", "chat", "progression",
];

export function missingRequiredSteps(state, user) {
  const done = new Set(state?.completedSteps || []);
  if (user?.class_id) done.add("class");
  return REQUIRED_TUTORIAL_STEPS.filter((id) => !done.has(id));
}

export function canCompleteTutorial(state, user) {
  return missingRequiredSteps(state, user).length === 0;
}

export function checklistProgress(state, user) {
  const required = Object.keys(CHECKLIST_LABEL_KEYS).filter((id) => id !== "complete");
  const done = required.filter((id) => {
    if ((state?.completedSteps || []).includes(id)) return true;
    if (id === "class" && user?.class_id) return true;
    return false;
  }).length;
  return { done, total: required.length, percent: required.length ? Math.round((done / required.length) * 100) : 0 };
}
