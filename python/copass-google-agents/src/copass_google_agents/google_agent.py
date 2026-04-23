"""CopassGoogleAgent — thin convenience subclass of :class:`BaseAgent`.

Wraps the common "run a Vertex AI Agent Engine (ADK) agent with
sensible defaults" construction so dev code stays at one line.
Nothing magical — all the same levers are exposed.

Zero client-side tools is the **expected** case for Google agents.
ADK Agent Engine bakes tools at deploy time, and per the architecture
(see :data:`copass_google_agents.DISPATCH_TOOL_NAME`) the deployed
agent carries a single ``copass_dispatch`` proxy that calls back into
our service to reach the real tools. So ``CopassGoogleAgent`` defaults
``tools`` to an empty :class:`AgentToolRegistry` — the
:class:`BaseAgent` ctor guard ("must have tools or tool_resolver")
is satisfied without forcing callers to pass a no-op registry. Supply
a non-empty registry or a :class:`AgentToolResolver` only if you want
client-side tool execution in addition to the server-side proxy.

Context-window injection is deliberately NOT wired into ``run()`` /
``stream()`` at this release — same reasoning as
:class:`CopassManagedAgent`. ``copass_api_key`` is stored for a future
release. The ``{{copass_context}}`` placeholder is reserved; leave it
out of ``system_prompt`` until context injection ships.

Example:
    >>> from copass_google_agents import (
    ...     AgentInvocationContext, AgentScope, CopassGoogleAgent,
    ... )
    >>> agent = CopassGoogleAgent(
    ...     identity="support",
    ...     system_prompt="You are a support agent.",
    ...     project="my-gcp-project",
    ...     reasoning_engine_id="1234567890",
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

from copass_core_agents.base_agent import BaseAgent
from copass_core_agents.tool_registry import AgentToolRegistry
from copass_core_agents.tool_resolver import ToolConflictPolicy
from copass_google_agents.backends.google_agent_backend import (
    DEFAULT_LOCATION,
    GoogleAgentBackend,
)

if TYPE_CHECKING:
    from google.auth.credentials import Credentials

    from copass_core_agents.tool_resolver import AgentToolResolver


DEFAULT_MODEL = "gemini-3.1-pro-preview"
"""Default model name — currently the latest Gemini 3.1 Pro preview.

**Preview contract caveat:** Google's preview model IDs can be
deprecated with limited notice (e.g. ``gemini-3-pro-preview`` was
shut down 2026-03-09 in favor of this one). Bump the default when
3.x graduates to GA and the ``-preview`` suffix is dropped.

**Decorative at the runtime layer** — Agent Engine agents are
pre-deployed and the real model is baked into the deployed
``reasoningEngine`` resource. ``DEFAULT_MODEL`` is only consumed by
:func:`copass_google_agents.deploy.deploy_adk_agent` at deploy time.
Override via ``CopassGoogleAgent(model=...)`` when you deploy a
non-default model; the string is passed through to
:class:`BaseAgent.model` for parity with other provider SDKs."""


class CopassGoogleAgent(BaseAgent):
    """Vertex AI Agent Engine subclass of :class:`BaseAgent`.

    Constructs a :class:`GoogleAgentBackend` internally. If you need
    tighter control over the backend (custom credentials,
    delete-on-finish policy, pre-built client), construct
    :class:`GoogleAgentBackend` yourself and use :class:`BaseAgent`
    directly.

    Args:
        identity: Stable identifier for the agent (logs, session
            titles). Required.
        system_prompt: System prompt. Required. Used at deploy time
            when the ADK agent is first created; not re-applied
            per-turn.
        project: GCP project id of the deployed reasoning engine.
            Required.
        reasoning_engine_id: Short id of the deployed ADK agent
            resource. Required.
        location: GCP region. Defaults to ``us-central1``.
        model: Gemini model id. See :data:`DEFAULT_MODEL` — decorative
            at runtime; the deployed agent's baked-in model wins.
        credentials: Optional pre-resolved ``google.auth.credentials.Credentials``.
            When omitted, ADC is used.
        copass_api_key: Reserved for forthcoming Context Window
            injection. Stored on the instance; not read by ``run`` /
            ``stream`` in this release.
        tools: Static :class:`AgentToolRegistry` for client-side tools.
            Defaults to an empty registry since Google agents run
            tools server-side via the ``copass_dispatch`` proxy.
        tool_resolver: Dynamic resolver for per-invocation scope-bound
            tools. Rarely needed for Google agents for the same
            reason.
        on_conflict: Conflict policy for static + dynamic tool
            collisions. See :class:`BaseAgent`.
    """

    def __init__(
        self,
        *,
        identity: str,
        system_prompt: str,
        project: str,
        reasoning_engine_id: str,
        location: str = DEFAULT_LOCATION,
        model: str = DEFAULT_MODEL,
        credentials: "Optional[Credentials]" = None,
        copass_api_key: Optional[str] = None,
        tools: Optional[AgentToolRegistry] = None,
        tool_resolver: "Optional[AgentToolResolver]" = None,
        on_conflict: ToolConflictPolicy = "dynamic_wins",
    ) -> None:
        backend = GoogleAgentBackend(
            project=project,
            location=location,
            reasoning_engine_id=reasoning_engine_id,
            credentials=credentials,
        )
        # Default to an empty registry so BaseAgent's "must have tools
        # or tool_resolver" guard is satisfied. See module docstring.
        if tools is None and tool_resolver is None:
            tools = AgentToolRegistry()
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


__all__ = ["CopassGoogleAgent", "DEFAULT_MODEL"]
