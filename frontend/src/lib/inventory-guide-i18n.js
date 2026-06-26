/** Build inventory guide content from i18n keys (replaces hardcoded INVENTORY_*_GUIDE). */

const TAB_STEP_COUNTS = {
  relics: 5,
  cosmetics: 4,
  boosts: 3,
  consumables: 5,
  perks: 3,
  mounts: 3,
  auras: 3,
};

export function getInventoryTabGuide(t, tabId) {
  if (!TAB_STEP_COUNTS[tabId]) return null;
  const steps = [];
  for (let i = 0; i < TAB_STEP_COUNTS[tabId]; i += 1) {
    steps.push(t(`inventory.guide.tab.${tabId}.step.${i}`));
  }
  return {
    title: t(`inventory.guide.tab.${tabId}.title`),
    summary: t(`inventory.guide.tab.${tabId}.summary`),
    steps,
  };
}

export function getInventoryTabGuides(t) {
  return Object.fromEntries(
    Object.keys(TAB_STEP_COUNTS).map((id) => [id, getInventoryTabGuide(t, id)]),
  );
}

export function getInventoryActionsGuide(t) {
  return [0, 1, 2, 3].map((i) => ({
    title: t(`inventory.guide.action.${i}.title`),
    text: t(`inventory.guide.action.${i}.text`),
  }));
}

export function getInventorySourcesGuide(t) {
  return [0, 1, 2, 3, 4, 5, 6].map((i) => ({
    title: t(`inventory.guide.source.${i}.title`),
    text: t(`inventory.guide.source.${i}.text`),
  }));
}
