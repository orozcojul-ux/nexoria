/**
 * UI pixel art Nexoria — badges médaillons & bannières cosmiques
 * Palette : violet #7928CA, cyan #00E5FF, or #C9A565, abysse #0A0613
 */

import { RARITY } from "@/lib/design-tokens";

const NEXORIA = {
  abyss: "#0A0613",
  void: "#1A0B3D",
  violet: "#7928CA",
  violetLight: "#A855F7",
  cyan: "#00E5FF",
  cyanSoft: "#67E8F9",
  gold: "#C9A565",
  goldBright: "#FCD34D",
  white: "#F8FAFC",
};

const BANNER_THEMES = {
  violet: { base: NEXORIA.void, accent: NEXORIA.violet, glow: NEXORIA.cyan, star: NEXORIA.goldBright },
  cyan: { base: "#0C2030", accent: NEXORIA.cyan, glow: NEXORIA.violetLight, star: NEXORIA.white },
  gold: { base: "#1C1408", accent: NEXORIA.gold, glow: NEXORIA.goldBright, star: NEXORIA.cyanSoft },
  emerald: { base: "#052e16", accent: "#34d399", glow: "#6ee7b7", star: NEXORIA.goldBright },
  crimson: { base: "#1a0505", accent: "#ef4444", glow: "#fca5a5", star: NEXORIA.gold },
};

const BADGE_SYMBOLS = {
  Sparkles: "✦", Star: "★", Crown: "♛", Shield: "⛨", Sword: "⚔", Trophy: "🏆",
  Flame: "🔥", Zap: "⚡", Gift: "🎁", Heart: "♥", Bell: "🔔", Users: "☯",
  MessageCircle: "◎", Map: "◇", Globe2: "◉", Ticket: "▣", ShoppingBag: "◆",
};

function px(ctx, x, y, color, s = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, s, s);
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function shadeHex(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.max(0, Math.min(255, r + amount))},${Math.max(0, Math.min(255, g + amount))},${Math.max(0, Math.min(255, b + amount))})`;
}

function lerpColor(a, b, t) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`;
}

/** Médaillon Nexoria — bouclier cosmique avec gemme de rareté */
export function drawPixelBadge(size, rarity = "common", seed = 0, iconHint = null) {
  const r = RARITY[rarity] || RARITY.common;
  const accent = r.color || NEXORIA.violetLight;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const s = size / 48;
  const R = (v) => Math.floor(v * s);

  // Fond abysse
  ctx.fillStyle = NEXORIA.abyss;
  ctx.fillRect(0, 0, size, size);

  // Anneau extérieur or Nexoria
  const ring = [
    [R(20), R(2)], [R(26), R(4)], [R(30), R(10)], [R(32), R(18)],
    [R(30), R(28)], [R(26), R(34)], [R(20), R(38)], [R(14), R(34)],
    [R(10), R(28)], [R(8), R(18)], [R(10), R(10)], [R(14), R(4)],
  ];
  ctx.fillStyle = NEXORIA.gold;
  ring.forEach(([x, y]) => px(ctx, x, y, NEXORIA.gold, R(2)));
  ctx.fillStyle = shadeHex(NEXORIA.gold, -30);
  ring.forEach(([x, y]) => px(ctx, x + R(1), y + R(1), shadeHex(NEXORIA.gold, -30), R(1)));

  // Corps bouclier violet
  ctx.fillStyle = NEXORIA.void;
  ctx.beginPath();
  ctx.moveTo(R(24), R(8));
  ctx.lineTo(R(34), R(16));
  ctx.lineTo(R(34), R(30));
  ctx.lineTo(R(24), R(40));
  ctx.lineTo(R(14), R(30));
  ctx.lineTo(R(14), R(16));
  ctx.closePath();
  ctx.fill();

  // Bordure cyan intérieure
  ctx.strokeStyle = NEXORIA.cyan;
  ctx.lineWidth = Math.max(1, R(1));
  ctx.globalAlpha = 0.55;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Gemme centrale (couleur rareté)
  const cx = R(24);
  const cy = R(24);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(cx, cy - R(8));
  ctx.lineTo(cx + R(7), cy);
  ctx.lineTo(cx, cy + R(8));
  ctx.lineTo(cx - R(7), cy);
  ctx.closePath();
  ctx.fill();

  // Reflet gemme
  ctx.fillStyle = NEXORIA.white;
  ctx.globalAlpha = 0.4;
  px(ctx, cx - R(2), cy - R(4), NEXORIA.white, R(2));
  ctx.globalAlpha = 1;

  // Runes cosmiques (coins)
  const runeColor = rarity === "cosmic" ? NEXORIA.cyan : shadeHex(accent, 40);
  [[R(16), R(14)], [R(30), R(14)], [R(16), R(32)], [R(30), R(32)]].forEach(([x, y], i) => {
    px(ctx, x, y, runeColor, R(2));
    if ((seed + i) % 2 === 0) px(ctx, x + R(1), y - R(1), NEXORIA.goldBright, R(1));
  });

  // Symbole central (icône badge)
  const sym = BADGE_SYMBOLS[iconHint] || (seed % 3 === 0 ? "✦" : seed % 3 === 1 ? "◇" : "◎");
  ctx.font = `bold ${Math.floor(R(10))}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = NEXORIA.abyss;
  ctx.globalAlpha = 0.85;
  ctx.fillText(sym, cx, cy + R(1));
  ctx.globalAlpha = 1;

  // Halo cosmic / divine
  if (rarity === "cosmic" || rarity === "divine") {
    ctx.strokeStyle = rarity === "cosmic" ? NEXORIA.cyan : NEXORIA.goldBright;
    ctx.lineWidth = R(1);
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(cx, cy, R(14), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  return canvas.toDataURL("image/png");
}

/** Bannière Nexoria — nébuleuse, constellation, filigrane or */
export function drawPixelBanner(width, height, theme = "violet") {
  const pal = BANNER_THEMES[theme] || BANNER_THEMES.violet;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // Nébuleuse verticale
  for (let y = 0; y < height; y += 3) {
    const t = y / height;
    ctx.fillStyle = lerpColor(pal.base, pal.accent, t * 0.45 + 0.1);
    ctx.fillRect(0, y, width, 3);
  }

  // Bande cyan horizon
  const horizon = Math.floor(height * 0.58);
  for (let y = horizon; y < height; y += 2) {
    ctx.fillStyle = lerpColor(NEXORIA.abyss, pal.glow, (y - horizon) / (height - horizon) * 0.35);
    ctx.fillRect(0, y, width, 2);
  }

  // Constellation (lignes or)
  const stars = [];
  for (let i = 0; i < 18; i++) {
    stars.push({
      x: (i * 97 + 31) % width,
      y: (i * 53 + 17) % Math.floor(height * 0.55),
    });
  }
  ctx.strokeStyle = NEXORIA.gold;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1;
  for (let i = 0; i < stars.length - 1; i += 3) {
    ctx.beginPath();
    ctx.moveTo(stars[i].x, stars[i].y);
    ctx.lineTo(stars[i + 1].x, stars[i + 1].y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  stars.forEach((st, i) => {
    ctx.fillStyle = i % 4 === 0 ? pal.star : pal.glow;
    px(ctx, st.x, st.y, i % 4 === 0 ? pal.star : pal.glow, 2);
    if (i % 5 === 0) px(ctx, st.x + 1, st.y - 1, NEXORIA.white, 1);
  });

  // Portail Nexoria (silhouette pixel)
  const px0 = Math.floor(width * 0.68);
  const py0 = Math.floor(height * 0.22);
  ctx.fillStyle = shadeHex(pal.accent, -25);
  ctx.fillRect(px0, py0 + 40, 56, 48);
  ctx.fillRect(px0 + 12, py0 + 16, 32, 28);
  ctx.fillRect(px0 + 20, py0, 16, 20);
  ctx.fillStyle = NEXORIA.cyan;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(px0 + 26, py0 + 8, 4, 12);
  ctx.fillRect(px0 + 24, py0 + 24, 8, 4);
  ctx.globalAlpha = 1;
  ctx.fillStyle = NEXORIA.goldBright;
  px(ctx, px0 + 27, py0 + 2, NEXORIA.goldBright, 2);

  // Filigrane or bas
  for (let x = 0; x < width; x += 12) {
    ctx.fillStyle = NEXORIA.gold;
    ctx.globalAlpha = 0.12;
    px(ctx, x, height - 6, NEXORIA.gold, 4);
    ctx.globalAlpha = 1;
  }

  return canvas.toDataURL("image/png");
}

export const PIXEL_BANNER_THEMES = BANNER_THEMES;
