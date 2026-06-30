"""Tests verrou leader Gateway Discord."""
import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import discord_gateway


def test_leader_lock_renew_when_owner_matches():
    collection = AsyncMock()
    collection.find_one_and_update = AsyncMock(
        return_value={"_id": "discord_gateway", "owner": discord_gateway._owner_id},
    )
    collection.insert_one = AsyncMock()
    discord_gateway.init(MagicMock(discord_gateway_lock=collection))

    assert asyncio.run(discord_gateway._try_acquire_or_renew_leader()) is True


def test_leader_lock_denied_when_other_owner():
    collection = AsyncMock()
    collection.find_one_and_update = AsyncMock(
        return_value={"_id": "discord_gateway", "owner": "other-host:999"},
    )
    from pymongo.errors import DuplicateKeyError

    collection.insert_one = AsyncMock(side_effect=DuplicateKeyError("dup"))
    collection.find_one = AsyncMock(
        return_value={"_id": "discord_gateway", "owner": "other-host:999"},
    )
    discord_gateway.init(MagicMock(discord_gateway_lock=collection))

    assert asyncio.run(discord_gateway._try_acquire_or_renew_leader()) is False
