"""AgentBackend — runtime ABC for executing an agent turn.

A backend is the seam between the provider-neutral agent surface
(``BaseAgent``, ``AgentTool``, ``AgentEvent``) and a concrete
SDK/provider.

Design rules:

- Base classes must NOT import any vendor SDK. This file only depends
  on plain data types and the SDK's own ABCs.
- Backends translate between the provider's tool-use format and the
  agent's ``AgentToolRegistry`` + ``AgentEvent`` stream.
- A single backend instance may be shared across agents and requests.
  Per-request state lives on ``AgentInvocationContext``, not on the
  backend.

Concrete backends live in per-provider packages
(``copass-anthropic-agents``, future ``copass-openai-agents``,
``copass-google-agents``). This file and ``AgentRunResult`` are the
only ABC surface they implement against.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, AsyncIterator, List, Optional

from copass_core_agents.events import AgentEvent
from copass_core_agents.invocation_context import AgentInvocationContext

if TYPE_CHECKING:
    from copass_core_agents.base_agent import BaseAgent


@dataclass(frozen=True)
class AgentRunResult:
    """Reduced output of a non-streaming ``AgentBackend.run``."""

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
        """Backend-specific configuration. Read-only view."""
        return dict(self._config)

    @abstractmethod
    async def run(
        self,
        agent: "BaseAgent",
        messages: List[dict],
        context: AgentInvocationContext,
    ) -> AgentRunResult:
        """Drive the conversation to a stop condition, return a
        reduced result."""
        ...

    @abstractmethod
    def stream(
        self,
        agent: "BaseAgent",
        messages: List[dict],
        context: AgentInvocationContext,
    ) -> AsyncIterator[AgentEvent]:
        """Drive the conversation and yield ``AgentEvent`` as they
        occur."""
        ...


__all__ = ["AgentBackend", "AgentRunResult"]
