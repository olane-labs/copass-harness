"""AgentBackend — runtime ABC for executing an agent turn.

A backend is the seam between the provider-neutral agent surface
(``BaseAgent``, ``AgentTool``, ``AgentEvent``) and a concrete
SDK/provider (Anthropic managed agents today; OpenAI, Google, a local
loop in future releases).

Design rules:

- Base classes must NOT import any vendor SDK. This file only depends
  on plain data types and the SDK's own ABCs.
- Backends translate between the provider's tool-use format and the
  agent's ``AgentToolRegistry`` + ``AgentEvent`` stream.
- A single backend instance may be shared across agents and requests.
  Per-request state lives on ``AgentInvocationContext``, not on the
  backend.

Two entry points. Implementations must honor both — ``run`` should
typically be implemented by draining ``stream`` and reducing the
events into an ``AgentRunResult``.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, AsyncIterator, List, Optional

from copass_anthropic_agents.events import AgentEvent
from copass_anthropic_agents.invocation_context import AgentInvocationContext

if TYPE_CHECKING:
    from copass_anthropic_agents.base_agent import BaseAgent


@dataclass(frozen=True)
class AgentRunResult:
    """Reduced output of a non-streaming ``AgentBackend.run``.

    Attributes:
        final_text: Concatenated assistant text for the turn. Empty
            string if the model finished with only tool calls and no
            prose.
        tool_calls: Every ``AgentToolCall`` that fired during the turn,
            paired with its matching ``AgentToolResult`` via ``call_id``.
            Retained so callers can audit what the model asked for.
        stop_reason: The terminal ``AgentFinish.stop_reason``.
        usage: Provider-reported token usage. Opaque shape — the
            backend decides the keys. Empty dict if unavailable.
        session_id: Provider-managed session handle for continuation.
            ``None`` when the provider doesn't expose one.
    """

    final_text: str
    tool_calls: List[dict] = field(default_factory=list)
    stop_reason: str = "end_turn"
    usage: dict = field(default_factory=dict)
    session_id: Optional[str] = None


class AgentBackend(ABC):
    """Runtime adapter between the agent surface and a provider SDK.

    Construction takes an optional ``config`` dict. Backend-specific
    knobs (API keys, model allow-lists, timeout overrides) live there
    rather than as strong fields so the ABC signature stays stable as
    providers evolve.
    """

    def __init__(self, *, config: Optional[dict] = None) -> None:
        self._config = dict(config or {})

    @property
    def config(self) -> dict:
        """Backend-specific configuration. Read-only view — mutating
        the returned dict does not rebind the backend's config."""
        return dict(self._config)

    @abstractmethod
    async def run(
        self,
        agent: "BaseAgent",
        messages: List[dict],
        context: AgentInvocationContext,
    ) -> AgentRunResult:
        """Drive the conversation to a stop condition, return a
        reduced result. See ``AgentRunResult`` for shape."""
        ...

    @abstractmethod
    def stream(
        self,
        agent: "BaseAgent",
        messages: List[dict],
        context: AgentInvocationContext,
    ) -> AsyncIterator[AgentEvent]:
        """Drive the conversation and yield ``AgentEvent`` as they
        occur.

        Not declared ``async`` because ``AsyncIterator`` is the return
        type — the method itself returns an async iterator. Concrete
        implementations are typically ``async def`` with ``yield``
        statements; that shape matches this signature.
        """
        ...


__all__ = ["AgentBackend", "AgentRunResult"]
