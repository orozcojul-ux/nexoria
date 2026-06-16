import { rankFromLevel } from "@/lib/rank-styles";

const BASE = process.env.PUBLIC_URL || "";

/** RPG rank medallions (level progression) */
export const RANK_BADGE_FILES = {
  Novice: "novice",
  Initié: "initie",
  Rare: "rare",
  Épique: "epique",
  Légendaire: "legendaire",
  Mythique: "mythique",
  Divin: "divin",
  Cosmique: "cosmique",
};

/** Class sigils */
export const CLASS_BADGE_FILES = {
  mage: "mage",
  warrior: "warrior",
  assassin: "assassin",
  paladin: "paladin",
  alchemist: "alchemist",
  explorer: "explorer",
  necromancer: "necromancer",
  architect: "architect",
  chronomancer: "chronomancer",
  inventor: "inventor",
};

/** Achievement / item rarity frames */
export const RARITY_BADGE_FILES = {
  common: "common",
  rare: "rare",
  epic: "epic",
  legendary: "legendary",
  mythic: "mythic",
  divine: "divine",
  cosmic: "cosmic",
};

function assetUrl(folder, file) {
  return `${BASE}/assets/badges/${folder}/${file}.png`;
}

export function getRankBadgeSrc(rank) {
  const file = RANK_BADGE_FILES[rank];
  return file ? assetUrl("ranks", file) : assetUrl("ranks", "novice");
}

export function getClassBadgeSrc(classId) {
  const file = CLASS_BADGE_FILES[classId];
  return file ? assetUrl("classes", file) : null;
}

export function getRarityBadgeSrc(rarity) {
  const file = RARITY_BADGE_FILES[rarity] || RARITY_BADGE_FILES.common;
  return assetUrl("rarities", file);
}

export function resolveRank(userOrRank, level) {
  if (typeof userOrRank === "string") return userOrRank;
  if (userOrRank?.rank) return userOrRank.rank;
  return rankFromLevel(level ?? userOrRank?.level ?? 1);
}

export const RANK_BADGE_SIZES = {
  xs: 18,
  sm: 24,
  md: 32,
  lg: 44,
  xl: 56,
  xxl: 88,
  hero: 104,
};
