"""AgentToolResolver — per-invocation, scope-bound tool producer.

Webhook-driven and multi-tenant agent flows can't declare a static
tool set at construction time: the tools an agent should wield depend
on who's invoking it and what they can see. ``AgentToolResolver`` is
the ABC that takes the invocation context and returns the
``AgentTool`` instances that belong on the agent for *this* turn.

Why the result is ``list[AgentTool]`` rather than a registry:
    Resolvers are building blocks. An agent can compose multiple
    resolvers (one per data source family), and merging happens above
    them in :class:`BaseAgent.build_tools`. Returning bare lists keeps
    each resolver simple and keeps the conflict policy in one place.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, List, Literal

if TYPE_CHECKING:
    from copass_anthropic_agents.base_tool import AgentTool
    from copass_anthropic_agents.invocation_context import AgentInvocationContext


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

    Implementations receive the full :class:`AgentInvocationContext`
    and are free to read any combination of ``context.scope`` fields
    (``user_id`` / ``sandbox_id`` / ``project_id``), ``context.handles``,
    or ``context.dek`` when deciding which tools to build.

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
        invocation.

        Args:
            context: The invocation context. Its ``scope`` field is
                the primary source of tenancy.

        Returns:
            A list of freshly constructed ``AgentTool`` instances.
            Order does not matter; duplicates (by ``spec.name``) are
            a configuration bug and will trigger the ``BaseAgent``
            conflict policy.
        """


__all__ = [
    "AgentToolResolver",
    "ToolConflictError",
    "ToolConflictPolicy",
]
