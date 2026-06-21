"""Unit tests for Nexus Online tile collisions."""
from backend.nexus_collisions import (
    is_tile_walkable,
    is_movement_allowed,
    snap_to_walkable_tile,
)


class TestNexusCollisions:
    def test_place_centrale_border_blocked(self):
        assert is_tile_walkable("place_centrale", 0, 0, 26, 26) is False
        assert is_tile_walkable("place_centrale", 13, 13, 26, 26) is False

    def test_place_centrale_walkable_near_spawn(self):
        assert is_tile_walkable("place_centrale", 13, 10, 26, 26) is True

    def test_movement_through_wall_rejected(self):
        ok = is_movement_allowed("place_centrale", 10, 10, 0, 10, 26, 26)
        assert ok is False

    def test_movement_from_blocked_origin_allowed(self):
        ok = is_movement_allowed("place_centrale", 13, 10, 14, 10, 26, 26)
        assert ok is True

    def test_snap_blocked_spawn(self):
        tx, ty = snap_to_walkable_tile("place_centrale", 13, 13, 26, 26)
        assert is_tile_walkable("place_centrale", tx, ty, 26, 26)

    def test_unknown_room_walkable(self):
        assert is_tile_walkable("unknown_room", 5, 5, 20, 20) is True
