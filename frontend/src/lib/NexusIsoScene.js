import Phaser from "phaser";

/* ===================== ISOMETRIC CONFIG ===================== */
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

const THEME_FLOOR = {
  cosmic: { base: 0x1A0F2E, edge: 0x4C1D95, accent: 0x9D4CDD },
  tavern: { base: 0x3D2817, edge: 0x78350F, accent: 0xEAB308 },
  arena:  { base: 0x0F172A, edge: 0x1E3A8A, accent: 0x00E5FF },
  market: { base: 0x2D1B47, edge: 0x7C3AED, accent: 0xFCD34D },
  guilds: { base: 0x1F1B47, edge: 0x312E81, accent: 0x10B981 },
  boss_valley: { base: 0x2A0A0A, edge: 0x7F1D1D, accent: 0xEF4444 },
  hall: { base: 0x1F1730, edge: 0x5B21B6, accent: 0xFCD34D },
  library: { base: 0x1A1230, edge: 0x4C1D95, accent: 0xA78BFA },
  archives: { base: 0x171429, edge: 0x312E81, accent: 0x60A5FA },
  oracle: { base: 0x2B0F47, edge: 0x7C3AED, accent: 0xE879F9 },
  rift:   { base: 0x0A0613, edge: 0x7928CA, accent: 0x00E5FF },
  alchemy: { base: 0x0F2A1F, edge: 0x065F46, accent: 0x34D399 },
  workshop: { base: 0x221A0F, edge: 0x92400E, accent: 0xFBBF24 },
  time_temple: { base: 0x0A1A2A, edge: 0x0E7490, accent: 0x22D3EE },
  necropolis: { base: 0x0F0820, edge: 0x312E81, accent: 0x9D4CDD },
  dream_garden: { base: 0x0A1F1F, edge: 0x0F766E, accent: 0x5EEAD4 },
  observatory: { base: 0x020617, edge: 0x1E3A8A, accent: 0x60A5FA },
  camp: { base: 0x1F1810, edge: 0x78350F, accent: 0xFB923C },
  relics: { base: 0x1F1730, edge: 0x7C3AED, accent: 0xFCD34D },
  pantheon: { base: 0x161429, edge: 0x4338CA, accent: 0xFCD34D },
  cosmic_elite: { base: 0x000000, edge: 0x7928CA, accent: 0xFFFFFF },
  council: { base: 0x0F0A1F, edge: 0xB45309, accent: 0xFCD34D },
};

/* Rank → aura config (titles from game_data) */
const RANK_AURA = {
  // Cosmic-tier — swirling cosmic particles
  elu_cosmique: { kind: "cosmic", color: 0xFFFFFF, secondary: 0x9D4CDD },
  // Living legend — golden upward sparkles
  legende_vivante: { kind: "golden", color: 0xFFD700, secondary: 0xFCD34D },
  // Master of Shadows — dark shadow particles drifting
  maitre_des_ombres: { kind: "shadow", color: 0x4C1D95, secondary: 0x1F1B2E },
  // Roi des Créateurs — violet glow
  roi_des_createurs: { kind: "violet", color: 0xA855F7, secondary: 0x9D4CDD },
  // Seigneur du Temps — cyan ticks
  seigneur_du_temps: { kind: "cyan", color: 0x00E5FF, secondary: 0x60A5FA },
};

/* ===================== ISOMETRIC HELPERS ===================== */
export function tileToScreen(tx, ty, originX, originY) {
  return {
    x: originX + (tx - ty) * (TILE_W / 2),
    y: originY + (tx + ty) * (TILE_H / 2),
  };
}

/* ===================== PIXEL ART CHARACTER ===================== */
function ensureCharTexture(scene, classId, role) {
  const key = `char_${classId}_${role}`;
  if (scene.textures.exists(key)) return key;
  const W = 24, H = 32;
  const g = scene.add.graphics();
  const bodyColor = CLASS_COLOR_INT[classId] || 0x9CA3AF;
  const outline = role === "admin" ? 0xFFD700 : role === "moderator" ? 0xF97316 : 0x0A0613;
  const skin = 0xF5D0A9;
  const hair = role === "admin" ? 0xFFD700 : role === "moderator" ? 0xF97316 : 0x1F1B2E;
  const px = (x, y, color, alpha = 1) => { g.fillStyle(color, alpha); g.fillRect(x, y, 1, 1); };

  g.fillStyle(0x000000, 0.45);
  g.fillEllipse(W / 2, H - 2, 14, 5);

  // Legs
  for (let y = 22; y < 28; y++) {
    px(W / 2 - 3, y, 0x1F1B2E); px(W / 2 - 2, y, bodyColor);
    px(W / 2 + 1, y, bodyColor); px(W / 2 + 2, y, 0x1F1B2E);
  }
  for (let y = 28; y < 30; y++) {
    for (let x = W / 2 - 4; x <= W / 2 - 1; x++) px(x, y, 0x000000);
    for (let x = W / 2 + 0; x <= W / 2 + 3; x++) px(x, y, 0x000000);
  }
  // Torso
  for (let y = 13; y < 22; y++) { px(W / 2 - 5, y, outline); px(W / 2 + 4, y, outline); }
  for (let x = W / 2 - 4; x <= W / 2 + 3; x++) { px(x, 13, outline); px(x, 22, outline); }
  for (let y = 14; y < 22; y++) for (let x = W / 2 - 4; x <= W / 2 + 3; x++) px(x, y, bodyColor);
  for (let x = W / 2 - 3; x <= W / 2; x++) px(x, 15, 0xFFFFFF, 0.25);
  px(W / 2, 17, 0xFFFFFF, 0.9);
  px(W / 2 - 1, 18, 0xFFFFFF, 0.6);
  px(W / 2 + 1, 18, 0xFFFFFF, 0.6);
  px(W / 2, 19, 0xFFFFFF, 0.9);
  // Arms
  for (let y = 14; y < 21; y++) {
    px(W / 2 - 6, y, outline); px(W / 2 - 5, y, bodyColor);
    px(W / 2 + 4, y, bodyColor); px(W / 2 + 5, y, outline);
  }
  px(W / 2 - 6, 20, skin); px(W / 2 - 5, 21, skin);
  px(W / 2 + 5, 20, skin); px(W / 2 + 4, 21, skin);
  // Neck
  for (let y = 11; y < 13; y++) for (let x = W / 2 - 2; x <= W / 2 + 1; x++) px(x, y, skin);
  // Head
  for (let y = 4; y < 11; y++) { px(W / 2 - 5, y, 0x000000); px(W / 2 + 4, y, 0x000000); }
  for (let x = W / 2 - 4; x <= W / 2 + 3; x++) { px(x, 3, 0x000000); px(x, 11, 0x000000); }
  for (let y = 4; y < 11; y++) for (let x = W / 2 - 4; x <= W / 2 + 3; x++) px(x, y, skin);
  for (let x = W / 2 - 4; x <= W / 2 + 3; x++) { px(x, 4, hair); px(x, 5, hair); }
  px(W / 2 - 4, 6, hair); px(W / 2 + 3, 6, hair);
  px(W / 2 - 2, 7, 0x000000); px(W / 2 + 1, 7, 0x000000);
  px(W / 2 - 1, 9, 0x000000); px(W / 2 + 0, 9, 0x000000);

  if (role === "admin") {
    for (let x = W / 2 - 4; x <= W / 2 + 3; x++) px(x, 2, 0xFFD700);
    px(W / 2 - 4, 1, 0xFFD700); px(W / 2 - 1, 0, 0xFFD700);
    px(W / 2 + 2, 0, 0xFFD700); px(W / 2 + 4, 1, 0xFFD700);
  } else if (role === "moderator") {
    for (let x = W / 2 - 4; x <= W / 2 + 3; x++) px(x, 3, 0xF97316);
    px(W / 2 - 4, 2, 0xF97316); px(W / 2 + 3, 2, 0xF97316);
  }
  g.generateTexture(key, W, H);
  g.destroy();
  return key;
}

/* ===================== TILE TEXTURE ===================== */
function ensureTileTexture(scene, theme, variant = "base") {
  const key = `tile_${theme}_${variant}`;
  if (scene.textures.exists(key)) return key;
  const cfg = THEME_FLOOR[theme] || THEME_FLOOR.cosmic;
  const W = TILE_W, H = TILE_H;
  const g = scene.add.graphics();
  const fill = variant === "edge" ? cfg.accent : cfg.base;
  g.fillStyle(fill, 1);
  g.beginPath();
  g.moveTo(W / 2, 0); g.lineTo(W, H / 2);
  g.lineTo(W / 2, H); g.lineTo(0, H / 2);
  g.closePath().fillPath();
  g.lineStyle(1, 0xFFFFFF, 0.05);
  g.beginPath(); g.moveTo(W / 2, 1); g.lineTo(W - 1, H / 2); g.strokePath();
  g.lineStyle(1, cfg.edge, 0.6);
  g.beginPath();
  g.moveTo(W / 2, 0); g.lineTo(W, H / 2);
  g.moveTo(W / 2, H); g.lineTo(0, H / 2);
  g.moveTo(W / 2, 0); g.lineTo(0, H / 2);
  g.moveTo(W / 2, H); g.lineTo(W, H / 2);
  g.strokePath();
  g.generateTexture(key, W, H);
  g.destroy();
  return key;
}

/* ===================== PHASER SCENE ===================== */
export class NexusIsoScene extends Phaser.Scene {
  constructor() { super("NexusIsoScene"); }
  init(data) {
    this.onTileClick = data.onTileClick;
    this.onPlayerClick = data.onPlayerClick;
    this.gmPickerMode = false;
    this.players = {};
    this.itemSprites = {};
    this.path = [];
    this.targetTile = null;
    this.lastEmit = 0;
    this.weatherLayer = null;
    this.you = data.you;
    this.room = data.room;
    this.initialPlayers = data.players || [];
    this.initialItems = data.items || [];
    this.initialWeather = data.weather || "clear";
    this.onMoveEmit = data.onMoveEmit;
  }

  create() {
    const { room } = this;
    this.cameras.main.setBackgroundColor("#030208");
    const totalW = (room.tiles_x + room.tiles_y) * (TILE_W / 2);
    const totalH = (room.tiles_x + room.tiles_y) * (TILE_H / 2);
    this.originX = totalW / 2 + 40;
    this.originY = 80;
    this.worldW = totalW + 80;
    this.worldH = totalH + 200;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0A0613, 0x0A0613, 0x1A0B3D, 0x05030D, 1);
    bg.fillRect(0, 0, this.worldW, this.worldH);
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * this.worldW;
      const y = Math.random() * this.worldH * 0.6;
      const r = Math.random() < 0.8 ? 1 : 2;
      const c = this.add.circle(x, y, r, 0xFFFFFF, 0.3 + Math.random() * 0.5);
      this.tweens.add({ targets: c, alpha: 0.1, yoyo: true, repeat: -1, duration: 1200 + Math.random() * 2000 });
    }

    const theme = room.theme || "cosmic";
    ensureTileTexture(this, theme, "base");
    ensureTileTexture(this, theme, "edge");

    this.floorLayer = this.add.container(0, 0);
    for (let ty = 0; ty < room.tiles_y; ty++) {
      for (let tx = 0; tx < room.tiles_x; tx++) {
        const { x, y } = tileToScreen(tx, ty, this.originX, this.originY);
        const isEdge = tx === 0 || ty === 0 || tx === room.tiles_x - 1 || ty === room.tiles_y - 1;
        const isCenter = (tx === Math.floor(room.tiles_x / 2) && ty === Math.floor(room.tiles_y / 2));
        const key = isEdge ? `tile_${theme}_edge` : `tile_${theme}_base`;
        const tile = this.add.image(x, y, key).setOrigin(0.5, 0).setInteractive(
          new Phaser.Geom.Polygon([
            new Phaser.Geom.Point(TILE_W / 2, 0),
            new Phaser.Geom.Point(TILE_W, TILE_H / 2),
            new Phaser.Geom.Point(TILE_W / 2, TILE_H),
            new Phaser.Geom.Point(0, TILE_H / 2),
          ]),
          Phaser.Geom.Polygon.Contains,
        );
        tile.on("pointerover", () => tile.setTint(0x00E5FF));
        tile.on("pointerout", () => tile.clearTint());
        tile.on("pointerdown", () => {
          if (this.gmPickerMode) { this.onTileClick && this.onTileClick({ tx, ty }); return; }
          this.requestMoveTo(tx, ty);
        });
        if (isCenter) tile.setTint(0xFFD700);
        this.floorLayer.add(tile);
      }
    }

    // ===== LANDMARKS / DECOR =====
    this.decorLayer = this.add.container(0, 0);
    this.entityLayer = this.add.container(0, 0);
    this.particleLayer = this.add.container(0, 0);
    this.weatherLayer = this.add.container(0, 0);

    (room.landmarks || []).forEach((lm) => this.drawLandmark(lm));
    (room.npcs || []).forEach((npc) => this.spawnNpc(npc));
    this.applyParticles(room.particles);
    this.applyWeather(this.initialWeather);

    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);

    // Spawn initial players + items
    this.initialPlayers.forEach((p) => this.upsertPlayer(p));
    this.initialItems.forEach((it) => this.spawnItem(it));

    this.time.delayedCall(50, () => {
      const me = this.players[this.you.sid];
      if (me) this.cameras.main.centerOn(me.x, me.y);
    });

    this.add.text(this.worldW / 2, 16, room.name.toUpperCase(), {
      fontFamily: "Cinzel, serif", fontSize: "22px", color: "#FFD700",
      fontStyle: "bold", stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0.9);
  }

  /* --- movement --- */
  requestMoveTo(tx, ty) {
    if (!this.you) return;
    const me = this.players[this.you.sid];
    if (!me) return;
    if (me.profile?.frozen) return;
    this.targetTile = { tx, ty };
    this.path = this.computePath(me.tile.tx, me.tile.ty, tx, ty);
  }
  computePath(sx, sy, ex, ey) {
    const path = [];
    let cx = sx, cy = sy, g = 0;
    while ((cx !== ex || cy !== ey) && g++ < 100) {
      if (cx < ex) cx++; else if (cx > ex) cx--;
      if (cy < ey) cy++; else if (cy > ey) cy--;
      path.push({ tx: cx, ty: cy });
    }
    return path;
  }
  computeFacing(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "E" : "W";
    return dy > 0 ? "S" : "N";
  }

  /* --- players --- */
  addRankAura(container, rank) {
    const aura = RANK_AURA[rank];
    if (!aura) return null;
    const auraGfx = this.add.graphics();
    container.add(auraGfx);
    container.sendToBack(auraGfx);
    let phase = 0;
    container.auraTick = (delta) => {
      phase += delta;
      auraGfx.clear();
      const ringR = 22 + Math.sin(phase / 600) * 3;
      if (aura.kind === "cosmic") {
        // Rotating cosmic stars
        for (let i = 0; i < 6; i++) {
          const a = (phase / 1500) + (i / 6) * Math.PI * 2;
          const r = ringR + 4;
          const sx = Math.cos(a) * r;
          const sy = Math.sin(a) * (r * 0.5) + 4;
          auraGfx.fillStyle(0xFFFFFF, 0.9);
          auraGfx.fillCircle(sx, sy, 1.5);
          auraGfx.fillStyle(aura.secondary, 0.5);
          auraGfx.fillCircle(sx, sy, 3);
        }
      } else if (aura.kind === "golden") {
        // Golden vertical sparkles
        for (let i = 0; i < 5; i++) {
          const t = (phase / 1000 + i * 0.2) % 1;
          const y = 4 - t * 28;
          const x = ((i % 2 === 0 ? -1 : 1)) * (6 + (i * 2));
          auraGfx.fillStyle(0xFFD700, 1 - t);
          auraGfx.fillRect(x, y, 2, 2);
        }
      } else if (aura.kind === "shadow") {
        for (let i = 0; i < 6; i++) {
          const a = -(phase / 1800) + (i / 6) * Math.PI * 2;
          const r = ringR;
          const sx = Math.cos(a) * r;
          const sy = Math.sin(a) * (r * 0.45) + 4;
          auraGfx.fillStyle(aura.color, 0.6);
          auraGfx.fillCircle(sx, sy, 4);
          auraGfx.fillStyle(aura.secondary, 0.4);
          auraGfx.fillCircle(sx, sy, 7);
        }
      } else if (aura.kind === "violet") {
        auraGfx.fillStyle(aura.color, 0.25 + 0.1 * Math.sin(phase / 500));
        auraGfx.fillEllipse(0, 4, ringR * 2.4, ringR * 1.2);
      } else if (aura.kind === "cyan") {
        for (let i = 0; i < 8; i++) {
          const a = (phase / 700) + (i / 8) * Math.PI * 2;
          const r = ringR + 2;
          const sx = Math.cos(a) * r;
          const sy = Math.sin(a) * (r * 0.5) + 4;
          auraGfx.fillStyle(aura.color, 0.7);
          auraGfx.fillRect(sx, sy, 2, 2);
        }
      }
    };
    return auraGfx;
  }

  /* --- decor: landmarks, particles, NPCs --- */
  drawLandmark(lm) {
    const screen = tileToScreen(lm.tx, lm.ty, this.originX, this.originY);
    const x = screen.x + TILE_W / 2;
    const y = screen.y + TILE_H / 2;
    const color = lm.color ? parseInt(lm.color.replace("#", "0x")) : 0x9D4CDD;
    const scale = lm.scale || 1;

    switch (lm.kind) {
      case "fountain":     this.drawFountain(x, y, color, scale); break;
      case "crystal":      this.drawCrystal(x, y, color, scale); break;
      case "statue":       this.drawStatue(x, y, color, scale); break;
      case "throne":       this.drawThrone(x, y, color, scale); break;
      case "altar":        this.drawAltar(x, y, color, scale); break;
      case "portal":       this.drawPortal(x, y, color, scale, lm.label); break;
      case "bookshelf":    this.drawBookshelf(x, y); break;
      case "scroll":       this.drawScroll(x, y); break;
      case "cauldron":     this.drawCauldron(x, y, color, scale); break;
      case "gear":         this.drawGear(x, y, color, scale); break;
      case "machine":      this.drawMachine(x, y, color); break;
      case "anvil":        this.drawAnvil(x, y); break;
      case "clock":        this.drawClock(x, y, color, scale); break;
      case "gravestone":   this.drawGravestone(x, y); break;
      case "crypt":        this.drawCrypt(x, y, color); break;
      case "obelisk":      this.drawObelisk(x, y, color); break;
      case "bones":        this.drawBones(x, y); break;
      case "rock":         this.drawRock(x, y); break;
      case "flower":       this.drawFlower(x, y, color); break;
      case "tree":         this.drawTree(x, y, color); break;
      case "telescope":    this.drawTelescope(x, y, color, scale); break;
      case "tent":         this.drawTent(x, y, color); break;
      case "fireplace":    this.drawFireplace(x, y, color); break;
      case "torch":        this.drawTorch(x, y); break;
      case "barrel":       this.drawBarrel(x, y); break;
      case "table":        this.drawTable(x, y, color); break;
      case "bench":        this.drawBench(x, y); break;
      case "stall":        this.drawStall(x, y, color); break;
      case "building":     this.drawBuilding(x, y, color, lm.label); break;
      case "noticeboard":  this.drawNoticeboard(x, y, color); break;
      case "stands":       this.drawStands(x, y); break;
      case "pedestal":     this.drawPedestal(x, y, color); break;
      case "banner":       this.drawBanner(x, y, color, lm.label); break;
      default: break;
    }
  }

  /* ---- Procedural landmark shapes ---- */
  drawFountain(x, y, color, scale = 1) {
    const halo = this.add.circle(x, y, 36 * scale, color, 0.2);
    this.tweens.add({ targets: halo, scale: 1.3 * scale, alpha: 0.08, yoyo: true, repeat: -1, duration: 1800 });
    const base = this.add.graphics();
    base.fillStyle(0x1F1B2E, 1); base.fillEllipse(x, y + 6, 50 * scale, 18 * scale);
    base.lineStyle(2, 0x4C1D95, 1); base.strokeEllipse(x, y + 6, 50 * scale, 18 * scale);
    const water = this.add.ellipse(x, y, 38 * scale, 12 * scale, color, 0.7);
    water.setStrokeStyle(1, 0xFFFFFF, 0.6);
    this.tweens.add({ targets: water, scaleX: 1.1, scaleY: 1.1, yoyo: true, repeat: -1, duration: 1200 });
    this.decorLayer.add([halo, base, water]);
    // Sprite-able vertical stream
    const stream = this.add.rectangle(x, y - 8, 4, 18 * scale, color, 0.9);
    this.tweens.add({ targets: stream, scaleY: 1.3, alpha: 0.6, yoyo: true, repeat: -1, duration: 600 });
    this.decorLayer.add(stream);
  }

  drawCrystal(x, y, color, scale = 1) {
    const halo = this.add.circle(x, y - 10, 24 * scale, color, 0.3);
    this.tweens.add({ targets: halo, scale: 1.3 * scale, alpha: 0.1, yoyo: true, repeat: -1, duration: 1600 });
    const g = this.add.graphics();
    const cy = y - 16 * scale;
    g.fillStyle(color, 0.95);
    g.beginPath();
    g.moveTo(x, cy - 18 * scale);
    g.lineTo(x + 8 * scale, cy - 6 * scale);
    g.lineTo(x + 6 * scale, cy + 14 * scale);
    g.lineTo(x - 6 * scale, cy + 14 * scale);
    g.lineTo(x - 8 * scale, cy - 6 * scale);
    g.closePath().fillPath();
    g.lineStyle(1, 0xFFFFFF, 0.7).strokePath();
    this.tweens.add({ targets: g, y: -3, yoyo: true, repeat: -1, duration: 1600, ease: "Sine.easeInOut" });
    this.decorLayer.add([halo, g]);
  }

  drawStatue(x, y, color, scale = 1) {
    const base = this.add.rectangle(x, y + 6, 28 * scale, 8 * scale, 0x312E81, 1);
    const body = this.add.rectangle(x, y - 18 * scale, 18 * scale, 36 * scale, color, 0.9);
    body.setStrokeStyle(1, 0xFFFFFF, 0.4);
    const head = this.add.circle(x, y - 40 * scale, 8 * scale, color, 1);
    head.setStrokeStyle(1, 0xFFFFFF, 0.4);
    this.decorLayer.add([base, body, head]);
  }

  drawThrone(x, y, color, scale = 1) {
    const back = this.add.rectangle(x, y - 22 * scale, 30 * scale, 44 * scale, 0x312E81, 1);
    back.setStrokeStyle(2, color, 1);
    const seat = this.add.rectangle(x, y + 4 * scale, 34 * scale, 12 * scale, color, 0.9);
    const halo = this.add.circle(x, y - 22 * scale, 26 * scale, color, 0.2);
    this.tweens.add({ targets: halo, scale: 1.2, alpha: 0.08, yoyo: true, repeat: -1, duration: 1700 });
    this.decorLayer.add([halo, back, seat]);
  }

  drawAltar(x, y, color, scale = 1) {
    const base = this.add.rectangle(x, y + 4, 36 * scale, 16 * scale, 0x1F1B2E, 1);
    base.setStrokeStyle(2, color, 1);
    const flame = this.add.circle(x, y - 14 * scale, 10 * scale, color, 0.9);
    flame.setStrokeStyle(1, 0xFFFFFF, 0.7);
    this.tweens.add({ targets: flame, scale: 1.4, alpha: 0.6, yoyo: true, repeat: -1, duration: 600 });
    this.decorLayer.add([base, flame]);
  }

  drawPortal(x, y, color, scale = 1, label) {
    const halo = this.add.circle(x, y - 16, 32 * scale, color, 0.4);
    const ring = this.add.circle(x, y - 16, 22 * scale, 0x000000, 1);
    ring.setStrokeStyle(3, color, 1);
    this.tweens.add({ targets: ring, scaleX: 1.15, scaleY: 1.15, yoyo: true, repeat: -1, duration: 800 });
    this.tweens.add({ targets: halo, alpha: 0.15, yoyo: true, repeat: -1, duration: 1200 });
    if (label) {
      const t = this.add.text(x, y + 12, label, {
        fontFamily: "Cinzel, serif", fontSize: "10px", color: "#FFFFFF",
        stroke: "#000", strokeThickness: 2,
      }).setOrigin(0.5);
      this.decorLayer.add(t);
    }
    this.decorLayer.add([halo, ring]);
  }

  drawBookshelf(x, y) {
    const sh = this.add.rectangle(x, y - 18, 28, 44, 0x4C2B0F, 1);
    sh.setStrokeStyle(1, 0xA16207, 1);
    for (let i = 0; i < 3; i++) {
      const line = this.add.rectangle(x, y - 30 + i * 12, 24, 2, 0xFCD34D, 0.5);
      this.decorLayer.add(line);
    }
    this.decorLayer.add(sh);
  }
  drawScroll(x, y) {
    const r = this.add.rectangle(x, y, 22, 8, 0xFEF3C7, 0.95);
    r.setStrokeStyle(1, 0x92400E, 1);
    this.tweens.add({ targets: r, y: y - 4, yoyo: true, repeat: -1, duration: 1500, ease: "Sine.easeInOut" });
    this.decorLayer.add(r);
  }
  drawCauldron(x, y, color, scale = 1) {
    const pot = this.add.ellipse(x, y + 6, 28 * scale, 16 * scale, 0x1F1B2E, 1);
    pot.setStrokeStyle(2, 0x4B5563, 1);
    const liquid = this.add.ellipse(x, y - 2, 22 * scale, 8 * scale, color, 0.9);
    this.tweens.add({ targets: liquid, scale: 1.1, yoyo: true, repeat: -1, duration: 900 });
    this.decorLayer.add([pot, liquid]);
    // bubbles
    for (let i = 0; i < 3; i++) {
      const b = this.add.circle(x + (Math.random() - 0.5) * 16, y - 4, 2, color, 0.8);
      this.tweens.add({ targets: b, y: y - 22, alpha: 0, repeat: -1, duration: 1200 + i * 300,
        onRepeat: () => { b.x = x + (Math.random() - 0.5) * 16; b.y = y - 4; b.alpha = 0.8; } });
      this.decorLayer.add(b);
    }
  }
  drawGear(x, y, color, scale = 1) {
    const g = this.add.graphics();
    g.lineStyle(3, color, 1);
    g.strokeCircle(0, 0, 16 * scale);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineBetween(Math.cos(a) * 16 * scale, Math.sin(a) * 16 * scale,
                    Math.cos(a) * 22 * scale, Math.sin(a) * 22 * scale);
    }
    g.x = x; g.y = y - 8;
    this.tweens.add({ targets: g, rotation: Math.PI * 2, repeat: -1, duration: 6000 });
    this.decorLayer.add(g);
  }
  drawMachine(x, y, color) {
    const box = this.add.rectangle(x, y, 28, 32, color, 0.5);
    box.setStrokeStyle(1, 0xFCD34D, 1);
    const light = this.add.circle(x + 10, y - 10, 2, 0xEF4444, 1);
    this.tweens.add({ targets: light, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });
    this.decorLayer.add([box, light]);
  }
  drawAnvil(x, y) {
    const r = this.add.rectangle(x, y, 24, 8, 0x4B5563, 1);
    r.setStrokeStyle(1, 0x000000, 1);
    this.decorLayer.add(r);
  }
  drawClock(x, y, color, scale = 1) {
    const ring = this.add.circle(x, y - 14, 18 * scale, 0x000000, 1);
    ring.setStrokeStyle(2, color, 1);
    const hand = this.add.rectangle(x, y - 14, 1, 14 * scale, color, 1);
    hand.setOrigin(0.5, 1);
    this.tweens.add({ targets: hand, rotation: Math.PI * 2, repeat: -1, duration: 8000 });
    const pivot = this.add.circle(x, y - 14, 2, color, 1);
    this.decorLayer.add([ring, hand, pivot]);
  }
  drawGravestone(x, y) {
    const g = this.add.graphics();
    g.fillStyle(0x4B5563, 1);
    g.fillRoundedRect(x - 10, y - 18, 20, 24, 8);
    g.lineStyle(1, 0x000000, 1);
    g.strokeRoundedRect(x - 10, y - 18, 20, 24, 8);
    this.decorLayer.add(g);
  }
  drawCrypt(x, y, color) {
    const r = this.add.rectangle(x, y - 8, 36, 26, 0x312E81, 1);
    r.setStrokeStyle(2, color, 1);
    const door = this.add.rectangle(x, y - 4, 12, 16, 0x000000, 1);
    door.setStrokeStyle(1, color, 0.6);
    this.decorLayer.add([r, door]);
  }
  drawObelisk(x, y, color) {
    const r = this.add.triangle(x, y, 0, 36, -10, 0, 10, 0, color, 0.85);
    r.setStrokeStyle(1, 0xFFFFFF, 0.6);
    this.tweens.add({ targets: r, alpha: 0.6, yoyo: true, repeat: -1, duration: 2000 });
    this.decorLayer.add(r);
  }
  drawBones(x, y) {
    const r = this.add.rectangle(x, y, 12, 3, 0xE5E7EB, 1);
    const r2 = this.add.rectangle(x, y + 4, 8, 3, 0xE5E7EB, 1);
    this.decorLayer.add([r, r2]);
  }
  drawRock(x, y) {
    const c = this.add.circle(x, y, 12, 0x4B5563, 1);
    c.setStrokeStyle(1, 0x000000, 1);
    this.decorLayer.add(c);
  }
  drawFlower(x, y, color) {
    const stem = this.add.rectangle(x, y, 1, 10, 0x10B981, 1);
    const f = this.add.circle(x, y - 6, 4, color, 1);
    this.tweens.add({ targets: f, scale: 1.3, yoyo: true, repeat: -1, duration: 1200 });
    this.decorLayer.add([stem, f]);
  }
  drawTree(x, y, color) {
    const trunk = this.add.rectangle(x, y + 4, 4, 16, 0x4C2B0F, 1);
    const crown = this.add.circle(x, y - 10, 14, color, 0.9);
    crown.setStrokeStyle(1, 0x000000, 0.4);
    this.tweens.add({ targets: crown, scale: 1.05, yoyo: true, repeat: -1, duration: 2200 });
    this.decorLayer.add([trunk, crown]);
  }
  drawTelescope(x, y, color, scale = 1) {
    const base = this.add.rectangle(x, y + 6, 6 * scale, 14 * scale, 0x4B5563, 1);
    const tube = this.add.rectangle(x, y - 8 * scale, 28 * scale, 6 * scale, color, 0.9);
    tube.setAngle(-30);
    tube.setStrokeStyle(1, 0xFFFFFF, 0.6);
    this.decorLayer.add([base, tube]);
  }
  drawTent(x, y, color) {
    const t = this.add.triangle(x, y, 0, -20, -16, 6, 16, 6, color, 0.85);
    t.setStrokeStyle(1, 0xFFFFFF, 0.5);
    this.decorLayer.add(t);
  }
  drawFireplace(x, y, color) {
    const base = this.add.rectangle(x, y + 4, 22, 8, 0x1F1B2E, 1);
    const flame = this.add.circle(x, y - 6, 8, color, 0.9);
    this.tweens.add({ targets: flame, scale: 1.3, yoyo: true, repeat: -1, duration: 500 });
    this.decorLayer.add([base, flame]);
  }
  drawTorch(x, y) {
    const r = this.add.rectangle(x, y, 2, 10, 0x4C2B0F, 1);
    const f = this.add.circle(x, y - 8, 4, 0xFB923C, 0.95);
    this.tweens.add({ targets: f, scale: 1.4, yoyo: true, repeat: -1, duration: 400 });
    this.decorLayer.add([r, f]);
  }
  drawBarrel(x, y) {
    const r = this.add.rectangle(x, y, 16, 18, 0x78350F, 1);
    r.setStrokeStyle(1, 0x000000, 0.8);
    const band = this.add.rectangle(x, y - 4, 16, 2, 0x4B5563, 1);
    this.decorLayer.add([r, band]);
  }
  drawTable(x, y, color) {
    const r = this.add.rectangle(x, y, 26, 8, color || 0x78350F, 0.95);
    r.setStrokeStyle(1, 0x000000, 0.6);
    this.decorLayer.add(r);
  }
  drawBench(x, y) {
    const r = this.add.rectangle(x, y, 20, 4, 0x78350F, 1);
    this.decorLayer.add(r);
  }
  drawStall(x, y, color) {
    const post1 = this.add.rectangle(x - 12, y, 2, 24, 0x4C2B0F, 1);
    const post2 = this.add.rectangle(x + 12, y, 2, 24, 0x4C2B0F, 1);
    const roof = this.add.triangle(x, y - 18, 0, -10, -16, 4, 16, 4, color, 0.85);
    roof.setStrokeStyle(1, 0xFFFFFF, 0.4);
    const counter = this.add.rectangle(x, y + 8, 28, 6, color, 0.7);
    this.decorLayer.add([post1, post2, roof, counter]);
  }
  drawBuilding(x, y, color, label) {
    const body = this.add.rectangle(x, y - 6, 32, 36, color, 0.5);
    body.setStrokeStyle(2, 0xFFFFFF, 0.4);
    const roof = this.add.triangle(x, y - 24, 0, -16, -20, 4, 20, 4, color, 0.85);
    const door = this.add.rectangle(x, y + 6, 8, 12, 0x000000, 0.9);
    this.decorLayer.add([body, roof, door]);
    if (label) {
      const t = this.add.text(x, y - 30, label, {
        fontFamily: "Cinzel, serif", fontSize: "10px", color: "#FFFFFF",
        stroke: "#000", strokeThickness: 2,
      }).setOrigin(0.5);
      this.decorLayer.add(t);
    }
  }
  drawNoticeboard(x, y, color) {
    const board = this.add.rectangle(x, y - 6, 26, 22, 0x78350F, 1);
    board.setStrokeStyle(1, color, 1);
    for (let i = 0; i < 3; i++) {
      const p = this.add.rectangle(x - 6 + i * 6, y - 6, 4, 5, 0xFEF3C7, 0.9);
      this.decorLayer.add(p);
    }
    this.decorLayer.add(board);
  }
  drawStands(x, y) {
    const r1 = this.add.rectangle(x, y - 8, 32, 4, 0x4B5563, 1);
    const r2 = this.add.rectangle(x, y, 32, 4, 0x4B5563, 1);
    const r3 = this.add.rectangle(x, y + 8, 32, 4, 0x4B5563, 1);
    this.decorLayer.add([r1, r2, r3]);
  }
  drawPedestal(x, y, color) {
    const base = this.add.rectangle(x, y + 4, 22, 10, 0x312E81, 1);
    const top = this.add.circle(x, y - 6, 6, color, 0.95);
    top.setStrokeStyle(1, 0xFFFFFF, 0.6);
    this.tweens.add({ targets: top, y: y - 10, yoyo: true, repeat: -1, duration: 1500, ease: "Sine.easeInOut" });
    this.decorLayer.add([base, top]);
  }
  drawBanner(x, y, color, label) {
    const pole = this.add.rectangle(x, y - 4, 2, 40, 0x4B5563, 1);
    const cloth = this.add.rectangle(x, y - 14, 18, 22, color, 0.85);
    cloth.setStrokeStyle(1, 0xFFFFFF, 0.4);
    this.decorLayer.add([pole, cloth]);
    if (label) {
      const t = this.add.text(x, y - 14, label, {
        fontFamily: "Cinzel, serif", fontSize: "8px", color: "#FFFFFF",
        stroke: "#000", strokeThickness: 2,
      }).setOrigin(0.5);
      this.decorLayer.add(t);
    }
  }

  /* --- particles (ambient) --- */
  applyParticles(spec) {
    if (!spec) return;
    const color = parseInt((spec.color || "#FFFFFF").replace("#", "0x"));
    const count = Math.min(60, spec.count || 20);
    const kind = spec.kind;
    for (let i = 0; i < count; i++) {
      this.spawnParticle(kind, color);
    }
  }
  spawnParticle(kind, color) {
    const x = Math.random() * this.worldW;
    const y = Math.random() * this.worldH;
    let obj;
    if (kind === "embers" || kind === "ash" || kind === "fireflies" || kind === "souls" || kind === "gold_motes" || kind === "dust" || kind === "shooting_stars" || kind === "rift_swirl" || kind === "cosmic_swirl" || kind === "time_dust") {
      obj = this.add.circle(x, y, kind === "shooting_stars" ? 2 : 1.5, color, 0.85);
      const dur = 2500 + Math.random() * 3000;
      const dy = kind === "embers" || kind === "souls" || kind === "fireflies" ? -this.worldH : this.worldH;
      this.tweens.add({
        targets: obj, y: obj.y + dy, x: obj.x + (Math.random() - 0.5) * 100, alpha: 0,
        duration: dur, repeat: -1,
        onRepeat: () => { obj.x = Math.random() * this.worldW; obj.y = kind === "embers" ? this.worldH + 10 : -10; obj.alpha = 0.85; },
      });
    } else if (kind === "leaves" || kind === "books" || kind === "runes" || kind === "bubbles" || kind === "steam") {
      obj = this.add.rectangle(x, y, 3, 3, color, 0.7);
      this.tweens.add({
        targets: obj, y: obj.y - this.worldH, x: obj.x + (Math.random() - 0.5) * 80, alpha: 0,
        duration: 3000 + Math.random() * 2000, repeat: -1,
        onRepeat: () => { obj.x = Math.random() * this.worldW; obj.y = this.worldH + 10; obj.alpha = 0.7; },
      });
    } else if (kind === "stars" || kind === "sparks") {
      obj = this.add.circle(x, y, Math.random() < 0.8 ? 1 : 2, color, 0.4 + Math.random() * 0.5);
      this.tweens.add({ targets: obj, alpha: 0.1, yoyo: true, repeat: -1, duration: 1000 + Math.random() * 2000 });
    } else {
      obj = this.add.circle(x, y, 1, color, 0.5);
    }
    this.particleLayer.add(obj);
  }

  /* --- NPCs (decorative non-interactive) --- */
  spawnNpc(npc) {
    const screen = tileToScreen(npc.tx, npc.ty, this.originX, this.originY);
    const sx = screen.x + TILE_W / 2;
    const sy = screen.y + TILE_H / 2;
    const key = ensureCharTexture(this, npc.class_id || "explorer", npc.role || "user");
    const container = this.add.container(sx, sy);
    const ring = this.add.ellipse(0, 4, 28, 10, 0x9CA3AF, 0.35);
    const sprite = this.add.sprite(0, -16, key).setOrigin(0.5, 0.85);
    sprite.setScale(1.5);
    const nameText = this.add.text(0, -52, npc.name || "PNJ", {
      fontFamily: "Cinzel, serif", fontSize: "11px", color: "#CFA8FF",
      fontStyle: "bold", stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5);
    const tag = this.add.text(0, -40, "PNJ", {
      fontFamily: "ui-monospace, monospace", fontSize: "8px", color: "#A1A1AA",
      stroke: "#000", strokeThickness: 2,
    }).setOrigin(0.5);
    container.add([ring, sprite, tag, nameText]);
    this.tweens.add({ targets: ring, scaleX: 1.1, scaleY: 1.1, alpha: 0.2, yoyo: true, repeat: -1, duration: 1800 });
    // periodic line bubble
    if (npc.line) {
      const speakLine = () => {
        if (!this.scene || !this.scene.systems || !this.scene.systems.isActive) return;
        const bg = this.add.graphics();
        const t = this.add.text(0, 0, npc.line, {
          fontFamily: "ui-sans-serif", fontSize: "11px", color: "#0A0613",
          wordWrap: { width: 180 }, align: "center",
        }).setOrigin(0.5);
        const padX = 8, padY = 5;
        const w = Math.ceil(t.width) + padX * 2;
        const h = Math.ceil(t.height) + padY * 2;
        bg.fillStyle(0xF9FAFB, 0.96);
        bg.lineStyle(1, 0x9D4CDD, 0.8);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
        bg.fillTriangle(-4, h / 2, 4, h / 2, 0, h / 2 + 6);
        const bubble = this.add.container(sx, sy - 70, [bg, t]);
        bubble.setAlpha(0);
        this.tweens.add({ targets: bubble, alpha: 1, y: sy - 78, duration: 250 });
        this.time.delayedCall(4500, () => {
          this.tweens.add({ targets: bubble, alpha: 0, y: bubble.y - 8, duration: 400, onComplete: () => bubble.destroy() });
        });
      };
      this.time.delayedCall(2000 + Math.random() * 4000, speakLine);
      this.time.addEvent({ delay: 18000 + Math.random() * 12000, loop: true, callback: speakLine });
    }
    this.entityLayer.add(container);
  }

  upsertPlayer(p) {
    if (!p) return;
    const existing = this.players[p.sid];
    if (existing) {
      this.movePlayer(p.sid, p.tx, p.ty, p.facing, false);
      existing.profile = p;
      this.updateNameTag(existing);
      return;
    }
    const key = ensureCharTexture(this, p.class_id, p.role);
    const screen = tileToScreen(p.tx, p.ty, this.originX, this.originY);
    const sx = screen.x + TILE_W / 2;
    const sy = screen.y + TILE_H / 2;
    const container = this.add.container(sx, sy);
    const ring = this.add.ellipse(0, 4, 30, 12, CLASS_COLOR_INT[p.class_id] || 0x9CA3AF, 0.45);
    ring.setStrokeStyle(1, 0xFFFFFF, 0.45);
    const sprite = this.add.sprite(0, -16, key).setOrigin(0.5, 0.85);
    sprite.setScale(1.6);
    if (p.role === "admin" || p.role === "moderator") {
      this.tweens.add({ targets: ring, scaleX: 1.25, scaleY: 1.25, alpha: 0.15, yoyo: true, repeat: -1, duration: 900 });
    } else {
      this.tweens.add({ targets: ring, scaleX: 1.08, scaleY: 1.08, alpha: 0.25, yoyo: true, repeat: -1, duration: 1500 });
    }
    const nameText = this.add.text(0, -56, "", {
      fontFamily: "Cinzel, serif", fontSize: "12px",
      color: p.role === "admin" ? "#FFD700" : p.role === "moderator" ? "#F97316" : "#FFFFFF",
      fontStyle: "bold", stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5);
    const subText = this.add.text(0, -42, "", {
      fontFamily: "ui-monospace, monospace", fontSize: "9px",
      color: CLASS_HEX[p.class_id] || "#A1A1AA", stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5);
    container.add([ring, sprite, subText, nameText]);
    container.tile = { tx: p.tx, ty: p.ty };
    container.profile = p;
    container.sprite = sprite;
    container.ring = ring;
    container.nameText = nameText;
    container.subText = subText;
    this.updateNameTag(container);
    if (p.invisible) container.setAlpha(0.35);
    // Rank aura
    this.addRankAura(container, p.active_title);

    sprite.setInteractive({ useHandCursor: true });
    sprite.on("pointerdown", (pointer, lx, ly, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      // Pass pointer button info: rightButtonDown() for right-click, middle for middle button.
      const meta = {
        right: !!(pointer && (pointer.rightButtonDown ? pointer.rightButtonDown() : pointer.button === 2)),
        shift: !!(pointer && pointer.event && pointer.event.shiftKey),
        screenX: pointer ? pointer.x : 0,
        screenY: pointer ? pointer.y : 0,
      };
      this.onPlayerClick && this.onPlayerClick(p, meta);
    });
    this.players[p.sid] = container;
    this.entityLayer.add(container);
    this.sortDepth();
  }

  updateNameTag(container) {
    const p = container.profile;
    if (!p) return;
    const crown = p.role === "admin" ? "👑 " : p.role === "moderator" ? "🛡️ " : "";
    const mute = p.muted ? " 🔇" : "";
    const freeze = p.frozen ? " ❄" : "";
    container.nameText.setText(`${crown}${p.username}${mute}${freeze}`);
    container.subText.setText(`${p.class_name} · niv ${p.level}`);
  }

  movePlayer(sid, tx, ty, facing, teleport = false) {
    const c = this.players[sid];
    if (!c) return;
    const screen = tileToScreen(tx, ty, this.originX, this.originY);
    const sx = screen.x + TILE_W / 2;
    const sy = screen.y + TILE_H / 2;
    c.tile = { tx, ty };
    if (c.profile) { c.profile.tx = tx; c.profile.ty = ty; }
    if (teleport) {
      const flash = this.add.circle(c.x, c.y, 30, 0x00E5FF, 0.8);
      this.tweens.add({ targets: flash, scale: 3, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
      c.x = sx; c.y = sy;
    } else {
      this.tweens.add({ targets: c, x: sx, y: sy, duration: 250, ease: "Sine.easeOut" });
    }
    if (facing === "W" || facing === "NW" || facing === "SW") c.sprite?.setFlipX(true);
    else if (facing === "E" || facing === "NE" || facing === "SE") c.sprite?.setFlipX(false);
    this.sortDepth();
  }

  removePlayer(sid) {
    const c = this.players[sid];
    if (!c) return;
    this.tweens.add({ targets: c, alpha: 0, duration: 200, onComplete: () => { c.destroy(); delete this.players[sid]; } });
  }

  setPlayerStatus(sid, patch) {
    const c = this.players[sid];
    if (!c || !c.profile) return;
    Object.assign(c.profile, patch);
    this.updateNameTag(c);
    if ("invisible" in patch) c.setAlpha(patch.invisible ? 0.35 : 1);
  }

  showBubble(sid, text) {
    const c = this.players[sid];
    if (!c) return;
    const bg = this.add.graphics();
    const t = this.add.text(0, 0, text.slice(0, 80), {
      fontFamily: "ui-sans-serif", fontSize: "12px", color: "#0A0613",
      wordWrap: { width: 180 }, align: "center",
    }).setOrigin(0.5);
    const padX = 8, padY = 5;
    const w = Math.ceil(t.width) + padX * 2;
    const h = Math.ceil(t.height) + padY * 2;
    bg.fillStyle(0xF9FAFB, 0.96);
    bg.lineStyle(1, 0x9D4CDD, 0.8);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    bg.fillTriangle(-4, h / 2, 4, h / 2, 0, h / 2 + 6);
    const bubble = this.add.container(c.x, c.y - 72, [bg, t]);
    bubble.setAlpha(0);
    this.tweens.add({ targets: bubble, alpha: 1, y: c.y - 80, duration: 200 });
    this.time.delayedCall(3800, () => {
      this.tweens.add({ targets: bubble, alpha: 0, y: bubble.y - 12, duration: 400, onComplete: () => bubble.destroy() });
    });
  }

  spawnItem(item) {
    if (this.itemSprites[item.item_id]) return;
    const screen = tileToScreen(item.tx, item.ty, this.originX, this.originY);
    const sx = screen.x + TILE_W / 2;
    const sy = screen.y + TILE_H / 2 - 12;
    const color = parseInt((RARITY_HEX[item.rarity] || "#FFFFFF").replace("#", "0x"));
    const halo = this.add.circle(0, 6, 16, color, 0.35);
    const orb = this.add.circle(0, 0, 8, color, 1);
    orb.setStrokeStyle(2, 0xFFFFFF, 0.9);
    const icon = this.add.text(0, 0, item.icon || "✨", {
      fontFamily: "ui-sans-serif", fontSize: "14px",
    }).setOrigin(0.5);
    const container = this.add.container(sx, sy, [halo, orb, icon]);
    this.tweens.add({ targets: container, y: sy - 6, yoyo: true, repeat: -1, duration: 1100, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: halo, scale: 1.4, alpha: 0.1, yoyo: true, repeat: -1, duration: 900 });
    container.setSize(24, 24);
    container.setInteractive({ useHandCursor: true });
    container.on("pointerdown", (e) => {
      if (e && e.event && e.event.stopPropagation) e.event.stopPropagation();
      this.onPickup && this.onPickup(item.item_id);
    });
    this.itemSprites[item.item_id] = container;
    this.entityLayer.add(container);
    this.sortDepth();
  }
  removeItem(itemId) {
    const s = this.itemSprites[itemId];
    if (!s) return;
    this.tweens.add({ targets: s, scale: 1.6, alpha: 0, duration: 350, onComplete: () => { s.destroy(); delete this.itemSprites[itemId]; } });
  }

  applyWeather(weather) {
    this.weather = weather;
    if (!this.weatherLayer) return;
    this.weatherLayer.removeAll(true);
    if (weather === "rain") {
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * this.worldW;
        const y = Math.random() * this.worldH;
        const drop = this.add.line(0, 0, x, y, x - 4, y + 14, 0x9CCDFF, 0.5).setLineWidth(1);
        this.tweens.add({
          targets: drop, y: drop.y + this.worldH, x: drop.x - this.worldH * 0.3,
          duration: 1200 + Math.random() * 800, repeat: -1,
          onRepeat: () => { drop.y = -20; drop.x = Math.random() * this.worldW; },
        });
        this.weatherLayer.add(drop);
      }
    } else if (weather === "storm") {
      const overlay = this.add.rectangle(this.worldW / 2, this.worldH / 2, this.worldW, this.worldH, 0x000000, 0.35);
      this.weatherLayer.add(overlay);
      const flash = () => {
        if (!this.weatherLayer || !this.weatherLayer.active) return;
        const bolt = this.add.rectangle(this.worldW / 2, this.worldH / 2, this.worldW, this.worldH, 0xFFFFFF, 0.7);
        this.weatherLayer.add(bolt);
        this.tweens.add({ targets: bolt, alpha: 0, duration: 150, onComplete: () => bolt.destroy() });
        this.time.delayedCall(2000 + Math.random() * 5000, flash);
      };
      flash();
      for (let i = 0; i < 90; i++) {
        const x = Math.random() * this.worldW;
        const y = Math.random() * this.worldH;
        const drop = this.add.line(0, 0, x, y, x - 6, y + 22, 0x9CCDFF, 0.7).setLineWidth(1);
        this.tweens.add({
          targets: drop, y: drop.y + this.worldH, x: drop.x - this.worldH * 0.4,
          duration: 700 + Math.random() * 400, repeat: -1,
          onRepeat: () => { drop.y = -20; drop.x = Math.random() * this.worldW; },
        });
        this.weatherLayer.add(drop);
      }
    } else if (weather === "eclipse") {
      const dark = this.add.rectangle(this.worldW / 2, this.worldH / 2, this.worldW, this.worldH, 0x0A0613, 0.55);
      const ring = this.add.circle(this.worldW / 2, 100, 60, 0x000000, 0.95);
      ring.setStrokeStyle(4, 0xFFD700, 0.9);
      this.weatherLayer.add([dark, ring]);
    } else if (weather === "aurora") {
      for (let i = 0; i < 4; i++) {
        const ribbon = this.add.rectangle(Math.random() * this.worldW, 50 + i * 30, this.worldW * 0.8, 28, i % 2 ? 0x00E5FF : 0x9D4CDD, 0.18);
        ribbon.setAngle(-5 + i * 3);
        this.weatherLayer.add(ribbon);
        this.tweens.add({ targets: ribbon, x: ribbon.x + 150, yoyo: true, repeat: -1, duration: 6000 + i * 800 });
        this.tweens.add({ targets: ribbon, alpha: 0.06, yoyo: true, repeat: -1, duration: 3500 });
      }
    }
  }

  sortDepth() { if (this.entityLayer) this.entityLayer.list.sort((a, b) => a.y - b.y); }

  update(_t, delta) {
    // animate auras
    for (const sid in this.players) {
      const c = this.players[sid];
      if (c.auraTick) c.auraTick(delta);
    }
    if (!this.path || this.path.length === 0 || !this.you) return;
    const me = this.players[this.you.sid];
    if (!me) return;
    if (me.profile?.frozen) { this.path = []; this.targetTile = null; return; }
    const next = this.path[0];
    const target = tileToScreen(next.tx, next.ty, this.originX, this.originY);
    const sx = target.x + TILE_W / 2;
    const sy = target.y + TILE_H / 2;
    const dx = sx - me.x, dy = sy - me.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) {
      me.x = sx; me.y = sy;
      me.tile = { tx: next.tx, ty: next.ty };
      if (me.profile) { me.profile.tx = next.tx; me.profile.ty = next.ty; }
      this.path.shift();
      const facing = this.computeFacing(dx, dy);
      if (me.sprite) { if (facing.includes("W")) me.sprite.setFlipX(true); else me.sprite.setFlipX(false); }
      const now = Date.now();
      if (now - this.lastEmit > 90) {
        this.onMoveEmit && this.onMoveEmit(next.tx, next.ty, facing);
        this.lastEmit = now;
      }
      this.sortDepth();
    } else {
      const step = Math.min(dist, 3.5);
      me.x += (dx / dist) * step;
      me.y += (dy / dist) * step;
      this.sortDepth();
    }
  }
}
