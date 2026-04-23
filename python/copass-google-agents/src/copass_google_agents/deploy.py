"""``deploy_adk_agent`` — one-time ops helper to deploy an ADK agent.

Vertex AI Agent Engine agents are **pre-deployed resources**, not
created per-run. This helper wraps the deploy flow so developers can
ship an ADK agent with:

- The single ``copass_dispatch`` proxy function tool (see
  :data:`copass_google_agents.DISPATCH_TOOL_NAME`) wired in, pointing
  at the dev's Copass service endpoint.
- A system prompt baked in at deploy time.
- Optional extra MCP toolsets alongside the proxy (e.g. a dev who
  wants a specific MCP server reachable natively from the deployed
  agent, in addition to server-side resolver routing).

The proxy tool reads its configuration from three environment
variables baked into the deployed engine: ``COPASS_API_URL``,
``COPASS_API_KEY``, and optionally ``COPASS_DISPATCH_PATH``. Closures
over deploy-time variables do not round-trip cleanly into Agent
Engine's remote runtime, so env vars are the safe channel.

Example::

    from copass_google_agents.deploy import deploy_adk_agent

    engine = deploy_adk_agent(
        display_name="support-agent",
        project="my-gcp-project",
        staging_bucket="gs://my-bucket",
        system_prompt="You are a support agent. Call copass_dispatch "
                      "to invoke any tool available to the current user.",
        copass_api_url="https://api.copass.id",
        copass_api_key="olk_...",
    )
    print(engine.api_resource.name)
    # projects/.../reasoningEngines/... — feed into
    # CopassGoogleAgent(reasoning_engine_id=...)

Re-deploy is idempotent only in the narrow sense that creating with
the same ``display_name`` produces a *new* resource with a *new*
``reasoning_engine_id``. Manage lifecycle (update/delete) via
``vertexai.Client().agent_engines.update(...)`` /
``.delete(...)`` — not covered by this helper.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, Optional

from copass_google_agents._proxy_tool import copass_dispatch
from copass_google_agents.backends.google_agent_backend import (
    DEFAULT_LOCATION,
)

if TYPE_CHECKING:
    from google.auth.credentials import Credentials


logger = logging.getLogger(__name__)


DEFAULT_REQUIREMENTS = [
    "google-cloud-aiplatform[agent_engines,adk]>=1.148.1",
    "httpx>=0.27",
]
"""Minimum pip requirements baked into a deployed Copass agent.
Caller can override via the ``requirements=`` kwarg; these are the
floor when none is supplied."""


def deploy_adk_agent(
    *,
    display_name: str,
    project: str,
    system_prompt: str,
    copass_api_url: str,
    copass_api_key: str,
    location: str = DEFAULT_LOCATION,
    model: str = "gemini-3.1-pro-preview",
    staging_bucket: Optional[str] = None,
    credentials: "Optional[Credentials]" = None,
    extra_tools: Optional[list[Any]] = None,
    requirements: Optional[list[str]] = None,
    dispatch_path: Optional[str] = None,
    vertex_client: Any = None,
) -> Any:
    """Deploy an ADK agent to Vertex AI Agent Engine.

    Args:
        display_name: Human-readable name shown in the GCP console.
        project: GCP project to deploy into.
        system_prompt: System prompt baked into the deployed agent.
            Describe the tools available via ``copass_dispatch`` here
            — the model can't learn them at runtime since the proxy
            takes opaque ``tool_name`` strings.
        copass_api_url: Base URL of the Copass service the
            ``copass_dispatch`` proxy calls back into
            (e.g. ``https://api.copass.id``). Baked in as the
            ``COPASS_API_URL`` env var on the deployed engine.
        copass_api_key: API key the proxy includes on each call-back.
            Baked in as ``COPASS_API_KEY``. **Treat as a secret** —
            the key is embedded in the reasoning engine's environment.
        location: GCP region. Defaults to :data:`DEFAULT_LOCATION`.
        model: Gemini model id. Defaults to
            ``gemini-3.1-pro-preview`` — the current latest 3.1 Pro
            preview. Bump when 3.x graduates to GA.
        staging_bucket: GCS bucket for ADK agent artifacts
            (``gs://...``). Required by the Agent Engine API when an
            ``agent`` object is supplied; this helper raises upfront
            rather than letting the API surface the error.
        credentials: Optional pre-resolved credentials. When omitted,
            ADC is used.
        extra_tools: Optional additional ADK tool objects to bake in
            *alongside* ``copass_dispatch`` (e.g. MCP toolsets a dev
            wants the agent to use natively, bypassing the proxy).
            Most deployments won't need this.
        requirements: Optional pip requirements list. Defaults to
            :data:`DEFAULT_REQUIREMENTS`.
        dispatch_path: Optional path override for the Copass
            dispatch endpoint. Baked in as ``COPASS_DISPATCH_PATH``.
            Defaults to the proxy tool's built-in default.
        vertex_client: Pre-built ``vertexai.Client`` (injectable for
            tests). When omitted, one is constructed from
            ``project``/``location``/``credentials``.

    Returns:
        The created ``vertexai.agent_engines.AgentEngine`` resource.
        ``.api_resource.name`` (or ``.resource_name`` on newer SDKs)
        is the string to feed into
        :class:`GoogleAgentBackend(reasoning_engine_id=...)`.

    Raises:
        ValueError: If required args are empty or
            ``staging_bucket`` doesn't start with ``gs://``.
    """
    if not display_name:
        raise ValueError("deploy_adk_agent: `display_name` is required")
    if not project:
        raise ValueError("deploy_adk_agent: `project` is required")
    if not system_prompt:
        raise ValueError("deploy_adk_agent: `system_prompt` is required")
    if not copass_api_url:
        raise ValueError("deploy_adk_agent: `copass_api_url` is required")
    if not copass_api_key:
        raise ValueError("deploy_adk_agent: `copass_api_key` is required")
    if not staging_bucket or not staging_bucket.startswith("gs://"):
        raise ValueError(
            "deploy_adk_agent: `staging_bucket` is required and must "
            "start with 'gs://' (Agent Engine API constraint)"
        )

    from google.adk import Agent

    tools: list[Any] = [copass_dispatch]
    if extra_tools:
        tools.extend(extra_tools)

    local_agent = Agent(
        name="copass_agent",
        model=model,
        instruction=system_prompt,
        tools=tools,
    )

    client = vertex_client
    if client is None:
        import vertexai

        client_kwargs: dict = {"project": project, "location": location}
        if credentials is not None:
            client_kwargs["credentials"] = credentials
        client = vertexai.Client(**client_kwargs)

    env_vars: dict = {
        "COPASS_API_URL": copass_api_url,
        "COPASS_API_KEY": copass_api_key,
    }
    if dispatch_path:
        env_vars["COPASS_DISPATCH_PATH"] = dispatch_path

    config: dict = {
        "display_name": display_name,
        "staging_bucket": staging_bucket,
        "requirements": list(requirements) if requirements else list(DEFAULT_REQUIREMENTS),
        "env_vars": env_vars,
        "agent_framework": "google-adk",
    }

    engine = client.agent_engines.create(agent=local_agent, config=config)
    logger.info(
        "deploy_adk_agent: created Agent Engine resource",
        extra={
            "display_name": display_name,
            "project": project,
            "region": location,
        },
    )
    return engine


__all__ = ["deploy_adk_agent", "DEFAULT_REQUIREMENTS"]
