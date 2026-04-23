"""CopassManagedAgent — thin convenience subclass of :class:`BaseAgent`.

Wraps the common "run an Anthropic managed agent with sensible
defaults" construction so dev code stays at one line. Nothing magical
— all the same levers are exposed.

Context-window injection is deliberately NOT wired into ``run()`` /
``stream()`` at this release. Mutating ``system_prompt`` per
invocation would invalidate :class:`ManagedAgentBackend`'s
fingerprint cache on every scope change, forcing a new managed-agent
resource per call and colliding with Anthropic's 60-creates/min rate
limit. The ``copass_api_key`` is stored on the instance for a future
release where context is fetched and composed into ``system_prompt``
at construction time (stable across turns) or injected via a separate
side-channel that does not influence the fingerprint.

The ``{{copass_context}}`` placeholder (see
``spec/context-placeholders.md`` in the ``copass-harness`` repo)
is reserved for that future integration. If present in
``system_prompt``, it is NOT currently substituted — leave it out
until context injection ships.

Example:
    >>> from copass_anthropic_agents import (
    ...     AgentInvocationContext, AgentScope, CopassManagedAgent,
    ... )
    >>> agent = CopassManagedAgent(
    ...     identity="support",
    ...     system_prompt="You are a support agent.",
    ...     anthropic_api_key=os.environ["ANTHROPIC_API_KEY"],
    ... )
    >>> result = await agent.run(
    ...     messages=[{"role": "user", "content": "Hello"}],
    ...     context=AgentInvocationContext(
    ...         scope=AgentScope(user_id="u-1"),
    ...     ),
    ... )
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from copass_anthropic_agents.backends.managed_agent_backend import ManagedAgentBackend
from copass_anthropic_agents.base_agent import BaseAgent
from copass_anthropic_agents.tool_registry import AgentToolRegistry
from copass_anthropic_agents.tool_resolver import ToolConflictPolicy

if TYPE_CHECKING:
    from anthropic import AsyncAnthropic

    from copass_anthropic_agents.tool_resolver import AgentToolResolver


DEFAULT_MODEL = "claude-opus-4-7"


class CopassManagedAgent(BaseAgent):
    """Anthropic-Managed-Agents subclass of :class:`BaseAgent`.

    Constructs a :class:`ManagedAgentBackend` internally. If you need
    tighter control over the backend (custom environment config,
    delete-on-finish policy, pre-built client), construct
    :class:`ManagedAgentBackend` yourself and use :class:`BaseAgent`
    directly.

    Args:
        identity: Stable identifier for the agent (logs, managed-agent
            resource naming). Required.
        system_prompt: System prompt. Required.
        model: Anthropic model id. Defaults to ``claude-opus-4-7``.
        anthropic_api_key: Passed through to the Anthropic SDK. If
            omitted, the SDK reads ``ANTHROPIC_API_KEY`` from env.
        anthropic_client: Pre-built ``AsyncAnthropic`` client. If
            supplied, takes precedence over ``anthropic_api_key``.
        copass_api_key: Reserved for forthcoming Context Window
            injection. Stored on the instance; not read by ``run`` /
            ``stream`` in this release.
        tools: Static :class:`AgentToolRegistry` for tools known at
            construction time. May be omitted if ``tool_resolver`` is
            provided.
        tool_resolver: Dynamic resolver for per-invocation scope-bound
            tools.
        on_conflict: Conflict policy for static + dynamic tool
            collisions. See :class:`BaseAgent`.
    """

    def __init__(
        self,
        *,
        identity: str,
        system_prompt: str,
        model: str = DEFAULT_MODEL,
        anthropic_api_key: Optional[str] = None,
        anthropic_client: "Optional[AsyncAnthropic]" = None,
        copass_api_key: Optional[str] = None,
        tools: Optional[AgentToolRegistry] = None,
        tool_resolver: "Optional[AgentToolResolver]" = None,
        on_conflict: ToolConflictPolicy = "dynamic_wins",
    ) -> None:
        backend = ManagedAgentBackend(
            client=anthropic_client,
            api_key=anthropic_api_key,
        )
        super().__init__(
            identity=identity,
            model=model,
            system_prompt=system_prompt,
            backend=backend,
            tools=tools,
            tool_resolver=tool_resolver,
            on_conflict=on_conflict,
        )
        self.copass_api_key = copass_api_key


__all__ = ["CopassManagedAgent", "DEFAULT_MODEL"]
