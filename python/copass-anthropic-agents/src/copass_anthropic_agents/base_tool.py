"""AgentTool — tool ABC callable by an agent during a turn.

``ToolSpec`` / ``ToolCall`` are the provider-neutral catalog shapes.
They're defined here rather than imported from a neutral shared
package because this SDK is standalone — Copass's server repo may
later lift these dataclasses into a shared package and have both
repos import from there, but for now the SDK owns its own copies.

Usage:
    Concrete tools implement ``spec`` and ``invoke(arguments, *,
    context=...)``. The ``AgentToolRegistry`` on a ``BaseAgent``
    collects instances; backends look them up by ``spec.name`` when
    handling a tool-use turn from the model.

Example:
    >>> class EchoTool(AgentTool):
    ...     @property
    ...     def spec(self) -> ToolSpec:
    ...         return ToolSpec(
    ...             name="echo",
    ...             description="Echo a message back.",
    ...             input_schema={
    ...                 "type": "object",
    ...                 "properties": {"text": {"type": "string"}},
    ...                 "required": ["text"],
    ...             },
    ...         )
    ...
    ...     async def invoke(self, arguments: dict, *, context=None) -> dict:
    ...         return {"echoed": arguments["text"]}
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

from copass_anthropic_agents.invocation_context import AgentInvocationContext


@dataclass(frozen=True)
class ToolSpec:
    """Catalog entry for one tool — what the model sees.

    Shape matches the JSON-schema-based tool-use conventions across
    providers (Anthropic, OpenAI, Google) so a single ``ToolSpec`` can
    be passed to any backend's ``tools=[]`` parameter after trivial
    adaptation.

    Attributes:
        name: Stable identifier. Used for dispatch and logging.
        description: Human-readable — the model reads this to decide
            when to call the tool. Write it as if the model is the
            reader.
        input_schema: JSON Schema for the tool's arguments.
    """

    name: str
    description: str
    input_schema: dict


@dataclass(frozen=True)
class ToolCall:
    """Audit record of one tool invocation within a turn.

    Not used by the agent runtime's hot path (events carry the
    canonical structure); this type is the shape backends / consumers
    serialize when they want to persist a turn's tool history.
    """

    name: str
    arguments: dict
    result: dict
    error: Optional[str] = None
    metadata: dict = field(default_factory=dict)


class AgentTool(ABC):
    """One capability an agent can invoke during a turn.

    Implementations must be:

    - Stateless across calls (no per-invocation mutable state on the
      instance). Concurrency is driven by the backend and multiple
      ``invoke`` calls may run in parallel.
    - JSON-result-returning. The returned dict is fed back to the
      model verbatim; it must be serializable and should stay small
      enough to fit in the model's context window.
    - Schema-honoring. ``arguments`` always matches
      ``spec.input_schema`` — the backend is responsible for
      validating before calling ``invoke``.

    Implementations must NOT:

    - Raise arbitrary exceptions on recoverable errors. Convert
      tool-internal failures into a dict result with an ``error``
      field the model can read and retry against. Reserve raising
      for programmer errors (schema drift, unreachable branches).
    """

    @property
    @abstractmethod
    def spec(self) -> ToolSpec:
        """Return the catalog entry. Must be stable across calls."""
        ...

    @abstractmethod
    async def invoke(
        self,
        arguments: dict,
        *,
        context: Optional[AgentInvocationContext] = None,
    ) -> dict:
        """Execute the tool.

        Args:
            arguments: JSON-decoded tool arguments. Matches
                ``spec.input_schema``.
            context: Per-invocation context (scope, dek, handles).
                Optional — tools that don't need runtime handles
                should tolerate ``None``.

        Returns:
            JSON-serializable dict. Goes straight back to the model.

        Raises:
            Exception: Only for programmer errors / unrecoverable
                failures. Recoverable issues belong in the return
                dict.
        """
        ...


__all__ = ["AgentTool", "ToolCall", "ToolSpec"]
