"""Nexus Online — server-side walkability (mirrors frontend roomCollisions.js).

Keep blockedTileZones in sync with:
  frontend/src/nexusOnline/rooms/roomCollisions.js
"""

from __future__ import annotations

# (tx, ty, tw, th) — tile rectangles
_BLOCKED: dict[str, list[tuple[int, int, int, int]]] = {
    "place_centrale": [
        (0, 0, 26, 1), (0, 25, 26, 1), (0, 0, 1, 26), (25, 0, 1, 26),
        (12, 12, 3, 3), (3, 3, 3, 3), (20, 20, 3, 3),
        (5, 12, 3, 3), (18, 12, 3, 3),
    ],
    "quartier_guildes": [
        (0, 0, 24, 1), (0, 21, 24, 1), (0, 0, 1, 22), (23, 0, 1, 22),
        (2, 3, 20, 4), (2, 15, 20, 4), (10, 9, 5, 4),
    ],
    "arene": [
        (0, 0, 30, 1), (0, 29, 30, 1), (0, 0, 1, 30), (29, 0, 1, 30),
        (13, 3, 5, 4), (13, 23, 5, 4), (2, 12, 4, 8), (24, 12, 4, 8),
    ],
    "salle_conseil": [
        (0, 0, 18, 1), (0, 13, 18, 1), (0, 0, 1, 14), (17, 0, 1, 14),
        (7, 1, 5, 4), (6, 5, 7, 4),
    ],
    "salon_vip": [
        (0, 0, 20, 1), (0, 15, 20, 1), (0, 0, 1, 16), (19, 0, 1, 16),
        (8, 2, 5, 4), (8, 8, 5, 4), (3, 6, 3, 5), (14, 6, 3, 5),
    ],
}

_cache: dict[str, set[str]] = {}


def _blocked_set(room_id: str) -> set[str]:
    if room_id in _cache:
        return _cache[room_id]
    zones = _BLOCKED.get(room_id, [])
    out: set[str] = set()
    for tx, ty, tw, th in zones:
        for dy in range(th):
            for dx in range(tw):
                out.add(f"{tx + dx},{ty + dy}")
    _cache[room_id] = out
    return out


def is_within_bounds(tx: int, ty: int, tiles_x: int, tiles_y: int) -> bool:
    return 0 <= tx < tiles_x and 0 <= ty < tiles_y


def is_tile_blocked(room_id: str, tx: int, ty: int, tiles_x: int, tiles_y: int) -> bool:
    if not is_within_bounds(tx, ty, tiles_x, tiles_y):
        return True
    return f"{tx},{ty}" in _blocked_set(room_id)


def is_tile_walkable(room_id: str, tx: int, ty: int, tiles_x: int, tiles_y: int) -> bool:
    return not is_tile_blocked(room_id, tx, ty, tiles_x, tiles_y)


def is_movement_allowed(
    room_id: str,
    from_tx: int,
    from_ty: int,
    to_tx: int,
    to_ty: int,
    tiles_x: int,
    tiles_y: int,
) -> bool:
    if not is_tile_walkable(room_id, to_tx, to_ty, tiles_x, tiles_y):
        return False
    if from_tx == to_tx and from_ty == to_ty:
        return True
    cx, cy = from_tx, from_ty
    while cx != to_tx or cy != to_ty:
        dx = 0 if cx == to_tx else (1 if to_tx > cx else -1)
        dy = 0 if cy == to_ty else (1 if to_ty > cy else -1)
        nx, ny = cx + dx, cy + dy
        if not is_tile_walkable(room_id, nx, ny, tiles_x, tiles_y):
            return False
        if dx and dy:
            if not is_tile_walkable(room_id, cx + dx, cy, tiles_x, tiles_y):
                return False
            if not is_tile_walkable(room_id, cx, cy + dy, tiles_x, tiles_y):
                return False
        cx, cy = nx, ny
    return True


_NEIGHBORS_8 = (
    (1, 0), (-1, 0), (0, 1), (0, -1),
    (1, 1), (1, -1), (-1, 1), (-1, -1),
)


def find_nearest_walkable_tile(
    room_id: str, tx: int, ty: int, tiles_x: int, tiles_y: int,
) -> tuple[int, int]:
    if is_tile_walkable(room_id, tx, ty, tiles_x, tiles_y):
        return tx, ty
    queue: list[tuple[int, int]] = [(tx, ty)]
    visited: set[str] = {f"{tx},{ty}"}
    while queue:
        cx, cy = queue.pop(0)
        for dx, dy in _NEIGHBORS_8:
            nx, ny = cx + dx, cy + dy
            if not is_within_bounds(nx, ny, tiles_x, tiles_y):
                continue
            nk = f"{nx},{ny}"
            if nk in visited:
                continue
            visited.add(nk)
            if is_tile_walkable(room_id, nx, ny, tiles_x, tiles_y):
                return nx, ny
            queue.append((nx, ny))
    for ty2 in range(1, tiles_y - 1):
        for tx2 in range(1, tiles_x - 1):
            if is_tile_walkable(room_id, tx2, ty2, tiles_x, tiles_y):
                return tx2, ty2
    return tx, ty


def snap_to_walkable_tile(
    room_id: str, tx: int, ty: int, tiles_x: int, tiles_y: int,
) -> tuple[int, int]:
    return find_nearest_walkable_tile(room_id, tx, ty, tiles_x, tiles_y)
