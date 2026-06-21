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

/**
 * Class character art (premium portraits dropped in /assets/classes/).
 * Keys are normalized (lowercase, accents stripped) and cover both the
 * back-end EN ids and the FR display ids/names so any source resolves.
 */
export const CLASS_IMAGE_FILES = {
  mage: "mage",
  guerrier: "guerrier",
  warrior: "guerrier",
  assassin: "assassin",
  paladin: "paladin",
  alchimiste: "alchimiste",
  alchemist: "alchimiste",
  explorateur: "explorateur",
  explorer: "explorateur",
  necromancien: "necromancien",
  necromancer: "necromancien",
  architecte: "architecte",
  architect: "architecte",
  chronomancien: "chronomancien",
  chronomancer: "chronomancien",
  inventeur: "inventeur",
  inventor: "inventeur",
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

/** Normalize any class identifier (EN id, FR id or FR display name). */
export function normalizeClassKey(classId) {
  return String(classId || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Resolve the class character art URL. Always returns a path: if the id is
 * unknown it points to /assets/classes/default.png so the <img> onError can
 * fall back to a styled empty frame.
 */
export function getClassImageSrc(classId) {
  const file = CLASS_IMAGE_FILES[normalizeClassKey(classId)];
  return `${BASE}/assets/classes/${file || "default"}.png`;
}

export function getRarityBadgeSrc(rarity) {
  const file = RARITY_BADGE_FILES[rarity] || RARITY_BADGE_FILES.common;
  return assetUrl("rarities", file);
}

/** Achievement badges — fichier PNG nommé {badge_id}.png dans achievements/ */
export function getAchievementBadgeSrc(badgeId) {
  if (!badgeId) return null;
  return assetUrl("achievements", badgeId);
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
