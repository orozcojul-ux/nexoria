import React, { useEffect, useRef, useState, useCallback } from "react";
import Phaser from "phaser";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Users, Globe2, Wifi, WifiOff, Shield, Crown, Eye, EyeOff,
  Megaphone, Ban, Volume2, VolumeX, Footprints, Snowflake, Sparkles,
  CloudRain, CloudLightning, Sun, Cloud, X, MapPin, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import api, { getToken } from "@/lib/api";
import { RuneSeal, RuneDivider } from "@/components/Ornaments";
import StarField from "@/components/StarField";
import { useAuth } from "@/contexts/AuthContext";
import HeroName from "@/components/HeroName";

/* ===================== ISOMETRIC CONFIG ===================== */
const TILE_W = 64;
const TILE_H = 32;
const ISO_ORIGIN_X = 0;   // horizontal offset (set in scene)
const ISO_ORIGIN_Y = 0;

const CLASS_HEX = {
  mage: "#9D4CDD", warrior: "#EF4444", assassin: "#71717A", paladin: "#EAB308",
  alchemist: "#10B981", explorer: "#00BFFF", necromancer: "#7928CA",
  architect: "#A855F7", chronomancer: "#00E5FF", inventor: "#FFD700",
};
const CLASS_COLOR_INT = Object.fromEntries(
  Object.entries(CLASS_HEX).map(([k, v]) => [k, parseInt(v.replace("#", "0x"))])
);

const RARITY_HEX = {
  common: "#9CA3AF", rare: "#00BFFF", epic: "#A855F7",
  legendary: "#EAB308", mythic: "#EF4444", divine: "#FBBF24", cosmic: "#FFFFFF",
};

const THEME_FLOOR = {
  cosmic: { base: 0x1A0F2E, edge: 0x4C1D95, accent: 0x9D4CDD },
  tavern: { base: 0x3D2817, edge: 0x78350F, accent: 0xEAB308 },
  arena:  { base: 0x0F172A, edge: 0x1E3A8A, accent: 0x00E5FF },
};

/* ===================== ISOMETRIC HELPERS ===================== */
function tileToScreen(tx, ty, originX, originY) {
  return {
    x: originX + (tx - ty) * (TILE_W / 2),
    y: originY + (tx + ty) * (TILE_H / 2),
  };
}
function screenToTile(sx, sy, originX, originY) {
  const dx = sx - originX, dy = sy - originY;
  const tx = (dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2;
  const ty = (dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2;
  return { tx: Math.round(tx), ty: Math.round(ty) };
}

/* ===================== PIXEL ART SPRITE GENERATOR ===================== */
/**
 * Create a 24x32 pixel-art isometric character sprite as a texture.
 * Body color drives the class; outline color drives the role (gold for admin,
 * orange for moderator). Returns the texture key.
 */
function ensureCharTexture(scene, classId, role) {
  const key = `char_${classId}_${role}`;
  if (scene.textures.exists(key)) return key;
  const W = 24, H = 32;
  const g = scene.add.graphics();
  const bodyColor = CLASS_COLOR_INT[classId] || 0x9CA3AF;
  const outline = role === "admin" ? 0xFFD700 : role === "moderator" ? 0xF97316 : 0x0A0613;
  const skin = 0xF5D0A9;
  const hair = role === "admin" ? 0xFFD700 : role === "moderator" ? 0xF97316 : 0x1F1B2E;

  // Helpers
  const px = (x, y, color, alpha = 1) => {
    g.fillStyle(color, alpha);
    g.fillRect(x, y, 1, 1);
  };

  // Shadow (oval at feet)
  g.fillStyle(0x000000, 0.45);
  g.fillEllipse(W / 2, H - 2, 14, 5);

  // ===== LEGS (rows 22-28) =====
  for (let y = 22; y < 28; y++) {
    px(W / 2 - 3, y, 0x1F1B2E);   // left leg outline
    px(W / 2 - 2, y, bodyColor);  // left leg fill
    px(W / 2 + 1, y, bodyColor);  // right leg fill
    px(W / 2 + 2, y, 0x1F1B2E);   // right leg outline
  }
  // Boots (row 28-29)
  for (let y = 28; y < 30; y++) {
    for (let x = W / 2 - 4; x <= W / 2 - 1; x++) px(x, y, 0x000000);
    for (let x = W / 2 + 0; x <= W / 2 + 3; x++) px(x, y, 0x000000);
  }

  // ===== BODY / TORSO (rows 13-22) =====
  // outline
  for (let y = 13; y < 22; y++) {
    px(W / 2 - 5, y, outline);
    px(W / 2 + 4, y, outline);
  }
  for (let x = W / 2 - 4; x <= W / 2 + 3; x++) {
    px(x, 13, outline);
    px(x, 22, outline);
  }
  // fill
  for (let y = 14; y < 22; y++) {
    for (let x = W / 2 - 4; x <= W / 2 + 3; x++) {
      px(x, y, bodyColor);
    }
  }
  // chest highlight
  for (let x = W / 2 - 3; x <= W / 2; x++) px(x, 15, 0xFFFFFF, 0.25);
  // class emblem (a small diamond in chest)
  px(W / 2, 17, 0xFFFFFF, 0.9);
  px(W / 2 - 1, 18, 0xFFFFFF, 0.6);
  px(W / 2 + 1, 18, 0xFFFFFF, 0.6);
  px(W / 2, 19, 0xFFFFFF, 0.9);

  // ===== ARMS (rows 14-21) =====
  for (let y = 14; y < 21; y++) {
    px(W / 2 - 6, y, outline);
    px(W / 2 - 5, y, bodyColor);
    px(W / 2 + 4, y, bodyColor);
    px(W / 2 + 5, y, outline);
  }
  // hands
  px(W / 2 - 6, 20, skin); px(W / 2 - 5, 21, skin);
  px(W / 2 + 5, 20, skin); px(W / 2 + 4, 21, skin);

  // ===== NECK (rows 11-13) =====
  for (let y = 11; y < 13; y++) {
    for (let x = W / 2 - 2; x <= W / 2 + 1; x++) px(x, y, skin);
  }

  // ===== HEAD (rows 3-11) =====
  // outline
  for (let y = 4; y < 11; y++) { px(W / 2 - 5, y, 0x000000); px(W / 2 + 4, y, 0x000000); }
  for (let x = W / 2 - 4; x <= W / 2 + 3; x++) { px(x, 3, 0x000000); px(x, 11, 0x000000); }
  // skin fill
  for (let y = 4; y < 11; y++) {
    for (let x = W / 2 - 4; x <= W / 2 + 3; x++) px(x, y, skin);
  }
  // hair (top + sides)
  for (let x = W / 2 - 4; x <= W / 2 + 3; x++) { px(x, 4, hair); px(x, 5, hair); }
  px(W / 2 - 4, 6, hair); px(W / 2 + 3, 6, hair);
  // eyes
  px(W / 2 - 2, 7, 0x000000);
  px(W / 2 + 1, 7, 0x000000);
  // mouth
  px(W / 2 - 1, 9, 0x000000);
  px(W / 2 + 0, 9, 0x000000);

  // ===== ROLE ACCESSORY =====
  if (role === "admin") {
    // golden crown
    for (let x = W / 2 - 4; x <= W / 2 + 3; x++) px(x, 2, 0xFFD700);
    px(W / 2 - 4, 1, 0xFFD700);
    px(W / 2 - 1, 0, 0xFFD700);
    px(W / 2 + 2, 0, 0xFFD700);
    px(W / 2 + 4, 1, 0xFFD700);
  } else if (role === "moderator") {
    // orange circlet
    for (let x = W / 2 - 4; x <= W / 2 + 3; x++) px(x, 3, 0xF97316);
    px(W / 2 - 4, 2, 0xF97316);
    px(W / 2 + 3, 2, 0xF97316);
  }

  g.generateTexture(key, W, H);
  g.destroy();
  return key;
}

/**
 * Create an isometric diamond floor tile texture for a given theme.
 */
function ensureTileTexture(scene, theme, variant = "base") {
  const key = `tile_${theme}_${variant}`;
  if (scene.textures.exists(key)) return key;
  const cfg = THEME_FLOOR[theme] || THEME_FLOOR.cosmic;
  const W = TILE_W, H = TILE_H;
  const g = scene.add.graphics();
  // Top diamond
  const fill = variant === "edge" ? cfg.accent : cfg.base;
  g.fillStyle(fill, 1);
  g.beginPath();
  g.moveTo(W / 2, 0);
  g.lineTo(W, H / 2);
  g.lineTo(W / 2, H);
  g.lineTo(0, H / 2);
  g.closePath();
  g.fillPath();
  // Highlight
  g.lineStyle(1, 0xFFFFFF, 0.05);
  g.beginPath();
  g.moveTo(W / 2, 1);
  g.lineTo(W - 1, H / 2);
  g.strokePath();
  // Shadow edges
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
class NexusIsoScene extends Phaser.Scene {
  constructor() { super("NexusIsoScene"); }
  init(data) {
    this.socket = data.socket;
    this.you = data.you;
    this.room = data.room;
    this.weather = data.weather || "clear";
    this.items = data.items || [];
    this.onPlayerClick = data.onPlayerClick;
    this.onTileClick = data.onTileClick;
    this.gmPickerMode = false;
    this.players = {};
    this.itemSprites = {};
    this.path = [];
    this.targetTile = null;
    this.lastEmit = 0;
    this.weatherLayer = null;
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

    // ===== Cosmic background =====
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0A0613, 0x0A0613, 0x1A0B3D, 0x05030D, 1);
    bg.fillRect(0, 0, this.worldW, this.worldH);
    // distant stars
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * this.worldW;
      const y = Math.random() * this.worldH * 0.6;
      const r = Math.random() < 0.8 ? 1 : 2;
      const c = this.add.circle(x, y, r, 0xFFFFFF, 0.3 + Math.random() * 0.5);
      this.tweens.add({ targets: c, alpha: 0.1, yoyo: true, repeat: -1, duration: 1200 + Math.random() * 2000 });
    }

    // ===== Isometric floor =====
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
        tile.tileCoord = { tx, ty };
        tile.on("pointerover", () => tile.setTint(0x00E5FF));
        tile.on("pointerout", () => tile.clearTint());
        tile.on("pointerdown", () => {
          if (this.gmPickerMode) {
            this.onTileClick && this.onTileClick({ tx, ty });
            return;
          }
          this.requestMoveTo(tx, ty);
        });
        if (isCenter) {
          tile.setTint(0xFFD700);
        }
        this.floorLayer.add(tile);
      }
    }

    // Central glow + crystal at center tile
    const center = tileToScreen(Math.floor(room.tiles_x / 2), Math.floor(room.tiles_y / 2), this.originX, this.originY);
    const halo = this.add.circle(center.x + TILE_W / 2, center.y + TILE_H / 2, 80, 0x9D4CDD, 0.18);
    this.tweens.add({ targets: halo, scale: 1.2, alpha: 0.08, yoyo: true, repeat: -1, duration: 2000 });
    const crystal = this.add.graphics();
    const cx = center.x + TILE_W / 2;
    const cy = center.y + TILE_H / 2 - 24;
    crystal.fillStyle(0xCFA8FF, 0.95);
    crystal.beginPath();
    crystal.moveTo(cx, cy - 22);
    crystal.lineTo(cx + 8, cy - 8);
    crystal.lineTo(cx + 6, cy + 18);
    crystal.lineTo(cx - 6, cy + 18);
    crystal.lineTo(cx - 8, cy - 8);
    crystal.closePath().fillPath();
    crystal.lineStyle(1, 0xFFFFFF, 0.7).strokePath();
    this.tweens.add({ targets: crystal, y: -4, yoyo: true, repeat: -1, duration: 1800, ease: "Sine.easeInOut" });

    // ===== Entities layer (players, items) — sorted by depth Y =====
    this.entityLayer = this.add.container(0, 0);

    // ===== Weather layer =====
    this.weatherLayer = this.add.container(0, 0);
    this.applyWeather(this.weather);

    // ===== Camera =====
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);

    // Center camera on self after a tick
    this.time.delayedCall(50, () => {
      const me = this.players[this.you.sid];
      if (me) this.cameras.main.centerOn(me.x, me.y);
    });

    // Room title
    this.add.text(this.worldW / 2, 16, room.name.toUpperCase(), {
      fontFamily: "Cinzel, serif", fontSize: "22px", color: "#FFD700",
      fontStyle: "bold", stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0.9);
  }

  /* ---- Movement ---- */
  requestMoveTo(tx, ty) {
    if (!this.you) return;
    const me = this.players[this.you.sid];
    if (!me) return;
    if (me.profile && me.profile.frozen) {
      this.scene.events.emit("system_toast", { kind: "warn", text: "Vos pieds sont figés." });
      return;
    }
    this.targetTile = { tx, ty };
    this.path = this.computePath(me.tile.tx, me.tile.ty, tx, ty);
  }

  computePath(sx, sy, ex, ey) {
    // Simple linear interpolation in tile space
    const path = [];
    let cx = sx, cy = sy;
    const guard = 100;
    let g = 0;
    while ((cx !== ex || cy !== ey) && g++ < guard) {
      if (cx < ex) cx++;
      else if (cx > ex) cx--;
      if (cy < ey) cy++;
      else if (cy > ey) cy--;
      path.push({ tx: cx, ty: cy });
    }
    return path;
  }

  /* ---- Players ---- */
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
    // floor selection ring
    const ring = this.add.ellipse(0, 4, 30, 12, CLASS_COLOR_INT[p.class_id] || 0x9CA3AF, 0.45);
    ring.setStrokeStyle(1, 0xFFFFFF, 0.45);
    const sprite = this.add.sprite(0, -16, key).setOrigin(0.5, 0.85);
    sprite.setScale(1.6);
    // Faint pulse for staff
    if (p.role === "admin" || p.role === "moderator") {
      this.tweens.add({ targets: ring, scaleX: 1.25, scaleY: 1.25, alpha: 0.15, yoyo: true, repeat: -1, duration: 900 });
    } else {
      this.tweens.add({ targets: ring, scaleX: 1.08, scaleY: 1.08, alpha: 0.25, yoyo: true, repeat: -1, duration: 1500 });
    }
    // Name + class line
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

    if (p.invisible) {
      container.setAlpha(0.35);
    }

    // Click on player → emit to React
    sprite.setInteractive({ useHandCursor: true });
    sprite.on("pointerdown", (pointer, lx, ly, event) => {
      event.stopPropagation();
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
      // Flash effect
      const flash = this.add.circle(c.x, c.y, 30, 0x00E5FF, 0.8);
      this.tweens.add({ targets: flash, scale: 3, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
      c.x = sx; c.y = sy;
    } else {
      this.tweens.add({ targets: c, x: sx, y: sy, duration: 250, ease: "Sine.easeOut" });
    }
    if (facing === "W" || facing === "NW" || facing === "SW") {
      c.sprite && c.sprite.setFlipX(true);
    } else if (facing === "E" || facing === "NE" || facing === "SE") {
      c.sprite && c.sprite.setFlipX(false);
    }
    this.sortDepth();
  }

  removePlayer(sid) {
    const c = this.players[sid];
    if (!c) return;
    this.tweens.add({
      targets: c, alpha: 0, duration: 200,
      onComplete: () => { c.destroy(); delete this.players[sid]; },
    });
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
    // tail
    bg.fillTriangle(-4, h / 2, 4, h / 2, 0, h / 2 + 6);
    const bubble = this.add.container(c.x, c.y - 72, [bg, t]);
    bubble.setAlpha(0);
    this.tweens.add({ targets: bubble, alpha: 1, y: c.y - 80, duration: 200 });
    this.time.delayedCall(3800, () => {
      this.tweens.add({ targets: bubble, alpha: 0, y: bubble.y - 12, duration: 400, onComplete: () => bubble.destroy() });
    });
  }

  /* ---- Items ---- */
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
      this.socket && this.socket.emit("pickup_item", { item_id: item.item_id });
    });
    this.itemSprites[item.item_id] = container;
    this.entityLayer.add(container);
    this.sortDepth();
  }

  removeItem(itemId) {
    const s = this.itemSprites[itemId];
    if (!s) return;
    this.tweens.add({
      targets: s, scale: 1.6, alpha: 0, duration: 350,
      onComplete: () => { s.destroy(); delete this.itemSprites[itemId]; },
    });
  }

  /* ---- Weather ---- */
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
      // Lightning flashes
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
      // Cyan/violet ribbons drifting on top
      for (let i = 0; i < 4; i++) {
        const ribbon = this.add.rectangle(Math.random() * this.worldW, 50 + i * 30, this.worldW * 0.8, 28, i % 2 ? 0x00E5FF : 0x9D4CDD, 0.18);
        ribbon.setAngle(-5 + i * 3);
        this.weatherLayer.add(ribbon);
        this.tweens.add({ targets: ribbon, x: ribbon.x + 150, yoyo: true, repeat: -1, duration: 6000 + i * 800 });
        this.tweens.add({ targets: ribbon, alpha: 0.06, yoyo: true, repeat: -1, duration: 3500 });
      }
    }
  }

  sortDepth() {
    if (!this.entityLayer) return;
    this.entityLayer.list.sort((a, b) => a.y - b.y);
  }

  update() {
    if (!this.path || this.path.length === 0 || !this.you) return;
    const me = this.players[this.you.sid];
    if (!me) return;
    if (me.profile && me.profile.frozen) { this.path = []; this.targetTile = null; return; }
    // Smoothly advance toward the next tile in the path
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
      // Emit move
      const facing = this.computeFacing(dx, dy);
      if (me.sprite) {
        if (facing.includes("W")) me.sprite.setFlipX(true);
        else me.sprite.setFlipX(false);
      }
      const now = Date.now();
      if (now - this.lastEmit > 90) {
        this.socket.emit("move", { tx: next.tx, ty: next.ty, facing });
        this.lastEmit = now;
      }
      this.sortDepth();
    } else {
      const speed = 3.5;
      const step = Math.min(dist, speed);
      me.x += (dx / dist) * step;
      me.y += (dy / dist) * step;
      this.sortDepth();
    }
  }

  computeFacing(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "E" : "W";
    return dy > 0 ? "S" : "N";
  }
}

/* ===================== REACT COMPONENT ===================== */
const WEATHER_LABEL = {
  clear: { fr: "Ciel clair", icon: Sun, color: "text-yellow-300" },
  rain:  { fr: "Pluie",      icon: CloudRain, color: "text-blue-300" },
  storm: { fr: "Orage",      icon: CloudLightning, color: "text-purple-300" },
  eclipse: { fr: "Éclipse",  icon: Cloud, color: "text-zinc-300" },
  aurora:  { fr: "Aurore",   icon: Sparkles, color: "text-cyan-300" },
};

export default function Nexus() {
  const { user } = useAuth();
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
  const socketRef = useRef(null);
  const playersRef = useRef([]);

  const [status, setStatus] = useState("connecting");
  const [room, setRoom] = useState(null);
  const [you, setYou] = useState(null);
  const [players, setPlayers] = useState([]);
  const [chat, setChat] = useState([]);
  const [text, setText] = useState("");
  const [rooms, setRooms] = useState([]);
  const [weather, setWeather] = useState("clear");
  const [isStaff, setIsStaff] = useState(false);
  const [gmOpen, setGmOpen] = useState(false);
  const [gmInvisible, setGmInvisible] = useState(false);
  const [gmPickerMode, setGmPickerMode] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [pendingGmAction, setPendingGmAction] = useState(null); // { kind:'teleport'|'spawn', payload }
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [announceText, setAnnounceText] = useState("");
  const [banOpen, setBanOpen] = useState(false);
  const [banHours, setBanHours] = useState(24);
  const [banReason, setBanReason] = useState("");
  const [spawnForm, setSpawnForm] = useState({ name: "Éclat d'Aether", rarity: "rare", icon: "✨" });
  const [globalAnnounce, setGlobalAnnounce] = useState(null);

  const chatEndRef = useRef(null);

  useEffect(() => { playersRef.current = players; }, [players]);

  useEffect(() => {
    api.get("/nexus/rooms").then((r) => setRooms(r.data)).catch(() => {});
  }, []);

  const onPlayerClick = useCallback((p) => {
    setSelectedTarget(p);
    setGmOpen(true);
  }, []);

  const onTileClick = useCallback((tile) => {
    if (!pendingGmAction) return;
    const { kind, target } = pendingGmAction;
    const sock = socketRef.current;
    if (!sock) return;
    if (kind === "teleport" && target) {
      sock.emit("gm_teleport", { target_user_id: target.user_id, tx: tile.tx, ty: tile.ty });
      toast.success(`Téléportation de ${target.username} → (${tile.tx},${tile.ty})`);
    } else if (kind === "spawn") {
      sock.emit("gm_spawn_item", {
        name: spawnForm.name, rarity: spawnForm.rarity, icon: spawnForm.icon,
        tx: tile.tx, ty: tile.ty,
      });
      toast.success(`Relique invoquée en (${tile.tx},${tile.ty})`);
    }
    setPendingGmAction(null);
    setGmPickerMode(false);
    if (sceneRef.current) sceneRef.current.gmPickerMode = false;
  }, [pendingGmAction, spawnForm]);

  // ---- Socket lifecycle ----
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const BACKEND = process.env.REACT_APP_BACKEND_URL;
    const socket = io(BACKEND, {
      path: "/api/nexus/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => setStatus("online"));
    socket.on("disconnect", () => setStatus("offline"));
    socket.on("connect_error", () => { setStatus("error"); toast.error("Connexion Nexus impossible"); });

    socket.on("room_joined", (payload) => {
      setRoom(payload.room);
      setYou(payload.you);
      setPlayers(payload.players);
      setChat(payload.chat_history || []);
      setWeather(payload.weather || "clear");
      setIsStaff(!!payload.is_staff);

      if (gameRef.current) { gameRef.current.destroy(true); gameRef.current = null; }
      const config = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: containerRef.current?.clientWidth || 960,
        height: containerRef.current?.clientHeight || 600,
        physics: { default: "arcade", arcade: { debug: false } },
        scene: NexusIsoScene,
        backgroundColor: "#030208",
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      };
      const game = new Phaser.Game(config);
      gameRef.current = game;
      game.scene.start("NexusIsoScene", {
        socket, you: payload.you, room: payload.room,
        weather: payload.weather, items: payload.items || [],
        onPlayerClick, onTileClick,
      });
      const tryReady = (attempt = 0) => {
        const scene = game.scene.getScene("NexusIsoScene");
        if (!scene || !scene.add) {
          if (attempt < 30) setTimeout(() => tryReady(attempt + 1), 60);
          return;
        }
        sceneRef.current = scene;
        scene.gmPickerMode = false;
        payload.players.forEach((p) => scene.upsertPlayer(p));
        (payload.items || []).forEach((it) => scene.spawnItem(it));
      };
      tryReady();
    });

    socket.on("player_join", (p) => {
      setPlayers((prev) => [...prev.filter((x) => x.sid !== p.sid), p]);
      sceneRef.current?.upsertPlayer(p);
    });
    socket.on("player_leave", ({ sid }) => {
      setPlayers((prev) => prev.filter((x) => x.sid !== sid));
      sceneRef.current?.removePlayer(sid);
    });
    socket.on("player_move", ({ sid, tx, ty, facing, teleport }) => {
      sceneRef.current?.movePlayer(sid, tx, ty, facing, !!teleport);
      setPlayers((prev) => prev.map((p) => p.sid === sid ? { ...p, tx, ty, facing } : p));
    });
    socket.on("player_status", ({ sid, ...patch }) => {
      sceneRef.current?.setPlayerStatus(sid, patch);
      setPlayers((prev) => prev.map((p) => p.sid === sid ? { ...p, ...patch } : p));
    });
    socket.on("chat", (msg) => {
      setChat((prev) => [...prev.slice(-59), msg]);
      const entry = playersRef.current.find((p) => p.user_id === msg.user_id);
      if (entry) sceneRef.current?.showBubble(entry.sid, msg.text);
    });
    socket.on("system_msg", (m) => {
      if (m.kind === "error" || m.kind === "muted") toast.error(m.text);
      else if (m.kind === "ok" || m.kind === "info" || m.kind === "pickup") toast.success(m.text);
      else if (m.kind === "warn") toast.warning ? toast.warning(m.text) : toast(m.text);
    });
    socket.on("gm_announce", (a) => {
      setGlobalAnnounce(a);
      setTimeout(() => setGlobalAnnounce(null), 8000);
    });
    socket.on("weather", ({ weather }) => {
      setWeather(weather);
      sceneRef.current?.applyWeather(weather);
    });
    socket.on("item_spawned", (item) => {
      sceneRef.current?.spawnItem(item);
    });
    socket.on("item_removed", ({ item_id }) => {
      sceneRef.current?.removeItem(item_id);
    });
    socket.on("kicked", ({ reason }) => {
      toast.error(`Vous avez été expulsé du Nexus : ${reason}`);
      setStatus("error");
    });
    socket.on("error_msg", ({ reason }) => toast.error(`Erreur Nexus : ${reason}`));

    return () => {
      socket.disconnect();
      if (gameRef.current) gameRef.current.destroy(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !socketRef.current) return;
    socketRef.current.emit("chat", { text: text.trim() });
    setText("");
  };
  const changeRoom = (rid) => socketRef.current?.emit("change_room", { room: rid });

  // ---- GM Actions ----
  const gmEmit = (event, payload, okMsg) => {
    socketRef.current?.emit(event, payload);
    if (okMsg) toast.success(okMsg);
  };
  const requestTilePickFor = (kind, target = null) => {
    setPendingGmAction({ kind, target });
    setGmPickerMode(true);
    if (sceneRef.current) sceneRef.current.gmPickerMode = true;
    toast.info(kind === "teleport" ? "Cliquez sur une case pour téléporter" : "Cliquez sur une case pour invoquer la relique");
    setGmOpen(false);
  };

  const toggleInvisible = () => {
    const v = !gmInvisible;
    setGmInvisible(v);
    socketRef.current?.emit("gm_invisible", { invisible: v });
  };

  const sendAnnounce = (e) => {
    e?.preventDefault();
    const t = announceText.trim();
    if (!t) return;
    socketRef.current?.emit("gm_announce", { text: t });
    setAnnounceText("");
    setAnnounceOpen(false);
  };

  const submitBan = (e) => {
    e?.preventDefault();
    if (!selectedTarget) return;
    socketRef.current?.emit("gm_ban", {
      target_user_id: selectedTarget.user_id,
      duration_hours: parseInt(banHours, 10) || 24,
      reason: banReason,
    });
    setBanOpen(false);
    setBanReason("");
    setBanHours(24);
    setGmOpen(false);
  };

  const WeatherIcon = (WEATHER_LABEL[weather] || WEATHER_LABEL.clear).icon;

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 relative" data-testid="nexus-page">
      <StarField density={50} />

      {/* ===== HEADER ===== */}
      <div className="text-center mb-4 relative">
        <div className="flex justify-center mb-2"><RuneSeal icon={Globe2} color="#00E5FF" size={44} /></div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-cyan-300 font-bold mb-1">Hub Social MMORPG</div>
        <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight">
          Nexus <span className="text-gradient">Online</span>
        </h1>
        <p className="text-zinc-400 text-xs mt-1 italic max-w-2xl mx-auto">
          « Cliquez sur une case pour vous déplacer, sur un héros pour interagir. »
        </p>
        <RuneDivider className="mt-3 max-w-md mx-auto" />
      </div>

      {/* ===== STATUS BAR ===== */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2" data-testid="nexus-status">
        <div className="text-[10px] uppercase tracking-[0.3em] font-bold flex items-center gap-2 flex-wrap">
          {status === "online" ? <><Wifi className="w-3 h-3 text-green-400" /> <span className="text-green-400">Connecté</span></> :
            status === "connecting" ? <span className="text-yellow-400">Connexion...</span> :
            <><WifiOff className="w-3 h-3 text-red-400" /> <span className="text-red-400">{status}</span></>}
          {room && <span className="text-cyan-300">· {room.name}</span>}
          <span className="text-zinc-500">· {players.length} héros</span>
          <span className={`flex items-center gap-1 ${WEATHER_LABEL[weather]?.color || "text-zinc-400"}`}>
            <WeatherIcon className="w-3 h-3" /> {WEATHER_LABEL[weather]?.fr || weather}
          </span>
        </div>
        <div className="flex gap-1 flex-wrap items-center">
          {rooms.map((r) => (
            <button key={r.id} onClick={() => changeRoom(r.id)} data-testid={`room-${r.id}`}
              className={`px-3 py-1 rounded text-xs font-bold font-display border transition-all ${room?.id === r.id ? "border-cyan-500/60 text-cyan-300 bg-cyan-500/10" : "border-white/10 text-zinc-400 hover:border-white/30"}`}>
              {r.name} <span className="font-mono-stat opacity-60 text-[10px]">({r.online})</span>
            </button>
          ))}
          {isStaff && (
            <button onClick={() => { setSelectedTarget(null); setGmOpen(true); }} data-testid="gm-open-button"
              className="ml-2 px-3 py-1 rounded text-xs font-bold font-display border border-yellow-500/60 text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 flex items-center gap-1">
              <Crown className="w-3 h-3" /> Panneau du Gardien
            </button>
          )}
        </div>
      </div>

      {/* ===== GM GLOBAL ANNOUNCEMENT BANNER ===== */}
      <AnimatePresence>
        {globalAnnounce && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="mb-3 rounded-xl p-3 border border-yellow-500/40 bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 text-center"
            data-testid="gm-announce-banner">
            <div className="text-[10px] uppercase tracking-[0.3em] text-yellow-300 font-bold flex items-center justify-center gap-2">
              <Megaphone className="w-3 h-3" /> Décret du Conseil — {globalAnnounce.by_username}
            </div>
            <div className="text-sm text-yellow-100 mt-1 font-display">{globalAnnounce.text}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Phaser canvas */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-cyan-500/20 bg-[#030208] relative"
          style={{ height: "min(620px, 70vh)" }}
          data-testid="nexus-canvas-wrapper">
          <div ref={containerRef} className="w-full h-full" />
          {gmPickerMode && (
            <div className="absolute top-2 left-2 z-20 glass rounded-lg px-3 py-2 border border-yellow-500/40 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-yellow-300" />
              <span className="text-xs text-yellow-200">Mode ciblage — cliquez une case</span>
              <button onClick={() => { setPendingGmAction(null); setGmPickerMode(false); if (sceneRef.current) sceneRef.current.gmPickerMode = false; }}
                className="text-xs text-zinc-400 hover:text-white ml-2">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* ===== RIGHT PANEL ===== */}
        <aside className="flex flex-col gap-3" data-testid="nexus-side">
          <div className="glass rounded-xl p-3 flex-1 flex flex-col" style={{ minHeight: 420 }}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2">Chat local</div>
            <div className="flex-1 overflow-y-auto space-y-1 mb-2 text-xs pr-1" data-testid="nexus-chat-log" style={{ maxHeight: 320 }}>
              {chat.length === 0 && <div className="text-zinc-500 italic text-center py-6">Aucun message — entamez la conversation</div>}
              {chat.map((m, i) => (
                <div key={i} className="leading-tight">
                  <span className={`font-display font-bold ${m.role === "admin" ? "text-yellow-300" : m.role === "moderator" ? "text-orange-300" : "text-cyan-300"}`}>
                    {m.role === "admin" && "👑 "}{m.role === "moderator" && "🛡️ "}{m.username}
                  </span>
                  <span className="text-zinc-400 text-[10px]"> · niv {m.level}</span>
                  <div className="text-zinc-200">{m.text}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={send} className="flex gap-1">
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={280} placeholder="Parlez..."
                className="flex-1 bg-[#0A0A0E] border border-white/10 rounded px-2 py-1.5 text-xs" data-testid="nexus-chat-input" />
              <button type="submit" disabled={!text.trim()}
                className="px-2 py-1.5 rounded border border-cyan-500/40 text-cyan-300 disabled:opacity-40" data-testid="nexus-chat-send">
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>

          <div className="glass rounded-xl p-3" data-testid="nexus-players">
            <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-bold mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> Présents ({players.length})
            </div>
            <div className="space-y-1 max-h-44 overflow-y-auto text-xs">
              {players.map((p) => (
                <button key={p.sid}
                  onClick={() => { if (isStaff) { setSelectedTarget(p); setGmOpen(true); } }}
                  className={`w-full flex items-center gap-2 py-1 px-1 rounded text-left ${isStaff ? "hover:bg-white/5" : ""} ${p.invisible ? "opacity-50" : ""}`}
                  data-testid={`player-row-${p.user_id}`}>
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  <HeroName user={p} size="sm" />
                  <span className="text-[10px] text-zinc-500">· {p.class_name}</span>
                  {p.muted && <VolumeX className="w-3 h-3 text-red-400 ml-auto" />}
                  {p.frozen && <Snowflake className="w-3 h-3 text-cyan-300 ml-auto" />}
                  {p.invisible && <EyeOff className="w-3 h-3 text-purple-300 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ===================== GM PANEL OVERLAY ===================== */}
      <AnimatePresence>
        {gmOpen && isStaff && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setGmOpen(false)}
            data-testid="gm-panel">
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-[#1A0B3D] via-[#0A0613] to-[#1A0B3D] border border-yellow-500/40 rounded-2xl p-5 max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-300" />
                  <h2 className="font-display font-black text-xl text-yellow-300">Panneau du Gardien</h2>
                </div>
                <button onClick={() => setGmOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selected target details */}
              {selectedTarget ? (
                <div className="mb-4 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                  <div className="text-[10px] uppercase tracking-widest text-yellow-300 mb-2 font-bold">Cible sélectionnée</div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <HeroName user={selectedTarget} />
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {selectedTarget.class_name} · niv {selectedTarget.level} · ({selectedTarget.tx},{selectedTarget.ty})
                      </div>
                    </div>
                    <button onClick={() => setSelectedTarget(null)} className="text-xs text-zinc-500 hover:text-white">
                      Changer la cible
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                    <GmBtn icon={Footprints} label="Téléporter" color="cyan"
                      onClick={() => requestTilePickFor("teleport", selectedTarget)}
                      testid="gm-teleport" />
                    <GmBtn icon={selectedTarget.muted ? Volume2 : VolumeX}
                      label={selectedTarget.muted ? "Réactiver voix" : "Museler"} color="purple"
                      onClick={() => gmEmit("gm_mute", { target_user_id: selectedTarget.user_id, muted: !selectedTarget.muted },
                        selectedTarget.muted ? "Voix rendue" : "Muet")}
                      testid="gm-mute" />
                    <GmBtn icon={Snowflake}
                      label={selectedTarget.frozen ? "Libérer" : "Figer"} color="cyan"
                      onClick={() => gmEmit("gm_freeze", { target_user_id: selectedTarget.user_id, frozen: !selectedTarget.frozen },
                        selectedTarget.frozen ? "Libéré" : "Figé")}
                      testid="gm-freeze" />
                    <GmBtn icon={Footprints} label="Expulser" color="orange"
                      onClick={() => gmEmit("gm_kick", { target_user_id: selectedTarget.user_id, reason: "Sortie demandée par un Gardien" }, "Expulsion envoyée")}
                      testid="gm-kick" />
                    <GmBtn icon={Ban} label="Bannir..." color="red"
                      onClick={() => setBanOpen(true)} testid="gm-ban" />
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-3 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-400 italic">
                  Cliquez sur un héros (canvas ou liste) pour le cibler.
                </div>
              )}

              {/* Global controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Annonce */}
                <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                  <div className="text-[10px] uppercase tracking-widest text-cyan-300 mb-2 font-bold flex items-center gap-1">
                    <Megaphone className="w-3 h-3" /> Annonce globale
                  </div>
                  <form onSubmit={sendAnnounce} className="space-y-2">
                    <textarea value={announceText} onChange={(e) => setAnnounceText(e.target.value)}
                      maxLength={240} rows={2} placeholder="Diffusé à toutes les salles..."
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs"
                      data-testid="gm-announce-input" />
                    <button type="submit" disabled={!announceText.trim()}
                      className="w-full px-3 py-1.5 rounded border border-yellow-500/40 text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 text-xs font-bold disabled:opacity-40"
                      data-testid="gm-announce-submit">
                      Proclamer
                    </button>
                  </form>
                </div>

                {/* Météo */}
                <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                  <div className="text-[10px] uppercase tracking-widest text-cyan-300 mb-2 font-bold flex items-center gap-1">
                    <Cloud className="w-3 h-3" /> Météo de la salle
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {["clear", "rain", "storm", "eclipse", "aurora"].map((w) => {
                      const Ico = WEATHER_LABEL[w].icon;
                      return (
                        <button key={w} onClick={() => gmEmit("gm_weather", { weather: w }, `Météo : ${WEATHER_LABEL[w].fr}`)}
                          data-testid={`gm-weather-${w}`}
                          className={`flex flex-col items-center gap-0.5 p-2 rounded border text-[10px] ${weather === w ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300" : "border-white/10 text-zinc-400 hover:border-white/30"}`}>
                          <Ico className="w-3 h-3" /> {WEATHER_LABEL[w].fr}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Invocation relique */}
                <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                  <div className="text-[10px] uppercase tracking-widest text-cyan-300 mb-2 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Invoquer une relique
                  </div>
                  <input value={spawnForm.name} onChange={(e) => setSpawnForm((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Nom" maxLength={60}
                    className="w-full mb-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs"
                    data-testid="gm-spawn-name" />
                  <div className="grid grid-cols-2 gap-1 mb-2">
                    <select value={spawnForm.rarity} onChange={(e) => setSpawnForm((s) => ({ ...s, rarity: e.target.value }))}
                      className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs"
                      data-testid="gm-spawn-rarity">
                      {Object.keys(RARITY_HEX).map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <input value={spawnForm.icon} onChange={(e) => setSpawnForm((s) => ({ ...s, icon: e.target.value }))}
                      placeholder="✨" maxLength={2}
                      className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-center"
                      data-testid="gm-spawn-icon" />
                  </div>
                  <button onClick={() => requestTilePickFor("spawn")} data-testid="gm-spawn-place"
                    className="w-full px-3 py-1.5 rounded border border-purple-500/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 text-xs font-bold">
                    Placer sur une case
                  </button>
                </div>

                {/* Invisibilité */}
                <div className="p-3 rounded-lg border border-white/10 bg-white/5">
                  <div className="text-[10px] uppercase tracking-widest text-cyan-300 mb-2 font-bold flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Mode invisible
                  </div>
                  <div className="text-[11px] text-zinc-400 mb-2">
                    Vous disparaissez pour les héros standards. Les autres Gardiens vous voient toujours.
                  </div>
                  <button onClick={toggleInvisible} data-testid="gm-invisible-toggle"
                    className={`w-full px-3 py-1.5 rounded border text-xs font-bold ${gmInvisible ? "border-purple-500/60 bg-purple-500/20 text-purple-200" : "border-white/20 text-zinc-300 hover:border-white/40"}`}>
                    {gmInvisible ? <><EyeOff className="w-3 h-3 inline mr-1" /> Désactiver invisibilité</> : <><Eye className="w-3 h-3 inline mr-1" /> Devenir invisible</>}
                  </button>
                </div>
              </div>

              <div className="mt-4 text-center text-[10px] text-zinc-500 uppercase tracking-widest">
                <Shield className="w-3 h-3 inline mr-1" /> Toutes les actions sont consignées dans le Codex du Conseil
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== BAN MODAL ===================== */}
      <AnimatePresence>
        {banOpen && selectedTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setBanOpen(false)}
            data-testid="gm-ban-modal">
            <motion.form
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onSubmit={submitBan} onClick={(e) => e.stopPropagation()}
              className="bg-[#0A0613] border border-red-500/40 rounded-2xl p-5 max-w-md w-full">
              <div className="flex items-center gap-2 mb-3">
                <Ban className="w-5 h-5 text-red-400" />
                <h3 className="font-display font-bold text-lg text-red-300">Bannir {selectedTarget.username}</h3>
              </div>
              <label className="block text-xs text-zinc-400 mb-1">Durée (heures)</label>
              <select value={banHours} onChange={(e) => setBanHours(e.target.value)}
                className="w-full mb-3 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm"
                data-testid="gm-ban-duration">
                <option value="1">1 heure</option>
                <option value="24">1 jour</option>
                <option value="168">1 semaine</option>
                <option value="720">1 mois</option>
                <option value="8760">1 an</option>
              </select>
              <label className="block text-xs text-zinc-400 mb-1">Raison</label>
              <textarea value={banReason} onChange={(e) => setBanReason(e.target.value)}
                rows={3} maxLength={200} placeholder="Raison du bannissement..."
                className="w-full mb-3 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm"
                data-testid="gm-ban-reason" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setBanOpen(false)}
                  className="flex-1 px-3 py-2 rounded border border-white/10 text-zinc-300 text-sm">
                  Annuler
                </button>
                <button type="submit" data-testid="gm-ban-submit"
                  className="flex-1 px-3 py-2 rounded border border-red-500/60 bg-red-500/20 text-red-200 text-sm font-bold">
                  Confirmer le bannissement
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GmBtn({ icon: Icon, label, color = "cyan", onClick, testid }) {
  const colorMap = {
    cyan: "border-cyan-500/40 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20",
    purple: "border-purple-500/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20",
    orange: "border-orange-500/40 text-orange-300 bg-orange-500/10 hover:bg-orange-500/20",
    red: "border-red-500/40 text-red-300 bg-red-500/10 hover:bg-red-500/20",
    yellow: "border-yellow-500/40 text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20",
  };
  return (
    <button onClick={onClick} data-testid={testid}
      className={`flex items-center justify-center gap-1 px-3 py-2 rounded border text-xs font-bold ${colorMap[color]}`}>
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
}
