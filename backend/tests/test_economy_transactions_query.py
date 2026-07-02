"""Unit tests for economy transaction queries."""
import pytest
from unittest.mock import AsyncMock, MagicMock

from economy_transactions import query_transactions, _username_filter_clause


class TestUsernameFilterClause:
    def test_empty_returns_none(self):
        assert _username_filter_clause("") is None
        assert _username_filter_clause("   ") is None

    def test_escapes_regex(self):
        clause = _username_filter_clause("test.user")
        assert clause == {"username": {"$regex": "test\\.user", "$options": "i"}}


@pytest.mark.anyio
async def test_query_transactions_applies_username_filter():
    db = MagicMock()

    async def fake_to_list(_limit):
        return [{"user_id": "u_hero1", "username": "HeroOne"}]

    users_cursor = MagicMock()
    users_cursor.limit.return_value.to_list = fake_to_list
    db.users.find.return_value = users_cursor

    db.economy_transactions.count_documents = AsyncMock(return_value=2)
    tx_cursor = MagicMock()
    tx_cursor.sort.return_value.skip.return_value.limit.return_value.to_list = AsyncMock(
        return_value=[{"username": "HeroOne", "user_id": "u_hero1"}]
    )
    db.economy_transactions.find.return_value = tx_cursor

    result = await query_transactions(db, username="Hero")

    assert result["total"] == 2
    filt = db.economy_transactions.count_documents.await_args.args[0]
    assert "$or" in filt
    assert {"user_id": {"$in": ["u_hero1"]}} in filt["$or"]


@pytest.mark.anyio
async def test_query_transactions_applies_tx_type():
    db = MagicMock()
    db.users.find = MagicMock()
    db.economy_transactions.count_documents = AsyncMock(return_value=0)
    tx_cursor = MagicMock()
    tx_cursor.sort.return_value.skip.return_value.limit.return_value.to_list = AsyncMock(return_value=[])
    db.economy_transactions.find.return_value = tx_cursor

    await query_transactions(db, tx_type="gain")

    filt = db.economy_transactions.count_documents.await_args.args[0]
    assert filt.get("type") == "gain"
