"""AgentToolRegistry + AgentTool contract."""

from __future__ import annotations

import pytest

from copass_core_agents import AgentTool, AgentToolRegistry, ToolSpec


class _DummyTool(AgentTool):
    def __init__(self, name: str) -> None:
        self._name = name

    @property
    def spec(self) -> ToolSpec:
        return ToolSpec(
            name=self._name,
            description=f"dummy tool {self._name}",
            input_schema={"type": "object"},
        )

    async def invoke(self, arguments, *, context=None):
        return {"tool": self._name, "args": arguments}


def test_add_and_get() -> None:
    reg = AgentToolRegistry()
    t = _DummyTool("alpha")
    reg.add(t)
    assert reg.get("alpha") is t
    assert "alpha" in reg


def test_get_missing_raises_with_available() -> None:
    reg = AgentToolRegistry()
    reg.add(_DummyTool("alpha"))
    with pytest.raises(KeyError, match="Available: alpha"):
        reg.get("missing")


def test_try_get_returns_none_for_missing() -> None:
    reg = AgentToolRegistry()
    assert reg.try_get("missing") is None


def test_list_specs_sorted() -> None:
    reg = AgentToolRegistry()
    reg.add(_DummyTool("zulu"))
    reg.add(_DummyTool("alpha"))
    reg.add(_DummyTool("mike"))
    names = [s.name for s in reg.list_specs()]
    assert names == ["alpha", "mike", "zulu"]


def test_extend() -> None:
    reg = AgentToolRegistry()
    reg.extend([_DummyTool("a"), _DummyTool("b"), _DummyTool("c")])
    assert len(reg) == 3


def test_iteration_is_sorted() -> None:
    reg = AgentToolRegistry()
    reg.extend([_DummyTool("c"), _DummyTool("a"), _DummyTool("b")])
    names = [t.spec.name for t in reg]
    assert names == ["a", "b", "c"]


async def test_invoke_returns_dict() -> None:
    tool = _DummyTool("echo")
    result = await tool.invoke({"text": "hi"})
    assert result == {"tool": "echo", "args": {"text": "hi"}}
