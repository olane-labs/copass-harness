"""Streaming event types for the agents SDK.

``AgentEvent`` is a tagged union consumed by callers of
``BaseAgent.stream(...)``. The backend emits events as it drives a
conversation forward; the caller decides how to render them (write to
a websocket, log them, build a final transcript, etc.).

Events are deliberately runtime-agnostic — they describe *what*
happened in the conversation (text appeared, a tool was called, a
tool returned, the turn finished), not *how* a particular SDK
represents it. Any concrete ``AgentBackend`` is responsible for
translating its provider's streaming format into these events.

Design notes:

- All events are ``@dataclass(frozen=True)`` so consumers can safely
  fan them out without worrying about mutation.
- ``AgentEvent`` is a ``Union`` rather than an ABC. Pattern-matching
  on type (``match evt: case AgentTextDelta(): ...``) is the expected
  consumption pattern.
- Tool results are carried as JSON-serializable dicts to match the
  return contract of ``AgentTool.invoke``.
- ``AgentFinish.session_id`` carries the provider-managed session
  handle (when the provider supports one) so consumers can capture it
  from the terminal event without an out-of-band channel.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Union


@dataclass(frozen=True)
class AgentTextDelta:
    """Incremental text produced by the model for the current turn.

    Multiple ``AgentTextDelta`` events typically appear before an
    ``AgentFinish`` — concatenate their ``text`` fields to reconstruct
    the full assistant message.
    """

    text: str


@dataclass(frozen=True)
class AgentToolCall:
    """The model requested a tool invocation.

    Emitted once per tool call, before the tool actually runs. The
    backend is responsible for routing ``name`` + ``arguments`` through
    the agent's ``AgentToolRegistry`` and then emitting a matching
    ``AgentToolResult``.

    Attributes:
        call_id: Provider-assigned identifier the backend uses to
            correlate this call with its result. Opaque to callers.
        name: Tool name as registered in the ``AgentToolRegistry``.
        arguments: JSON-decoded tool arguments as provided by the model.
    """

    call_id: str
    name: str
    arguments: dict


@dataclass(frozen=True)
class AgentToolResult:
    """The result of a tool invocation requested via ``AgentToolCall``.

    Correlates with its ``AgentToolCall`` via ``call_id``. ``result`` is
    the JSON-serializable dict returned by ``AgentTool.invoke``. When
    the tool raised, ``error`` carries a short human-readable message
    and ``result`` is an empty dict.
    """

    call_id: str
    name: str
    result: dict
    error: Optional[str] = None


@dataclass(frozen=True)
class AgentFinish:
    """The model finished its turn.

    ``stop_reason`` is a provider-neutral string ("end_turn",
    "tool_use", "max_tokens", "error"). Backends map their SDK's stop
    reasons onto this set; unknown reasons pass through as-is.

    ``session_id`` is the provider-managed conversation handle the
    caller can pass back to continue the conversation on the next
    turn. ``None`` from backends that don't expose a session primitive
    (or when continuation is not supported).
    """

    stop_reason: str
    usage: dict = field(default_factory=dict)
    session_id: Optional[str] = None


AgentEvent = Union[AgentTextDelta, AgentToolCall, AgentToolResult, AgentFinish]


__all__ = [
    "AgentEvent",
    "AgentTextDelta",
    "AgentToolCall",
    "AgentToolResult",
    "AgentFinish",
]
