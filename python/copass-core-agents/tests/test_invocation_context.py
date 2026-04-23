"""AgentInvocationContext — scope delegation + handle lookup."""

from __future__ import annotations

import pytest

from copass_core_agents import AgentInvocationContext, AgentScope


def test_user_id_property_delegates_to_scope() -> None:
    ctx = AgentInvocationContext(scope=AgentScope(user_id="u-1"))
    assert ctx.user_id == "u-1"


def test_get_handle_returns_value() -> None:
    ctx = AgentInvocationContext(
        scope=AgentScope(user_id="u-1"),
        handles={"db_pool": "POOL", "session": "S"},
    )
    assert ctx.get_handle("db_pool") == "POOL"


def test_get_handle_missing_lists_available() -> None:
    ctx = AgentInvocationContext(
        scope=AgentScope(user_id="u-1"),
        handles={"alpha": 1, "beta": 2},
    )
    with pytest.raises(KeyError, match="Available: alpha, beta"):
        ctx.get_handle("missing")


def test_get_handle_missing_with_empty_handles_reports_none() -> None:
    ctx = AgentInvocationContext(scope=AgentScope(user_id="u-1"))
    with pytest.raises(KeyError, match=r"Available: \(none\)"):
        ctx.get_handle("anything")
