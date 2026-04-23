"""BaseAgent — ABC for an identity-bound, tool-equipped agent.

An agent is the composition of:

- an **identity** (stable string used in logs, prompts, and registry
  lookups)
- a **model** (provider/SDK-specific model name — the backend
  validates it)
- a **system prompt** (role + instructions fed on every turn)
- an **AgentToolRegistry** holding the *static* tools
- an optional **AgentToolResolver** producing *dynamic* tools per
  invocation
- an **AgentBackend** (the runtime that actually drives turns)

``BaseAgent`` itself has no turn-execution logic — both ``run`` and
``stream`` compute the effective tool registry for the invocation
(via :meth:`build_tools`) and delegate to the backend.
"""

from __future__ import annotations

import logging
from abc import ABC
from typing import AsyncIterator, List, Optional

from copass_core_agents.backends.base_backend import (
    AgentBackend,
    AgentRunResult,
)
from copass_core_agents.base_tool import AgentTool
from copass_core_agents.events import AgentEvent
from copass_core_agents.invocation_context import AgentInvocationContext
from copass_core_agents.tool_registry import AgentToolRegistry
from copass_core_agents.tool_resolver import (
    AgentToolResolver,
    ToolConflictError,
    ToolConflictPolicy,
)

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """Identity + prompt + tools + resolver + backend bundle.

    Not abstract in the Python sense (no ``@abstractmethod``) — the
    ``ABC`` inheritance is a signal to subclassers that this is a
    base type to extend, not to instantiate directly. Instantiating
    ``BaseAgent`` is valid for quick scripts/tests but production
    callers should subclass with concrete identity and prompt.

    Either ``tools`` or ``tool_resolver`` (or both) must be provided.
    """

    def __init__(
        self,
        *,
        identity: str,
        model: str,
        system_prompt: str,
        backend: AgentBackend,
        tools: Optional[AgentToolRegistry] = None,
        tool_resolver: Optional[AgentToolResolver] = None,
        on_conflict: ToolConflictPolicy = "dynamic_wins",
    ) -> None:
        if tools is None and tool_resolver is None:
            raise ValueError(
                "BaseAgent requires at least one of `tools` or "
                "`tool_resolver` — an agent with no capabilities has "
                "no reason to exist."
            )
        if on_conflict not in ("error", "dynamic_wins", "static_wins"):
            raise ValueError(
                f"BaseAgent: invalid on_conflict policy {on_conflict!r}. "
                f"Expected 'error', 'dynamic_wins', or 'static_wins'."
            )
        self.identity = identity
        self.model = model
        self.system_prompt = system_prompt
        self.backend = backend
        self.tools = tools if tools is not None else AgentToolRegistry()
        self.tool_resolver = tool_resolver
        self.on_conflict: ToolConflictPolicy = on_conflict

    async def run(
        self,
        messages: List[dict],
        *,
        context: AgentInvocationContext,
    ) -> AgentRunResult:
        """Drive a turn to completion and return the reduced result."""
        return await self.backend.run(self, messages, context)

    async def stream(
        self,
        messages: List[dict],
        *,
        context: AgentInvocationContext,
    ) -> AsyncIterator[AgentEvent]:
        """Drive a turn and yield ``AgentEvent`` as they occur."""
        async for evt in self.backend.stream(self, messages, context):
            yield evt

    async def build_tools(
        self, context: AgentInvocationContext
    ) -> AgentToolRegistry:
        """Compute the effective tool registry for this invocation."""
        if self.tool_resolver is None:
            return self.tools

        dynamic_tools: List[AgentTool] = await self.tool_resolver.resolve(context)

        merged = AgentToolRegistry()
        static_names = {tool.spec.name for tool in self.tools}
        dynamic_names = {tool.spec.name for tool in dynamic_tools}
        collisions = static_names & dynamic_names

        if collisions and self.on_conflict == "error":
            raise ToolConflictError(
                f"BaseAgent {self.identity!r}: static and dynamic tools "
                f"collide on names: {sorted(collisions)}. Set "
                f"on_conflict='dynamic_wins' or 'static_wins' to pick "
                f"a resolution policy, or fix the duplicated name."
            )

        if self.on_conflict == "static_wins":
            for tool in dynamic_tools:
                if tool.spec.name not in static_names:
                    merged.add(tool)
            for tool in self.tools:
                merged.add(tool)
        else:
            for tool in self.tools:
                if tool.spec.name not in dynamic_names:
                    merged.add(tool)
            for tool in dynamic_tools:
                merged.add(tool)

        if collisions:
            logger.info(
                "BaseAgent.build_tools: resolved tool name collisions",
                extra={
                    "identity": self.identity,
                    "policy": self.on_conflict,
                    "collisions": sorted(collisions),
                },
            )
        return merged

    def __repr__(self) -> str:
        resolver = (
            self.tool_resolver.__class__.__name__
            if self.tool_resolver is not None
            else "None"
        )
        return (
            f"{self.__class__.__name__}("
            f"identity={self.identity!r}, "
            f"model={self.model!r}, "
            f"static_tools={len(self.tools)}, "
            f"resolver={resolver}, "
            f"backend={self.backend.__class__.__name__}"
            f")"
        )


__all__ = ["BaseAgent"]
