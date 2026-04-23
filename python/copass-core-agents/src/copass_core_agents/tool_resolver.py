"""AgentToolResolver — per-invocation, scope-bound tool producer."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, List, Literal

if TYPE_CHECKING:
    from copass_core_agents.base_tool import AgentTool
    from copass_core_agents.invocation_context import AgentInvocationContext


ToolConflictPolicy = Literal["error", "dynamic_wins", "static_wins"]
"""How ``BaseAgent.build_tools`` resolves a name collision between the
static tool registry and the resolver's output.

- ``"dynamic_wins"`` — the resolver's tool replaces any static tool
  with the same name. Default for scope-driven flows.
- ``"static_wins"`` — the static tool wins.
- ``"error"`` — raise :class:`ToolConflictError` on collision.
"""


class ToolConflictError(Exception):
    """Raised by ``BaseAgent.build_tools`` under ``on_conflict="error"``
    when a static tool and a resolver-produced tool share a name."""


class AgentToolResolver(ABC):
    """Produce ``AgentTool`` instances scoped to an invocation.

    Concurrency contract:
        ``resolve`` may be called in parallel across invocations for
        different scopes; implementations must not hold per-call state
        on the instance.
    """

    @abstractmethod
    async def resolve(
        self, context: "AgentInvocationContext"
    ) -> List["AgentTool"]:
        """Return the tools that should be available for this
        invocation."""


__all__ = [
    "AgentToolResolver",
    "ToolConflictError",
    "ToolConflictPolicy",
]
