"""AgentInvocationContext — per-call runtime context for an agent turn.

Passed into ``BaseAgent.run()`` / ``BaseAgent.stream()`` and forwarded
into every ``AgentTool.invoke(...)`` call executed during that turn.

Tenancy comes from :class:`AgentScope` — a deliberately narrow
(user_id / sandbox_id / project_id) dataclass.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from copass_core_agents.scope import AgentScope


@dataclass(frozen=True)
class AgentInvocationContext:
    """Runtime-scoped context for a single agent invocation.

    Attributes:
        scope: :class:`AgentScope` — tenancy payload. ``scope.user_id``
            is always present.
        trace_id: Optional upstream correlation ID for request
            tracing.
        dek: Optional client-held data encryption key. Never persist
            this field — flow it through memory only.
        handles: Opaque bag for runtime objects. Tools and resolvers
            pull what they need out by key; base classes never inspect
            it.
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
        message listing available keys."""
        if key not in self.handles:
            available = ", ".join(sorted(self.handles)) or "(none)"
            raise KeyError(
                f"AgentInvocationContext missing handle {key!r}. "
                f"Available: {available}"
            )
        return self.handles[key]


__all__ = ["AgentInvocationContext"]
