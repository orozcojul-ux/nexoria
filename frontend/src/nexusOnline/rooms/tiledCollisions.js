/**
 * Nexus Online — Tiled object-layer collisions (Place centrale + future rooms).
 *
 * Edit collisions in Tiled → export place-centrale.json → reload game.
 * TODO(backend): mirror collision rects server-side for anti-cheat validation.
 */

export const DEBUG_COLLISIONS = process.env.NODE_ENV === "development";
// Toggle manually for collision overlay: export const DEBUG_COLLISIONS = true;

export const PLAYER_COLLIDER_RADIUS = 14;

/** @typedef {{ key: string, url: string, collisionLayer: string, spawnLayers: string[], spawnObjectName: string, mapWidth: number, mapHeight: number, minObjectSize: number }} TiledRoomMapConfig */

export const TILED_ROOM_MAPS = {
  place_centrale: {
    key: "place_centrale_map",
    url: "/assets/nexus-online/rooms/place-centrale.json",
    collisionLayer: "Collisions",
    spawnLayers: ["Spawns", "player_spawn"],
    spawnObjectName: "player_spawn",
    mapWidth: 1350,
    mapHeight: 900,
    minObjectSize: 4,
  },
};

export function usesTiledCollisions(roomId) {
  return Object.prototype.hasOwnProperty.call(TILED_ROOM_MAPS, roomId);
}

export function getTiledRoomMapConfig(roomId) {
  return TILED_ROOM_MAPS[roomId] || null;
}

export function preloadTiledRoomMap(scene, roomId) {
  const cfg = getTiledRoomMapConfig(roomId);
  if (!cfg || scene.cache?.tilemap?.exists(cfg.key)) return;
  scene.load.tilemapTiledJSON(cfg.key, cfg.url);
}

export function makeTilemapFromRoomAssets(scene, cfg) {
  if (!cfg || !scene.cache?.tilemap?.exists(cfg.key)) return null;
  return scene.make.tilemap({ key: cfg.key });
}

export function computeMapToWorldTransform(roomBgImage, mapWidth, mapHeight) {
  if (!roomBgImage) return null;
  const scale = roomBgImage.scaleX;
  const left = roomBgImage.x - (mapWidth * scale) / 2;
  const top = roomBgImage.y - (mapHeight * scale) / 2;
  return { scale, left, top, mapWidth, mapHeight };
}

export function tiledRectToWorld(transform, obj) {
  const w = Math.max(obj.width || 0, 0);
  const h = Math.max(obj.height || 0, 0);
  const { scale, left, top } = transform;
  return {
    x: left + obj.x * scale,
    y: top + obj.y * scale,
    width: w * scale,
    height: h * scale,
    id: obj.id,
    name: obj.name,
  };
}

export function parseTiledCollisionObjects(map, layerName, transform, minSize = 4) {
  const layer = map.getObjectLayer(layerName);
  if (!layer?.objects) return [];
  return layer.objects
    .filter((obj) => (obj.width || 0) >= minSize && (obj.height || 0) >= minSize)
    .map((obj) => tiledRectToWorld(transform, obj));
}

export function findTiledSpawn(map, spawnLayers, objectName) {
  for (const layerName of spawnLayers) {
    const layer = map.getObjectLayer(layerName);
    if (!layer?.objects?.length) continue;
    const obj = layer.objects.find((o) => o.name === objectName) || layer.objects[0];
    if (obj) {
      return { x: obj.x, y: obj.y, layer: layerName, name: obj.name || objectName };
    }
  }
  return null;
}

export function spawnTiledToWorld(transform, spawn) {
  if (!transform || !spawn) return null;
  const { scale, left, top } = transform;
  return { x: left + spawn.x * scale, y: top + spawn.y * scale };
}

export function isPointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

/** @param {Array<{x:number,y:number,width:number,height:number}>} rects */
export function isPointBlocked(x, y, rects) {
  if (!rects?.length) return false;
  return rects.some((r) => isPointInRect(x, y, r));
}

/** Circle vs AABB — used for player feet collision. */
export function isCircleBlocked(x, y, radius, rects) {
  if (!rects?.length) return false;
  return rects.some((r) => {
    const closestX = Math.max(r.x, Math.min(x, r.x + r.width));
    const closestY = Math.max(r.y, Math.min(y, r.y + r.height));
    const dx = x - closestX;
    const dy = y - closestY;
    return dx * dx + dy * dy < radius * radius;
  });
}
