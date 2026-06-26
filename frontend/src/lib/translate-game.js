/** Translate static game catalog fields (quests, challenges, class details). */

const CLASS_ID_ALIASES = {
  guerrier: "warrior",
  explorateur: "explorer",
  necromancien: "necromancer",
  architecte: "architect",
  chronomancien: "chronomancer",
  inventeur: "inventor",
  alchimiste: "alchemist",
};

export function normalizeClassId(id) {
  const raw = (id || "").toLowerCase();
  return CLASS_ID_ALIASES[raw] || raw;
}

export function tGame(t, key, fallback = "") {
  if (!key) return fallback;
  const v = t(key);
  return v && v !== key ? v : fallback;
}

export function translateQuest(t, quest) {
  if (!quest) return quest;
  const id = quest.quest_id;
  return {
    ...quest,
    name: tGame(t, `quest.${id}.name`, quest.name),
    description: tGame(t, `quest.${id}.description`, quest.description),
  };
}

export function translateChallenge(t, challenge) {
  if (!challenge) return challenge;
  const id = challenge.challenge_id;
  return {
    ...challenge,
    name: tGame(t, `challenge.${id}.name`, challenge.name),
    description: tGame(t, `challenge.${id}.description`, challenge.description),
    action_label: tGame(t, `challenge.${id}.action_label`, challenge.action_label),
    reward_label: tGame(t, `challenge.${id}.reward_label`, challenge.reward_label),
  };
}

export function translateClassDetail(t, cls) {
  if (!cls) return cls;
  const id = normalizeClassId(cls.id || cls.name);
  const name = tGame(t, `class.${id}`, cls.name);
  const tagline = tGame(t, `class.${id}.tagline`, cls.tagline);
  const powers = (cls.powers || []).map((p) => ({
    ...p,
    name: tGame(t, `class.${id}.power.${p.id}.name`, p.name),
    description: tGame(t, `class.${id}.power.${p.id}.description`, p.description),
  }));
  return { ...cls, name, tagline, powers };
}

const AFFINITY_KEYS = {
  creativity: "affinity.creativity",
  persistence: "affinity.persistence",
  curiosity: "affinity.curiosity",
  leadership: "affinity.leadership",
  sociability: "affinity.sociability",
  ambition: "affinity.ambition",
  expertise: "affinity.expertise",
  discovery: "affinity.discovery",
  CRÉATIVITÉ: "affinity.creativity",
  PERSÉVÉRANCE: "affinity.persistence",
  CURIOSITÉ: "affinity.curiosity",
  LEADERSHIP: "affinity.leadership",
  SOCIAULITÉ: "affinity.sociability",
  SOCIABILITÉ: "affinity.sociability",
  AMBITION: "affinity.ambition",
  EXPERTISE: "affinity.expertise",
  DÉCOUVERTE: "affinity.discovery",
  TOUTES: "page.classes.filterAll",
};

export function translateAffinityLabel(t, labelOrKey) {
  const key = AFFINITY_KEYS[labelOrKey] || AFFINITY_KEYS[labelOrKey?.toUpperCase?.()];
  if (!key) return labelOrKey;
  return tGame(t, key, labelOrKey);
}

export function translateStatKey(t, statKey) {
  const key = AFFINITY_KEYS[statKey];
  if (!key) return statKey;
  return tGame(t, key, statKey);
}

export function translateRarity(t, rarityId) {
  if (!rarityId) return "";
  return tGame(t, `rarity.${rarityId}`, rarityId);
}

export function translateBadge(t, badge) {
  if (!badge) return badge;
  const id = badge.badge_id || badge.id;
  return {
    ...badge,
    name: tGame(t, `badge.${id}.name`, badge.name),
    description: tGame(t, `badge.${id}.description`, badge.description),
    categoryLabel: badge.category
      ? tGame(t, `badge.category.${badge.category}`, badge.category)
      : badge.categoryLabel,
  };
}

export function translateTitle(t, titleOrId, fallbackName) {
  if (titleOrId && typeof titleOrId === "object") {
    const id = titleOrId.id || titleOrId.title_id;
    const name = titleOrId.name;
    return tGame(t, `title.${id}`, name || fallbackName || id);
  }
  const id = titleOrId || "novice";
  return tGame(t, `title.${id}`, fallbackName || id.replace(/_/g, " "));
}

export function translateItem(t, item) {
  if (!item) return item;
  const id = item.item_id || item.id || item.template_id;
  const typeKey = item.type ? `item.type.${item.type}` : null;
  return {
    ...item,
    name: tGame(t, `item.${id}`, item.name),
    typeLabel: typeKey ? tGame(t, typeKey, item.type) : item.type,
    rarityLabel: item.rarity ? translateRarity(t, item.rarity) : item.rarityLabel,
  };
}

export function translateSkill(t, skill) {
  if (!skill) return skill;
  const id = skill.id || skill.skill_id;
  return {
    ...skill,
    name: tGame(t, `skill.${id}.name`, skill.name),
    description: tGame(t, `skill.${id}.description`, skill.description),
  };
}

export function translateBuilding(t, building) {
  if (!building) return building;
  const id = building.id || building.building_id;
  return {
    ...building,
    name: tGame(t, `building.${id}.name`, building.name),
    description: tGame(t, `building.${id}.description`, building.description),
  };
}

export function translateCraftResource(t, resource) {
  if (!resource) return resource;
  const id = resource.id || resource.resource_id;
  return {
    ...resource,
    name: tGame(t, `craft.resource.${id}`, resource.name),
  };
}

export function translateCraftRecipe(t, recipe) {
  if (!recipe) return recipe;
  const id = recipe.id || recipe.recipe_id;
  return {
    ...recipe,
    name: tGame(t, `craft.recipe.${id}.name`, recipe.name),
    description: recipe.description
      ? tGame(t, `craft.recipe.${id}.description`, recipe.description)
      : recipe.description,
  };
}

export function translateShopItem(t, item) {
  if (!item) return item;
  const sku = item.sku;
  return {
    ...item,
    name: tGame(t, `shop.item.${sku}.name`, item.name),
    description: tGame(t, `shop.item.${sku}.description`, item.description),
    rarityLabel: item.rarity ? translateRarity(t, item.rarity) : item.rarityLabel,
  };
}

export function translateEcuPackLabel(t, pack) {
  if (!pack) return pack;
  const id = pack.id;
  return {
    ...pack,
    label: tGame(t, `shop.ecu_pack.${id}`, pack.label),
  };
}

const DNA_STAT_KEYS = {
  creativity: "affinity.creativity",
  ambition: "affinity.ambition",
  sociability: "affinity.sociability",
  curiosity: "affinity.curiosity",
  persistence: "affinity.persistence",
  influence: "dna.influence",
};

export function translateDnaStat(t, statKey) {
  const key = DNA_STAT_KEYS[statKey];
  if (!key) return statKey;
  return tGame(t, key, statKey);
}
