/** Réglages visuels Nexus Online (AutoSprite par classe). */

import Phaser from "phaser";
import { normalizeClassKey, CLASS_IMAGE_FILES } from "./badge-assets";

// Taille visuelle des personnages Nexus Online.
// Augmenter cette valeur pour rendre les avatars plus grands (essayer 120, 140, 160).
export const PLAYER_SPRITE_HEIGHT = 140;

/**
 * Correction verticale pieds ↔ ombre (frames AutoSprite 256×256 avec transparence).
 * Tester : 0, 8, -8 selon l’alignement visuel.
 */
export const PLAYER_SPRITE_Y_OFFSET = 0;

/** Espace entre le sommet du sprite et le pseudo. */
export const PLAYER_NAME_GAP = 14;

/** Offset Y du pseudo (au-dessus de la tête). */
export const PLAYER_NAME_OFFSET_Y = -PLAYER_SPRITE_HEIGHT - PLAYER_NAME_GAP;

/** Offset Y de la ligne classe / niveau. */
export const PLAYER_SUB_OFFSET_Y = -(PLAYER_SPRITE_HEIGHT - 8);

/** Offset Y des bulles de chat. */
export const PLAYER_BUBBLE_OFFSET_Y = PLAYER_SPRITE_HEIGHT + 28;

/** Ombre sous les pieds — proportionnelle à la taille du personnage. */
export const PLAYER_SHADOW_WIDTH = PLAYER_SPRITE_HEIGHT * 0.55;
export const PLAYER_SHADOW_HEIGHT = PLAYER_SPRITE_HEIGHT * 0.18;
export const PLAYER_SHADOW_Y = 2;

/** Vitesse des animations de marche (frames/s) — ajuster ici (8–10 recommandé). */
export const NEXUS_CLASS_WALK_FRAME_RATE = 10;

/** Vitesse animation idle (frames/s). */
export const NEXUS_CLASS_IDLE_FRAME_RATE = 8;

export const NEXUS_ONLINE_TEST_ROOM_ID = "place_centrale";
export const NEXUS_ONLINE_DEFAULT_ASSET_KEY = "chronomancien";

export const NEXUS_ONLINE_ROOM_BG = "/assets/nexus-online/rooms/place-centrale.png";
/** PNG fixe de secours si les spritesheets AutoSprite ne chargent pas. */
export const NEXUS_ONLINE_PLAYER_SPRITE = "/assets/nexus-online/characters/chronomancien.png";

export const NEXUS_ONLINE_TEXTURE_KEYS = {
  roomBg: "nexus_online_room_bg",
  player: "nexus_online_player_sprite",
};

/** Grille AutoSprite commune : 1280×1280, 5×5, 25 frames. */
export const AUTOSPRITE_FRAME = {
  width: 256,
  height: 256,
  count: 25,
};

/**
 * Mapping classe → dossier d'assets (`characters/{classKey}/`).
 * Couvre les ids EN backend et les noms FR affichés.
 */
export const CLASS_ID_TO_ASSET_KEY = {
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

/** Alias explicite demandé par le mapping produit. */
export const CLASS_TO_CHARACTER_KEY = CLASS_ID_TO_ASSET_KEY;

const SHEET_POSES = ["idle_up", "walk_down", "walk_up", "walk_right"];

export function isNexusOnlineTestRoom(room) {
  return room?.id === NEXUS_ONLINE_TEST_ROOM_ID;
}

/** Normalise toute valeur de classe (id EN, nom FR, casse, accents). */
export function normalizeClassName(value) {
  if (!value) return NEXUS_ONLINE_DEFAULT_ASSET_KEY;
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

/** Convertit class_id / class_name en clé dossier assets. */
export function resolveClassAssetKey(classId, className) {
  const fromId = normalizeClassName(classId);
  const fromName = normalizeClassName(className);
  return CLASS_ID_TO_ASSET_KEY[fromId]
    || CLASS_ID_TO_ASSET_KEY[fromName]
    || CLASS_IMAGE_FILES[fromId]
    || CLASS_IMAGE_FILES[fromName]
    || NEXUS_ONLINE_DEFAULT_ASSET_KEY;
}

function sheetPaths(assetKey, pose) {
  const base = `/assets/nexus-online/characters/${assetKey}`;
  return {
    iso: `${base}/${assetKey}-iso_${pose}.png`,
    clean: `${base}/${pose}.png`,
  };
}

export function classTextureKey(assetKey, pose) {
  return `${assetKey}_${pose}`;
}

function classTextureKeyClean(assetKey, pose) {
  return `${classTextureKey(assetKey, pose)}__clean`;
}

export function classAnimKey(assetKey, pose) {
  return `${assetKey}_${pose}_anim`;
}

export function getClassSheetConfig(assetKey) {
  return Object.fromEntries(
    SHEET_POSES.map((pose) => {
      const paths = sheetPaths(assetKey, pose);
      return [pose, {
        key: classTextureKey(assetKey, pose),
        cleanKey: classTextureKeyClean(assetKey, pose),
        path: paths.iso,
        cleanPath: paths.clean,
      }];
    }),
  );
}

function sheetReady(scene, textureKey) {
  if (!scene.textures.exists(textureKey)) return false;
  return (scene.textures.get(textureKey).frameTotal || 0) >= AUTOSPRITE_FRAME.count;
}

/** Choisit la texture chargée : AutoSprite `-iso_` en priorité, sinon format propre. */
export function resolveActiveTextureKey(scene, assetKey, pose) {
  const primary = classTextureKey(assetKey, pose);
  const clean = classTextureKeyClean(assetKey, pose);
  if (sheetReady(scene, primary)) return primary;
  if (sheetReady(scene, clean)) return clean;
  return primary;
}

export function classAutospriteReady(scene, assetKey) {
  return sheetReady(scene, resolveActiveTextureKey(scene, assetKey, "idle_up"));
}

export function collectAssetKeysForPreload(players = []) {
  const keys = new Set([NEXUS_ONLINE_DEFAULT_ASSET_KEY]);
  players.forEach((p) => {
    if (!p) return;
    keys.add(resolveClassAssetKey(p.class_id, p.class_name));
  });
  return [...keys];
}

export function preloadNexusOnlineClassAssets(scene, assetKeys) {
  const { width, height } = AUTOSPRITE_FRAME;
  [...new Set(assetKeys)].forEach((assetKey) => {
    Object.values(getClassSheetConfig(assetKey)).forEach(({ key, cleanKey, path, cleanPath }) => {
      if (!scene.textures.exists(key)) {
        scene.load.spritesheet(key, path, { frameWidth: width, frameHeight: height });
      }
      if (!scene.textures.exists(cleanKey)) {
        scene.load.spritesheet(cleanKey, cleanPath, { frameWidth: width, frameHeight: height });
      }
    });
  });
}

export function preloadNexusOnlineTestAssets(scene, players = []) {
  const { roomBg, player } = NEXUS_ONLINE_TEXTURE_KEYS;

  if (!scene.textures.exists(roomBg)) {
    scene.load.image(roomBg, NEXUS_ONLINE_ROOM_BG);
  }
  preloadNexusOnlineClassAssets(scene, collectAssetKeysForPreload(players));
  if (!scene.textures.exists(player)) {
    scene.load.image(player, NEXUS_ONLINE_PLAYER_SPRITE);
  }
}

function warnAutospriteFallback(assetKey, reason) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn(`[Nexus Online] AutoSprite ${assetKey} ${reason} — fallback ${NEXUS_ONLINE_DEFAULT_ASSET_KEY}`);
}

function createSheetAnimation(scene, animKeyName, textureKeyName, frameRate) {
  if (!sheetReady(scene, textureKeyName)) return false;
  if (scene.anims.exists(animKeyName)) scene.anims.remove(animKeyName);
  scene.anims.create({
    key: animKeyName,
    frames: scene.anims.generateFrameNumbers(textureKeyName, {
      start: 0,
      end: AUTOSPRITE_FRAME.count - 1,
    }),
    frameRate,
    repeat: -1,
  });
  return scene.anims.exists(animKeyName);
}

/** Crée les 4 animations AutoSprite pour une classe. Retourne true si idle_up est prêt. */
export function setupClassAutospriteAnimations(scene, assetKey) {
  if (!classAutospriteReady(scene, assetKey)) {
    warnAutospriteFallback(assetKey, "idle_up indisponible");
    return false;
  }

  SHEET_POSES.forEach((pose) => {
    const texKey = resolveActiveTextureKey(scene, assetKey, pose);
    const frameRate = pose === "idle_up" ? NEXUS_CLASS_IDLE_FRAME_RATE : NEXUS_CLASS_WALK_FRAME_RATE;
    createSheetAnimation(scene, classAnimKey(assetKey, pose), texKey, frameRate);
  });

  if (!scene.anims.exists(classAnimKey(assetKey, "idle_up"))) {
    warnAutospriteFallback(assetKey, "animation idle_up non créée");
    return false;
  }
  return true;
}

/** Initialise les animations pour les classes présentes (+ fallback). */
export function setupNexusOnlineAutospriteAnimations(scene, assetKeys = []) {
  const ready = new Set();
  [...new Set([NEXUS_ONLINE_DEFAULT_ASSET_KEY, ...assetKeys])].forEach((assetKey) => {
    if (setupClassAutospriteAnimations(scene, assetKey)) ready.add(assetKey);
  });
  return ready;
}

/**
 * Résout la classe effective (fallback Chronomancien uniquement si assets absents).
 * @returns {{ assetKey: string, characterKey: string, fallback: boolean }}
 */
export function resolvePlayerClassAssetKey(scene, classId, className) {
  const characterKey = resolveClassAssetKey(classId, className);
  if (classAutospriteReady(scene, characterKey)) {
    return { assetKey: characterKey, characterKey, fallback: false };
  }
  if (characterKey !== NEXUS_ONLINE_DEFAULT_ASSET_KEY) {
    warnAutospriteFallback(characterKey, "assets manquants");
  }
  const fallback = characterKey !== NEXUS_ONLINE_DEFAULT_ASSET_KEY;
  return { assetKey: NEXUS_ONLINE_DEFAULT_ASSET_KEY, characterKey, fallback };
}

/**
 * Choisit l'animation selon le déplacement écran (dx, dy).
 * y↑ = walk_down | y↓ = walk_up | x→ = walk_right | x← = walk_right + flipX
 */
export function resolveClassAutospriteAnim(assetKey, moving, dx, dy) {
  if (!moving) {
    return { animKey: classAnimKey(assetKey, "idle_up"), flipX: false };
  }
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx > ady) {
    return {
      animKey: classAnimKey(assetKey, "walk_right"),
      flipX: dx < 0,
    };
  }
  if (dy > 0) {
    return { animKey: classAnimKey(assetKey, "walk_down"), flipX: false };
  }
  return { animKey: classAnimKey(assetKey, "walk_up"), flipX: false };
}

/** Retourne une animKey valide (fallback idle_up Chronomancien si sheet manquante). */
export function pickClassAnimKey(scene, assetKey, animKeyName) {
  if (scene.anims.exists(animKeyName)) return animKeyName;
  const idle = classAnimKey(assetKey, "idle_up");
  if (scene.anims.exists(idle)) return idle;
  return classAnimKey(NEXUS_ONLINE_DEFAULT_ASSET_KEY, "idle_up");
}

export function logNexusPlayerClass(username, classId, className, assetKey) {
  if (process.env.NODE_ENV !== "development") return;
  console.log("Nexus player class:", username, classId || className, assetKey);
}

export function logLocalNexusClassResolved(scene, p, isLocal) {
  if (process.env.NODE_ENV !== "development" || !isLocal) return;
  const rawClass = p?.class_id || p?.class_name;
  const normalizedClass = normalizeClassName(rawClass);
  const characterKey = resolveClassAssetKey(p?.class_id, p?.class_name);
  const textureKey = resolveActiveTextureKey(scene, characterKey, "idle_up");
  console.log("Local Nexus class resolved:", {
    rawClass,
    class_id: p?.class_id,
    class_name: p?.class_name,
    normalizedClass,
    characterKey,
    textureKey,
  });
}

export function spriteScaleForHeight(texture, targetHeight = PLAYER_SPRITE_HEIGHT) {
  const img = texture?.getSourceImage?.();
  const frame = texture?.get?.(0);
  const h = frame?.height || img?.height || targetHeight;
  return targetHeight / h;
}

/** Applique échelle, ancrage au sol et offset vertical au sprite joueur Nexus Online. */
export function applyCharacterVisualScale(sprite, texture, options = {}) {
  const targetHeight = options.targetHeight ?? PLAYER_SPRITE_HEIGHT;
  const yOffset = options.yOffset ?? PLAYER_SPRITE_Y_OFFSET;
  const scale = spriteScaleForHeight(texture, targetHeight);
  sprite.setOrigin(0.5, 1);
  sprite.setScale(scale);
  sprite.y = yOffset;
  if (sprite.texture) {
    sprite.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  return scale;
}

/** Ombre elliptique discrète sous les pieds (joueur local + autres joueurs). */
export function createNexusPlayerShadow(scene) {
  return scene.add.ellipse(
    0,
    PLAYER_SHADOW_Y,
    PLAYER_SHADOW_WIDTH,
    PLAYER_SHADOW_HEIGHT,
    0x000000,
    0.32,
  );
}

export function computeWalkBoundsFromImage(worldW, worldH, texture) {
  const img = texture?.getSourceImage?.();
  if (!img?.width || !img?.height) {
    return { minX: 24, minY: 48, maxX: worldW - 24, maxY: worldH - 24 };
  }
  const scale = Math.min(worldW / img.width, worldH / img.height);
  const dispW = img.width * scale;
  const dispH = img.height * scale;
  const cx = worldW / 2;
  const cy = worldH / 2;
  const padX = Math.max(8, dispW * 0.03);
  const padY = Math.max(12, dispH * 0.04);
  return {
    minX: cx - dispW / 2 + padX,
    maxX: cx + dispW / 2 - padX,
    minY: cy - dispH / 2 + padY,
    maxY: cy + dispH / 2 - padY,
  };
}

export function clampPoint(bounds, x, y) {
  if (!bounds) return { x, y };
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, y)),
  };
}

export function isInsideWalkBounds(bounds, x, y) {
  if (!bounds) return true;
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}
