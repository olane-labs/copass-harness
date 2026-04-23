"""AgentScope — tenancy payload for an agent invocation.

Deliberately narrow. The server-side ``RetrievalScope`` (in Copass's
backend repo) carries additional machinery — ``ScopeDimension``
extensions, ``allow_cross_sandbox`` / ``allow_cross_project`` escape
hatches, SQL/vector predicate-compilation hooks — none of which this
SDK has business owning. Those are governance concerns for the party
executing retrievals against the knowledge graph, not for the party
running an agent turn.

Fields:

- ``user_id`` — required, non-empty. The Copass platform account the
  agent run is being billed to and routed through. Always present.
- ``sandbox_id`` — optional. Isolation boundary within the account.
- ``project_id`` — optional. Logical grouping within a sandbox.

When the SDK is used alongside the server backend, callers can build
an :class:`AgentScope` by copying fields off a ``RetrievalScope`` at
the API boundary — the shape is deliberately a strict subset.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class AgentScope:
    """Tenancy identity for an agent invocation.

    Frozen — build a new instance rather than mutate. Immutability
    keeps the value safely shareable across concurrent calls without
    the caller reasoning about ownership.
    """

    user_id: str
    sandbox_id: Optional[str] = None
    project_id: Optional[str] = None

    def __post_init__(self) -> None:
        if not self.user_id or not self.user_id.strip():
            raise ValueError("AgentScope.user_id is required and non-empty")


__all__ = ["AgentScope"]
