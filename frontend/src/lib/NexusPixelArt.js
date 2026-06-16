/**
 * Nexus Pixel Art — textures procédurales premium + sprites décor
 */
import Phaser from "phaser";

export const TILE_W = 64;
export const TILE_H = 32;

export const CLASS_HEX = {
  mage: "#9D4CDD", warrior: "#EF4444", assassin: "#71717A", paladin: "#EAB308",
  alchemist: "#10B981", explorer: "#00BFFF", necromancer: "#7928CA",
  architect: "#A855F7", chronomancer: "#00E5FF", inventor: "#FFD700",
};

export const CLASS_COLOR_INT = Object.fromEntries(
  Object.entries(CLASS_HEX).map(([k, v]) => [k, parseInt(v.replace("#", "0x"))])
);

export const RARITY_HEX = {
  common: "#9CA3AF", rare: "#00BFFF", epic: "#A855F7",
  legendary: "#EAB308", mythic: "#EF4444", divine: "#FBBF24", cosmic: "#FFFFFF",
};

export const THEME_FLOOR = {
  cosmic: { base: 0x1E1238, edge: 0x5B21B6, accent: 0xA855F7, highlight: 0x2D1B4E },
  tavern: { base: 0x4A3020, edge: 0x92400E, accent: 0xF59E0B, highlight: 0x5C3D28 },
  arena: { base: 0x121B2E, edge: 0x1D4ED8, accent: 0x38BDF8, highlight: 0x1A2744 },
  market: { base: 0x352055, edge: 0x7C3AED, accent: 0xFDE047, highlight: 0x442A6A },
  guilds: { base: 0x252050, edge: 0x3730A3, accent: 0x34D399, highlight: 0x2E2860 },
  boss_valley: { base: 0x3A1010, edge: 0x991B1B, accent: 0xF87171, highlight: 0x4A1818 },
  hall: { base: 0x281E40, edge: 0x6D28D9, accent: 0xFDE047, highlight: 0x322850 },
  library: { base: 0x221838, edge: 0x5B21B6, accent: 0xC4B5FD, highlight: 0x2C2048 },
  archives: { base: 0x1E1A32, edge: 0x3730A3, accent: 0x60A5FA, highlight: 0x262240 },
  oracle: { base: 0x351060, edge: 0x7C3AED, accent: 0xF0ABFC, highlight: 0x401470 },
  rift: { base: 0x0C0618, edge: 0x6B21A8, accent: 0x22D3EE, highlight: 0x140A22 },
  alchemy: { base: 0x123528, edge: 0x047857, accent: 0x6EE7B7, highlight: 0x184030 },
  workshop: { base: 0x302418, edge: 0xB45309, accent: 0xFCD34D, highlight: 0x3A2C20 },
  time_temple: { base: 0x0C2030, edge: 0x0E7490, accent: 0x67E8F9, highlight: 0x102838 },
  necropolis: { base: 0x140A28, edge: 0x3730A3, accent: 0xA78BFA, highlight: 0x1A1030 },
  dream_garden: { base: 0x0E2828, edge: 0x0D9488, accent: 0x5EEAD4, highlight: 0x123030 },
  observatory: { base: 0x060C1C, edge: 0x1E40AF, accent: 0x93C5FD, highlight: 0x0A1428 },
  camp: { base: 0x2A2018, edge: 0x9A3412, accent: 0xFB923C, highlight: 0x342820 },
  relics: { base: 0x281E40, edge: 0x7C3AED, accent: 0xFDE047, highlight: 0x322850 },
  pantheon: { base: 0x1C1A30, edge: 0x4338CA, accent: 0xFDE047, highlight: 0x242038 },
  cosmic_elite: { base: 0x080810, edge: 0x6B21A8, accent: 0xFFFFFF, highlight: 0x101018 },
  council: { base: 0x140E28, edge: 0xB45309, accent: 0xFCD34D, highlight: 0x1A1230 },
};

/** Classe → sprite pack Dofus-like (public/world/assets) */
export const CLASS_SPRITE_MAP = {
  mage: "03_magician_magician",
  warrior: "02_little_dragon3_dragon",
  assassin: "06_assassin_girl",
  paladin: "01_little_dragon2_dragon",
  alchemist: "03_magician_snake",
  explorer: "07_thief_thief",
  necromancer: "05_daemon_daemon",
  architect: "03_magician_snake_2",
  chronomancer: "03_magician_snake_3",
  inventor: "07_thief_arbalest",
};

export const CLASS_SPRITE_SCALE = 0.34;

/** kind → fichier asset (sans extension) */
export const LANDMARK_SPRITES = {
  torch: "11_torch",
  tree: "51_tree3",
  barrel: "17_barrel",
  building: "24_hous_house",
  bench: "35_bench",
  fireplace: "55_fire",
  stall: "28_table_and_benches_table_and_benches",
  table: "28_table_and_benches_table_and_benches",
  fountain: "34_well",
  flower: "26_plant",
  rock: "36_stone",
  banner: "15_signboard",
  noticeboard: "15_signboard",
  tent: "29_barn",
  anvil: "27_smithy_smithy",
  bookshelf: "52_drawers",
  bush: "13_bush",
  chest: "18_chest",
  sign: "15_signboard",
  lamp: "11_torch",
  crate: "17_barrel",
  well: "34_well",
  smithy: "27_smithy_smithy",
};

export const LANDMARK_SPRITE_SCALE = {
  torch: 0.22, tree: 0.28, barrel: 0.24, building: 0.32, bench: 0.22,
  fireplace: 0.2, stall: 0.26, table: 0.24, fountain: 0.26, flower: 0.18,
  rock: 0.2, banner: 0.2, noticeboard: 0.2, tent: 0.28, anvil: 0.22, bookshelf: 0.24, bush: 0.18,
};

function shade(color, amount) {
  const r = Math.max(0, Math.min(255, ((color >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((color >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (color & 0xff) + amount));
  return (r << 16) | (g << 8) | b;
}

function makeDrawer(g) {
  return (x, y, color, alpha = 1) => {
    g.fillStyle(color, alpha);
    g.fillRect(x, y, 1, 1);
  };
}

/** Corps Habbo/Dofus — tête large, corps court */
function drawHabboBody(px, W, body, trim, skin, hair, outline, pants) {
  // Ombre au sol
  for (let x = W / 2 - 6; x <= W / 2 + 5; x++) px(x, 52, 0x000000, 0.35);

  // Jambes (stubby)
  for (let y = 44; y < 50; y++) {
    px(W / 2 - 5, y, outline); px(W / 2 - 4, y, pants); px(W / 2 - 3, y, pants);
    px(W / 2 + 2, y, pants); px(W / 2 + 3, y, pants); px(W / 2 + 4, y, outline);
  }
  px(W / 2 - 4, 50, outline); px(W / 2 - 3, 50, 0x1a1410); px(W / 2 + 2, 50, 0x1a1410); px(W / 2 + 3, 50, outline);

  // Torse compact
  for (let y = 34; y < 44; y++) {
    for (let x = W / 2 - 6; x <= W / 2 + 5; x++) {
      const edge = x === W / 2 - 6 || x === W / 2 + 5 || y === 34;
      px(x, y, edge ? outline : body);
    }
  }
  px(W / 2 - 4, 36, trim); px(W / 2 + 3, 36, trim);
  px(W / 2 - 1, 38, shade(body, 25)); px(W / 2, 38, shade(body, 25));

  // Bras courts
  for (let y = 35; y < 41; y++) {
    px(W / 2 - 8, y, outline); px(W / 2 - 7, y, skin);
    px(W / 2 + 6, y, skin); px(W / 2 + 7, y, outline);
  }

  // Tête carrée (Habbo)
  for (let y = 18; y < 34; y++) {
    for (let x = W / 2 - 7; x <= W / 2 + 6; x++) {
      const edge = x === W / 2 - 7 || x === W / 2 + 6 || y === 18 || y === 33;
      px(x, y, edge ? outline : skin);
    }
  }
  // Cheveux
  for (let x = W / 2 - 7; x <= W / 2 + 6; x++) {
    px(x, 16, hair); px(x, 17, hair); px(x, 18, hair);
  }
  px(W / 2 - 7, 19, hair); px(W / 2 + 6, 19, hair);
  // Yeux
  px(W / 2 - 3, 26, 0x0a0613); px(W / 2 - 2, 26, 0xffffff);
  px(W / 2 + 1, 26, 0xffffff); px(W / 2 + 2, 26, 0x0a0613);
  // Bouche
  px(W / 2 - 1, 30, 0x3f1d1d); px(W / 2, 30, 0x3f1d1d);
}

const CLASS_OVERLAYS = {
  mage: (px, W, body) => {
    for (let x = W / 2 - 3; x <= W / 2 + 2; x++) px(x, 3, body);
    px(W / 2 - 4, 4, body); px(W / 2 + 3, 4, body);
    px(W / 2 - 1, 2, body); px(W / 2, 2, body);
    for (let y = 8; y < 16; y++) px(W / 2 + 5, y, 0xc9a565);
    px(W / 2 + 5, 7, 0xa78bfa);
    px(W / 2 + 6, 10, 0xe9d5ff);
  },
  warrior: (px, W, body) => {
    for (let x = W / 2 - 4; x <= W / 2 + 3; x++) px(x, 4, 0x6b7280);
    px(W / 2 - 2, 3, 0x9ca3af); px(W / 2 + 1, 3, 0x9ca3af);
    for (let y = 17; y < 22; y++) px(W / 2 - 4, y, 0x9ca3af);
    for (let y = 12; y < 18; y++) px(W / 2 - 7, y, 0xd1d5db);
    px(W / 2 - 8, 13, 0xfbbf24);
  },
  assassin: (px, W) => {
    for (let x = W / 2 - 5; x <= W / 2 + 4; x++) px(x, 5, 0x1f1b2e);
    px(W / 2 - 1, 7, 0x000000); px(W / 2 + 0, 7, 0x000000);
    px(W / 2 - 6, 18, 0x9ca3af); px(W / 2 + 5, 18, 0x9ca3af);
  },
  paladin: (px, W, body) => {
    for (let y = 15; y < 22; y++) px(W / 2 - 4, y, 0xfbbf24);
    px(W / 2 - 5, 16, 0xfde047); px(W / 2 - 5, 19, 0xfde047);
    for (let x = W / 2 - 3; x <= W / 2 + 2; x++) px(x, 4, 0xfbbf24);
    px(W / 2 + 5, 14, 0xfbbf24); px(W / 2 + 6, 15, 0xfde047);
  },
  alchemist: (px, W) => {
    px(W / 2 + 5, 12, 0x34d399); px(W / 2 + 6, 11, 0x6ee7b7);
    px(W / 2 + 5, 13, 0x065f46);
    for (let x = W / 2 - 3; x <= W / 2 + 2; x++) px(x, 4, 0x10b981);
  },
  explorer: (px, W) => {
    px(W / 2 - 2, 3, 0x92400e); px(W / 2 + 1, 3, 0x92400e);
    px(W / 2 - 3, 4, 0xb45309); px(W / 2 + 2, 4, 0xb45309);
    px(W / 2 - 6, 15, 0x78350f); px(W / 2 - 5, 16, 0x92400e);
  },
  necromancer: (px, W, body) => {
    for (let x = W / 2 - 4; x <= W / 2 + 3; x++) px(x, 4, 0x1e1b4b);
    px(W / 2 + 5, 10, 0x4c1d95); px(W / 2 + 6, 9, 0xa78bfa);
    px(W / 2 + 5, 14, 0xf5f5f5); px(W / 2 + 6, 13, 0x000000);
  },
  architect: (px, W) => {
    px(W / 2 - 7, 14, 0xc4b5fd); px(W / 2 - 6, 15, 0xe9d5ff);
    px(W / 2 - 5, 16, 0xa855f7);
    for (let x = W / 2 - 3; x <= W / 2 + 2; x++) px(x, 4, 0x7c3aed);
  },
  chronomancer: (px, W, body) => {
    px(W / 2 - 1, 4, 0x22d3ee); px(W / 2, 4, 0x22d3ee);
    px(W / 2 + 5, 13, 0x0891b2); px(W / 2 + 6, 12, 0x67e8f9);
    for (let y = 17; y < 21; y++) px(W / 2 - 4, y, 0x22d3ee);
  },
  inventor: (px, W) => {
    px(W / 2 - 3, 7, 0xfbbf24); px(W / 2 + 2, 7, 0xfbbf24);
    px(W / 2 - 2, 6, 0x1f2937); px(W / 2 + 1, 6, 0x1f2937);
    px(W / 2 + 5, 15, 0xfbbf24); px(W / 2 + 6, 14, 0xfde047);
  },
};

function drawRoleCrown(px, W, role) {
  if (role === "admin") {
    for (let x = W / 2 - 4; x <= W / 2 + 3; x++) px(x, 2, 0xc9a565);
    px(W / 2 - 4, 1, 0xe8c97a); px(W / 2 - 1, 0, 0xfde047);
    px(W / 2 + 2, 0, 0xfde047); px(W / 2 + 4, 1, 0xe8c97a);
  } else if (role === "moderator") {
    for (let x = W / 2 - 4; x <= W / 2 + 3; x++) px(x, 4, 0xf97316);
    px(W / 2 - 4, 3, 0xfb923c); px(W / 2 + 3, 3, 0xfb923c);
  }
}

function paintHeroSprite(px, W, classId, role) {
  const body = CLASS_COLOR_INT[classId] || 0x9ca3af;
  const trim = shade(body, -35);
  const outline = role === "admin" ? 0xc9a565 : role === "moderator" ? 0xf97316 : 0x0a0613;
  const skin = 0xf0c8a0;
  const hair = role === "admin" ? 0xe8c97a : role === "moderator" ? 0xea580c : 0x1c1917;
  const pants = shade(body, -55);
  drawHabboBody(px, W, body, trim, skin, hair, outline, pants);
  (CLASS_OVERLAYS[classId] || CLASS_OVERLAYS.mage)(px, W, body);
  drawRoleCrown(px, W, role);
}

export const HERO_AVATAR_W = 40;
export const HERO_AVATAR_H = 56;

/** Avatar identique jeu + cartes héros (canvas DOM) */
export function getHeroAvatarDataURL(classId = "explorer", role = "user") {
  const W = HERO_AVATAR_W;
  const H = HERO_AVATAR_H;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const px = (x, y, color, alpha = 1) => {
    const hex = typeof color === "number"
      ? `#${(color & 0xffffff).toString(16).padStart(6, "0")}`
      : color;
    ctx.fillStyle = hex;
    ctx.globalAlpha = alpha;
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    ctx.globalAlpha = 1;
  };
  paintHeroSprite(px, W, classId, role);
  return canvas.toDataURL("image/png");
}

export function ensureCharTexture(scene, classId, role) {
  const key = `char_v3_${classId}_${role}`;
  if (scene.textures.exists(key)) return key;

  const W = HERO_AVATAR_W;
  const H = HERO_AVATAR_H;
  const g = scene.add.graphics();
  const px = makeDrawer(g);
  paintHeroSprite(px, W, classId, role);

  g.generateTexture(key, W, H);
  if (scene.textures.exists(key)) {
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  g.destroy();
  return key;
}

export function preloadClassSprites(scene) {
  Object.entries(CLASS_SPRITE_MAP).forEach(([, assetKey]) => {
    const texKey = `cls_${assetKey}`;
    if (!scene.textures.exists(texKey)) {
      scene.load.image(texKey, `/world/assets/${assetKey}.png`);
    }
  });
}

/** Avatar procédural unique — même rendu que les cartes héros */
export function resolvePlayerTexture(scene, classId, role) {
  return { key: ensureCharTexture(scene, classId, role), scale: 2.05, fromPack: false };
}

export function ensureTileTexture(scene, theme, variant = "base") {
  const key = `tile_v2_${theme}_${variant}`;
  if (scene.textures.exists(key)) return key;

  const cfg = THEME_FLOOR[theme] || THEME_FLOOR.cosmic;
  const W = TILE_W;
  const H = TILE_H;
  const g = scene.add.graphics();

  const fill = variant === "edge" ? cfg.accent : variant === "center" ? cfg.highlight : cfg.base;
  const edgeColor = cfg.edge;

  g.fillStyle(fill, 1);
  g.beginPath();
  g.moveTo(W / 2, 0);
  g.lineTo(W, H / 2);
  g.lineTo(W / 2, H);
  g.lineTo(0, H / 2);
  g.closePath();
  g.fillPath();

  g.fillStyle(shade(fill, 18), 0.55);
  g.beginPath();
  g.moveTo(W / 2, 2);
  g.lineTo(W - 3, H / 2);
  g.lineTo(W / 2, H / 2 + 2);
  g.lineTo(3, H / 2);
  g.closePath();
  g.fillPath();

  g.fillStyle(shade(fill, -22), 0.45);
  g.beginPath();
  g.moveTo(W / 2, H / 2);
  g.lineTo(W, H / 2);
  g.lineTo(W / 2, H - 1);
  g.lineTo(0, H / 2);
  g.closePath();
  g.fillPath();

  if (variant === "base" || variant === "center") {
    const pattern = theme === "tavern" || theme === "camp" ? "wood" : theme === "arena" || theme === "workshop" ? "stone" : "dot";
    if (pattern === "wood") {
      g.fillStyle(shade(fill, 12), 0.4);
      for (let i = -2; i < 3; i++) {
        const ox = W / 2 + i * 6;
        g.fillRect(ox, H / 2 - 2, 4, 1);
        g.fillRect(ox + 2, H / 2 + 1, 3, 1);
      }
    } else if (pattern === "stone") {
      g.fillStyle(shade(fill, -15), 0.35);
      g.fillRect(W / 2 - 6, H / 2 - 3, 3, 2);
      g.fillRect(W / 2 + 2, H / 2, 4, 2);
      g.fillRect(W / 2 - 2, H / 2 + 2, 2, 2);
    } else {
      g.fillStyle(edgeColor, 0.15);
      for (let i = 0; i < 4; i++) {
        const ox = W / 2 + (i % 2 === 0 ? -8 : 6);
        const oy = H / 2 + (i < 2 ? -4 : 2);
        g.fillRect(ox, oy, 2, 2);
      }
    }
  }

  g.lineStyle(1, 0xffffff, 0.08);
  g.beginPath();
  g.moveTo(W / 2, 1);
  g.lineTo(W - 2, H / 2);
  g.strokePath();

  g.lineStyle(1.5, edgeColor, variant === "edge" ? 0.85 : 0.55);
  g.beginPath();
  g.moveTo(W / 2, 0);
  g.lineTo(W, H / 2);
  g.moveTo(W / 2, H);
  g.lineTo(0, H / 2);
  g.moveTo(W / 2, 0);
  g.lineTo(0, H / 2);
  g.moveTo(W / 2, H);
  g.lineTo(W, H / 2);
  g.strokePath();

  if (variant === "center") {
    g.fillStyle(cfg.accent, 0.35);
    g.fillCircle(W / 2, H / 2, 4);
    g.lineStyle(1, cfg.accent, 0.7);
    g.strokeCircle(W / 2, H / 2, 4);
  }

  g.generateTexture(key, W, H);
  if (scene.textures.exists(key)) {
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  g.destroy();
  return key;
}

export function preloadLandmarkSprites(scene) {
  Object.entries(LANDMARK_SPRITES).forEach(([kind, assetKey]) => {
    const texKey = `lm_${assetKey}`;
    if (!scene.textures.exists(texKey)) {
      scene.load.image(texKey, `/world/assets/${assetKey}.png`);
    }
  });
}

export function tryDrawSpriteLandmark(scene, decorLayer, lm, x, y) {
  const assetKey = LANDMARK_SPRITES[lm.kind];
  if (!assetKey) return false;
  const texKey = `lm_${assetKey}`;
  if (!scene.textures.exists(texKey)) return false;

  const scale = (lm.scale || 1) * (LANDMARK_SPRITE_SCALE[lm.kind] || 0.22);
  const img = scene.add.image(x, y + 4, texKey);
  img.setOrigin(0.5, 1);
  img.setScale(scale);
  if (img.texture) img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

  const tint = lm.color ? parseInt(lm.color.replace("#", "0x")) : null;
  if (tint) img.setTint(tint);

  decorLayer.add(img);
  return true;
}
