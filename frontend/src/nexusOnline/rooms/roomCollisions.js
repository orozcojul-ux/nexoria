/**
 * Nexus Online — per-room collision zones (tile grid + optional pixel rects).
 *
 * Adjust blocked areas by editing blockedTileZones: { tx, ty, tw, th } in tile units.
 * Room ids match backend nexus_rooms.py (underscores, e.g. place_centrale).
 */
import { TILE_W, TILE_H } from "@/lib/NexusPixelArt";

function tileToScreen(tx, ty, originX, originY) {
  return {
    x: originX + (tx - ty) * (TILE_W / 2),
    y: originY + (tx + ty) * (TILE_H / 2),
  };
}

export const DEBUG_COLLISIONS = process.env.NODE_ENV === "development";

/** @typedef {{ id?: string, tx: number, ty: number, tw: number, th: number }} BlockedTileZone */
/** @typedef {{ id?: string, x: number, y: number, width: number, height: number }} BlockedPixelZone */

const BORDER = (tw, th) => [
  { id: "mur-nord", tx: 0, ty: 0, tw, th: 1 },
  { id: "mur-sud", tx: 0, ty: th - 1, tw, th: 1 },
  { id: "mur-ouest", tx: 0, ty: 0, tw: 1, th },
  { id: "mur-est", tx: tw - 1, ty: 0, tw: 1, th },
];

export const ROOM_COLLISIONS = {
  place_centrale: {
    // Collisions defined in Tiled → place-centrale.json (object layer "Collisions")
    blockedTileZones: [],
    blockedZones: [],
  },

  quartier_guildes: {
    blockedTileZones: [
      ...BORDER(24, 22),
      { id: "batiments-nord", tx: 2, ty: 3, tw: 20, th: 4 },
      { id: "batiments-sud", tx: 2, ty: 15, tw: 20, th: 4 },
      { id: "tableau", tx: 10, ty: 9, tw: 5, th: 4 },
    ],
  },

  arene: {
    blockedTileZones: [
      ...BORDER(30, 30),
      { id: "portail-nord", tx: 13, ty: 3, tw: 5, th: 4 },
      { id: "portail-sud", tx: 13, ty: 23, tw: 5, th: 4 },
      { id: "tribunes-ouest", tx: 2, ty: 12, tw: 4, th: 8 },
      { id: "tribunes-est", tx: 24, ty: 12, tw: 4, th: 8 },
    ],
  },

  salle_conseil: {
    blockedTileZones: [
      ...BORDER(18, 14),
      { id: "trone", tx: 7, ty: 1, tw: 5, th: 4 },
      { id: "table-conseil", tx: 6, ty: 5, tw: 7, th: 4 },
    ],
  },

  salon_vip: {
    blockedTileZones: [
      ...BORDER(20, 16),
      { id: "trone-vip", tx: 8, ty: 2, tw: 5, th: 4 },
      { id: "fontaine-vip", tx: 8, ty: 8, tw: 5, th: 4 },
      { id: "cristaux", tx: 3, ty: 6, tw: 3, th: 5 },
      { id: "cristaux-est", tx: 14, ty: 6, tw: 3, th: 5 },
    ],
  },
};

const blockedCache = new Map();

/** Optional Tiled walkability override (set by NexusIsoScene for place_centrale). */
let tiledWalkabilityChecker = null;

export function setTiledWalkabilityChecker(fn) {
  tiledWalkabilityChecker = typeof fn === "function" ? fn : null;
}

export function clearTiledWalkabilityChecker() {
  tiledWalkabilityChecker = null;
}

function getConfig(roomId) {
  return ROOM_COLLISIONS[roomId] || { blockedTileZones: [], blockedZones: [] };
}

function tileInRect(tx, ty, zone) {
  return tx >= zone.tx && tx < zone.tx + zone.tw
    && ty >= zone.ty && ty < zone.ty + zone.th;
}

function buildBlockedTileSet(roomId) {
  if (blockedCache.has(roomId)) return blockedCache.get(roomId);
  const cfg = getConfig(roomId);
  const set = new Set();
  for (const z of cfg.blockedTileZones || []) {
    for (let dy = 0; dy < z.th; dy++) {
      for (let dx = 0; dx < z.tw; dx++) {
        set.add(`${z.tx + dx},${z.ty + dy}`);
      }
    }
  }
  blockedCache.set(roomId, set);
  return set;
}

export function clearCollisionCache() {
  blockedCache.clear();
}

export function isWithinRoomBounds(roomId, tx, ty, tilesX, tilesY) {
  return tx >= 0 && ty >= 0 && tx < tilesX && ty < tilesY;
}

export function isTileBlocked(roomId, tx, ty, tilesX, tilesY) {
  if (!isWithinRoomBounds(roomId, tx, ty, tilesX, tilesY)) return true;
  return buildBlockedTileSet(roomId).has(`${tx},${ty}`);
}

export function isTileWalkable(roomId, tx, ty, tilesX, tilesY) {
  if (tiledWalkabilityChecker && roomId === "place_centrale") {
    return tiledWalkabilityChecker(tx, ty);
  }
  return !isTileBlocked(roomId, tx, ty, tilesX, tilesY);
}

/** Pixel-space AABB check (optional zones + converts to tile center). */
export function isPointBlocked(roomId, x, y, tilesX, tilesY, screenToTile) {
  const cfg = getConfig(roomId);
  for (const z of cfg.blockedZones || []) {
    if (x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height) {
      return true;
    }
  }
  if (typeof screenToTile === "function") {
    const { tx, ty } = screenToTile(x, y);
    return isTileBlocked(roomId, tx, ty, tilesX, tilesY);
  }
  return false;
}

export function isMovementAllowed(roomId, fromTx, fromTy, toTx, toTy, tilesX, tilesY) {
  if (!isTileWalkable(roomId, toTx, toTy, tilesX, tilesY)) return false;
  if (fromTx === toTx && fromTy === toTy) return true;
  let cx = fromTx;
  let cy = fromTy;
  while (cx !== toTx || cy !== toTy) {
    const dx = cx === toTx ? 0 : (toTx > cx ? 1 : -1);
    const dy = cy === toTy ? 0 : (toTy > cy ? 1 : -1);
    const nx = cx + dx;
    const ny = cy + dy;
    if (!isTileWalkable(roomId, nx, ny, tilesX, tilesY)) return false;
    if (dx !== 0 && dy !== 0) {
      if (!isTileWalkable(roomId, cx + dx, cy, tilesX, tilesY)) return false;
      if (!isTileWalkable(roomId, cx, cy + dy, tilesX, tilesY)) return false;
    }
    cx = nx;
    cy = ny;
  }
  return true;
}

const NEIGHBORS_8 = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/** BFS outward from (tx, ty) to the nearest walkable tile. */
export function findNearestWalkableTile(roomId, tx, ty, tilesX, tilesY) {
  if (isTileWalkable(roomId, tx, ty, tilesX, tilesY)) {
    return { tx, ty };
  }
  const key = (x, y) => `${x},${y}`;
  const queue = [[tx, ty]];
  const visited = new Set([key(tx, ty)]);

  while (queue.length) {
    const [cx, cy] = queue.shift();
    for (const [dx, dy] of NEIGHBORS_8) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!isWithinRoomBounds(roomId, nx, ny, tilesX, tilesY)) continue;
      const nk = key(nx, ny);
      if (visited.has(nk)) continue;
      visited.add(nk);
      if (isTileWalkable(roomId, nx, ny, tilesX, tilesY)) {
        return { tx: nx, ty: ny };
      }
      queue.push([nx, ny]);
    }
  }

  for (let ty2 = 1; ty2 < tilesY - 1; ty2++) {
    for (let tx2 = 1; tx2 < tilesX - 1; tx2++) {
      if (isTileWalkable(roomId, tx2, ty2, tilesX, tilesY)) {
        return { tx: tx2, ty: ty2 };
      }
    }
  }
  return { tx, ty };
}

export function snapToWalkableTile(roomId, tx, ty, tilesX, tilesY) {
  return findNearestWalkableTile(roomId, tx, ty, tilesX, tilesY);
}

/** BFS path over walkable tiles (8-direction, avoids walls). */
export function findWalkPath(roomId, startTx, startTy, endTx, endTy, tilesX, tilesY) {
  if (startTx === endTx && startTy === endTy) return [];
  if (!isTileWalkable(roomId, endTx, endTy, tilesX, tilesY)) return null;

  const key = (x, y) => `${x},${y}`;
  const startKey = key(startTx, startTy);
  const endKey = key(endTx, endTy);
  const queue = [[startTx, startTy]];
  const cameFrom = new Map([[startKey, null]]);
  const maxNodes = tilesX * tilesY;

  while (queue.length && cameFrom.size < maxNodes) {
    const [cx, cy] = queue.shift();
    if (key(cx, cy) === endKey) break;

    for (const [dx, dy] of NEIGHBORS_8) {
      const nx = cx + dx;
      const ny = cy + dy;
      const nk = key(nx, ny);
      if (cameFrom.has(nk)) continue;
      if (!isTileWalkable(roomId, nx, ny, tilesX, tilesY)) continue;
      if (dx !== 0 && dy !== 0) {
        if (!isTileWalkable(roomId, cx + dx, cy, tilesX, tilesY)
          || !isTileWalkable(roomId, cx, cy + dy, tilesX, tilesY)) {
          continue;
        }
      }
      cameFrom.set(nk, [cx, cy]);
      queue.push([nx, ny]);
    }
  }

  if (!cameFrom.has(endKey)) return null;

  const path = [];
  let cur = [endTx, endTy];
  while (cur[0] !== startTx || cur[1] !== startTy) {
    path.unshift({ tx: cur[0], ty: cur[1] });
    const prev = cameFrom.get(key(cur[0], cur[1]));
    if (!prev) break;
    cur = prev;
  }
  return path;
}

/** Debug overlay: draw blocked tile diamonds in scene space. */
export function drawCollisionDebug(scene, roomId, originX, originY, tilesX, tilesY, visible) {
  if (!scene.collisionDebugLayer) {
    scene.collisionDebugLayer = scene.add.container(0, 0);
    scene.collisionDebugLayer.setDepth(9000);
  }
  scene.collisionDebugLayer.removeAll(true);

  if (!visible) return;

  const cfg = getConfig(roomId);
  const g = scene.add.graphics();
  g.fillStyle(0xff0000, 0.25);
  g.lineStyle(1, 0xff4444, 0.6);

  for (const z of cfg.blockedTileZones || []) {
    for (let dy = 0; dy < z.th; dy++) {
      for (let dx = 0; dx < z.tw; dx++) {
        const tx = z.tx + dx;
        const ty = z.ty + dy;
        if (!isWithinRoomBounds(roomId, tx, ty, tilesX, tilesY)) continue;
        const { x, y } = tileToScreen(tx, ty, originX, originY);
        const cx = x + TILE_W / 2;
        const cy = y + TILE_H / 2;
        g.fillPoints([
          { x: cx, y: cy - TILE_H / 2 },
          { x: cx + TILE_W / 2, y: cy },
          { x: cx, y: cy + TILE_H / 2 },
          { x: cx - TILE_W / 2, y: cy },
        ], true);
        g.strokePoints([
          { x: cx, y: cy - TILE_H / 2 },
          { x: cx + TILE_W / 2, y: cy },
          { x: cx, y: cy + TILE_H / 2 },
          { x: cx - TILE_W / 2, y: cy },
        ], true);
      }
    }
  }

  for (const z of cfg.blockedZones || []) {
    g.fillStyle(0xff0000, 0.2);
    g.fillRect(z.x, z.y, z.width, z.height);
    g.strokeRect(z.x, z.y, z.width, z.height);
  }

  scene.collisionDebugLayer.add(g);
}
