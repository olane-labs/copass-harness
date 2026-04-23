"""AgentScope construction invariants."""

from __future__ import annotations

import pytest

from copass_core_agents import AgentScope


def test_requires_non_empty_user_id() -> None:
    with pytest.raises(ValueError, match="user_id is required"):
        AgentScope(user_id="")


def test_requires_non_whitespace_user_id() -> None:
    with pytest.raises(ValueError, match="user_id is required"):
        AgentScope(user_id="   ")


def test_frozen() -> None:
    scope = AgentScope(user_id="u-1")
    with pytest.raises(Exception):
        scope.user_id = "u-2"  # type: ignore[misc]


def test_optional_fields_default_none() -> None:
    scope = AgentScope(user_id="u-1")
    assert scope.sandbox_id is None
    assert scope.project_id is None


def test_all_fields() -> None:
    scope = AgentScope(user_id="u-1", sandbox_id="sb-1", project_id="p-1")
    assert scope.user_id == "u-1"
    assert scope.sandbox_id == "sb-1"
    assert scope.project_id == "p-1"
