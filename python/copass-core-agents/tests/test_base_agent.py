"""BaseAgent construction + build_tools merge policies."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from copass_core_agents import (
    AgentBackend,
    AgentInvocationContext,
    AgentScope,
    AgentTool,
    AgentToolRegistry,
    AgentToolResolver,
    BaseAgent,
    ToolConflictError,
    ToolSpec,
)


class _DummyBackend(AgentBackend):
    async def run(self, agent, messages, context):  # pragma: no cover - unused here
        raise NotImplementedError

    def stream(self, agent, messages, context):  # pragma: no cover - unused here
        raise NotImplementedError


class _DummyTool(AgentTool):
    def __init__(self, name: str, marker: str = "static") -> None:
        self._name = name
        self.marker = marker

    @property
    def spec(self) -> ToolSpec:
        return ToolSpec(
            name=self._name,
            description=self._name,
            input_schema={"type": "object"},
        )

    async def invoke(self, arguments, *, context=None):
        return {"marker": self.marker}


class _StaticResolver(AgentToolResolver):
    def __init__(self, tools: list[AgentTool]) -> None:
        self._tools = tools

    async def resolve(self, context):
        return list(self._tools)


@pytest.fixture
def backend() -> AgentBackend:
    return _DummyBackend()


@pytest.fixture
def context() -> AgentInvocationContext:
    return AgentInvocationContext(scope=AgentScope(user_id="u-1"))


def test_requires_tools_or_resolver(backend) -> None:
    with pytest.raises(ValueError, match="at least one of"):
        BaseAgent(
            identity="x",
            model="m",
            system_prompt="p",
            backend=backend,
        )


def test_rejects_unknown_conflict_policy(backend) -> None:
    reg = AgentToolRegistry()
    reg.add(_DummyTool("t"))
    with pytest.raises(ValueError, match="invalid on_conflict policy"):
        BaseAgent(
            identity="x",
            model="m",
            system_prompt="p",
            backend=backend,
            tools=reg,
            on_conflict="wrong",  # type: ignore[arg-type]
        )


async def test_build_tools_pass_through_without_resolver(backend, context) -> None:
    reg = AgentToolRegistry()
    reg.add(_DummyTool("only"))
    agent = BaseAgent(
        identity="x",
        model="m",
        system_prompt="p",
        backend=backend,
        tools=reg,
    )
    result = await agent.build_tools(context)
    assert result is reg


async def test_build_tools_dynamic_wins_on_collision(backend, context) -> None:
    static = AgentToolRegistry()
    static.add(_DummyTool("shared", marker="static"))
    static.add(_DummyTool("static_only", marker="static"))
    resolver = _StaticResolver(
        [_DummyTool("shared", marker="dynamic"), _DummyTool("dynamic_only", marker="dynamic")]
    )
    agent = BaseAgent(
        identity="x",
        model="m",
        system_prompt="p",
        backend=backend,
        tools=static,
        tool_resolver=resolver,
    )
    merged = await agent.build_tools(context)
    names = [s.name for s in merged.list_specs()]
    assert names == ["dynamic_only", "shared", "static_only"]
    assert merged.get("shared").marker == "dynamic"
    assert merged.get("static_only").marker == "static"


async def test_build_tools_static_wins_on_collision(backend, context) -> None:
    static = AgentToolRegistry()
    static.add(_DummyTool("shared", marker="static"))
    resolver = _StaticResolver([_DummyTool("shared", marker="dynamic")])
    agent = BaseAgent(
        identity="x",
        model="m",
        system_prompt="p",
        backend=backend,
        tools=static,
        tool_resolver=resolver,
        on_conflict="static_wins",
    )
    merged = await agent.build_tools(context)
    assert merged.get("shared").marker == "static"


async def test_build_tools_error_policy_raises(backend, context) -> None:
    static = AgentToolRegistry()
    static.add(_DummyTool("shared"))
    resolver = _StaticResolver([_DummyTool("shared")])
    agent = BaseAgent(
        identity="x",
        model="m",
        system_prompt="p",
        backend=backend,
        tools=static,
        tool_resolver=resolver,
        on_conflict="error",
    )
    with pytest.raises(ToolConflictError, match="shared"):
        await agent.build_tools(context)


async def test_run_delegates_to_backend(context) -> None:
    backend = _DummyBackend()
    backend.run = AsyncMock(return_value="ran")  # type: ignore[method-assign]
    reg = AgentToolRegistry()
    reg.add(_DummyTool("t"))
    agent = BaseAgent(
        identity="x",
        model="m",
        system_prompt="p",
        backend=backend,
        tools=reg,
    )
    out = await agent.run([{"role": "user", "content": "hi"}], context=context)
    assert out == "ran"
    backend.run.assert_awaited_once()
