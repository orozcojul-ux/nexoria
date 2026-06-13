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

    // Central crystal at center tile
    const center = tileToScreen(Math.floor(room.tiles_x / 2), Math.floor(room.tiles_y / 2), this.originX, this.originY);
    const halo = this.add.circle(center.x + TILE_W / 2, center.y + TILE_H / 2, 80, 0x9D4CDD, 0.18);
    this.tweens.add({ targets: halo, scale: 1.2, alpha: 0.08, yoyo: true, repeat: -1, duration: 2000 });
    const crystal = this.add.graphics();
    const cx = center.x + TILE_W / 2;
    const cy = center.y + TILE_H / 2 - 24;
    crystal.fillStyle(0xCFA8FF, 0.95);
    crystal.beginPath();
    crystal.moveTo(cx, cy - 22); crystal.lineTo(cx + 8, cy - 8);
    crystal.lineTo(cx + 6, cy + 18); crystal.lineTo(cx - 6, cy + 18);
    crystal.lineTo(cx - 8, cy - 8); crystal.closePath().fillPath();
    crystal.lineStyle(1, 0xFFFFFF, 0.7).strokePath();
    this.tweens.add({ targets: crystal, y: -4, yoyo: true, repeat: -1, duration: 1800, ease: "Sine.easeInOut" });

    this.entityLayer = this.add.container(0, 0);
    this.weatherLayer = this.add.container(0, 0);
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
      this.onPlayerClick && this.onPlayerClick(p);
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
