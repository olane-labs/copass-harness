"""AgentInvocationContext — per-call runtime context for an agent turn.

Passed into ``BaseAgent.run()`` / ``BaseAgent.stream()`` and forwarded
into every ``AgentTool.invoke(...)`` call executed during that turn.

Tenancy comes from :class:`AgentScope` — a deliberately narrow
(user_id / sandbox_id / project_id) dataclass. Callers interoperating
with the Copass backend's richer ``RetrievalScope`` should translate
at the API boundary.

Fields:

- ``scope``: :class:`AgentScope`. Required.
- ``trace_id``: Correlates tool calls with upstream request logging.
  Optional.
- ``dek``: Client-held data encryption key for tools that read from
  the vault. DEKs must never be persisted; keeping this on the
  in-memory invocation context only is the correct handling.
- ``handles``: Escape hatch for runtime-scoped objects (pre-resolved
  provider identifiers, session ids, request-scoped clients) a
  specific tool implementation needs. Opaque to the base classes —
  tools and resolvers cast entries out by key.

Example:
    >>> from copass_anthropic_agents import AgentInvocationContext, AgentScope
    >>> ctx = AgentInvocationContext(
    ...     scope=AgentScope(user_id="u-123", sandbox_id="sb-1"),
    ...     trace_id="req-abc",
    ... )
    >>> await agent.run(messages, context=ctx)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from copass_anthropic_agents.scope import AgentScope


@dataclass(frozen=True)
class AgentInvocationContext:
    """Runtime-scoped context for a single agent invocation.

    Attributes:
        scope: :class:`AgentScope` — tenancy payload. ``scope.user_id``
            is always present (enforced by :class:`AgentScope`).
        trace_id: Optional upstream correlation ID for request
            tracing.
        dek: Optional client-held data encryption key. Present when
            the invocation needs to decrypt vault-stored material.
            Never persist this field — flow it through memory only.
        handles: Opaque bag for runtime objects. Tools and resolvers
            pull what they need out by key; base classes never
            inspect it.
    """

    scope: AgentScope
    trace_id: Optional[str] = None
    dek: Optional[bytes] = None
    handles: dict = field(default_factory=dict)

    @property
    def user_id(self) -> str:
        """Convenience accessor for ``scope.user_id``. Never returns
        the empty string because :class:`AgentScope` enforces
        non-empty ``user_id`` at construction."""
        return self.scope.user_id

    def get_handle(self, key: str) -> Any:
        """Return ``handles[key]`` or raise ``KeyError`` with a
        message listing available keys — easier to diagnose than the
        default ``KeyError`` when a tool expects a handle that wasn't
        provided.
        """
        if key not in self.handles:
            available = ", ".join(sorted(self.handles)) or "(none)"
            raise KeyError(
                f"AgentInvocationContext missing handle {key!r}. "
                f"Available: {available}"
            )
        return self.handles[key]


__all__ = ["AgentInvocationContext"]
