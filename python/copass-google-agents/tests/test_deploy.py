"""Unit tests for ``deploy_adk_agent``.

Live deploys are out of scope — these tests drive the helper against
a fake ``vertexai.Client`` to verify we assemble the right
``create(agent=..., config=...)`` payload and surface arg validation
before the network call.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, List

import pytest

from copass_google_agents._proxy_tool import (
    DEFAULT_DISPATCH_PATH,
    copass_dispatch,
)
from copass_google_agents.deploy import DEFAULT_REQUIREMENTS, deploy_adk_agent


@dataclass
class _FakeAgentEngines:
    created: List[dict] = field(default_factory=list)

    def create(self, *, agent: Any, config: dict) -> Any:
        self.created.append({"agent": agent, "config": dict(config)})
        return object()  # opaque handle


@dataclass
class _FakeVertexClient:
    agent_engines: _FakeAgentEngines = field(default_factory=_FakeAgentEngines)


# ──────────────────────────────────────────────────────────────────────
# Argument validation
# ──────────────────────────────────────────────────────────────────────


def _base_kwargs(**overrides: Any) -> dict:
    kw = {
        "display_name": "support-agent",
        "project": "my-proj",
        "system_prompt": "You are helpful.",
        "copass_api_url": "https://api.copass.id",
        "copass_api_key": "olk_test",
        "staging_bucket": "gs://my-bucket",
        "vertex_client": _FakeVertexClient(),
    }
    kw.update(overrides)
    return kw


@pytest.mark.parametrize(
    "missing",
    [
        "display_name",
        "project",
        "system_prompt",
        "copass_api_url",
        "copass_api_key",
    ],
)
def test_rejects_missing_required_arg(missing: str) -> None:
    kwargs = _base_kwargs(**{missing: ""})
    with pytest.raises(ValueError, match=missing):
        deploy_adk_agent(**kwargs)


def test_rejects_non_gcs_staging_bucket() -> None:
    kwargs = _base_kwargs(staging_bucket="my-bucket")
    with pytest.raises(ValueError, match="gs://"):
        deploy_adk_agent(**kwargs)


def test_rejects_missing_staging_bucket() -> None:
    kwargs = _base_kwargs(staging_bucket="")
    with pytest.raises(ValueError, match="staging_bucket"):
        deploy_adk_agent(**kwargs)


# ──────────────────────────────────────────────────────────────────────
# create() payload shape
# ──────────────────────────────────────────────────────────────────────


def test_create_payload_bakes_env_vars_and_requirements() -> None:
    fake_client = _FakeVertexClient()
    deploy_adk_agent(**_base_kwargs(vertex_client=fake_client))

    assert len(fake_client.agent_engines.created) == 1
    call = fake_client.agent_engines.created[0]
    config = call["config"]
    assert config["display_name"] == "support-agent"
    assert config["staging_bucket"] == "gs://my-bucket"
    assert config["requirements"] == DEFAULT_REQUIREMENTS
    assert config["agent_framework"] == "google-adk"
    assert config["env_vars"] == {
        "COPASS_API_URL": "https://api.copass.id",
        "COPASS_API_KEY": "olk_test",
    }


def test_create_payload_custom_requirements_override_default() -> None:
    fake_client = _FakeVertexClient()
    deploy_adk_agent(
        **_base_kwargs(
            vertex_client=fake_client,
            requirements=["my-custom-pkg==1.2.3"],
        )
    )
    config = fake_client.agent_engines.created[0]["config"]
    assert config["requirements"] == ["my-custom-pkg==1.2.3"]


def test_create_payload_custom_dispatch_path_included() -> None:
    fake_client = _FakeVertexClient()
    deploy_adk_agent(
        **_base_kwargs(
            vertex_client=fake_client,
            dispatch_path="/api/v2/dispatch",
        )
    )
    env = fake_client.agent_engines.created[0]["config"]["env_vars"]
    assert env["COPASS_DISPATCH_PATH"] == "/api/v2/dispatch"


def _unwrap_agent(adk_app):
    """Reach the inner ``google.adk.Agent`` through the ``AdkApp`` wrapper.

    ``deploy_adk_agent`` wraps the raw Agent in ``vertexai.agent_engines
    .AdkApp`` before handing it to ``agent_engines.create``. Different
    SDK versions expose the inner agent under ``.agent`` or ``._agent``;
    probe both to stay forward-compatible.
    """
    raw = getattr(adk_app, "agent", None)
    if raw is None:
        raw = getattr(adk_app, "_agent", None)
    if raw is None:
        # Current vertexai build stashes the Agent in a private
        # ``_tmpl_attrs`` dict under the ``agent`` key. Use this as a
        # last resort so tests don't lock us to one SDK minor version.
        tmpl = getattr(adk_app, "_tmpl_attrs", None)
        if isinstance(tmpl, dict):
            raw = tmpl.get("agent")
    assert raw is not None, (
        "expected AdkApp to expose the wrapped Agent via .agent, ._agent, "
        "or ._tmpl_attrs['agent']"
    )
    return raw


def test_created_agent_has_copass_dispatch_tool() -> None:
    fake_client = _FakeVertexClient()
    deploy_adk_agent(**_base_kwargs(vertex_client=fake_client))
    adk_app = fake_client.agent_engines.created[0]["agent"]
    agent = _unwrap_agent(adk_app)
    # ADK Agent stores tools under .tools — verify copass_dispatch is
    # bound. The function object identity is preserved because we
    # pass it by reference from the proxy module.
    assert any(t is copass_dispatch for t in agent.tools)


def test_extra_tools_appended_after_dispatch_proxy() -> None:
    fake_client = _FakeVertexClient()

    def my_extra_tool(x: str) -> dict:
        """Example extra tool."""
        return {"x": x}

    deploy_adk_agent(
        **_base_kwargs(
            vertex_client=fake_client,
            extra_tools=[my_extra_tool],
        )
    )
    adk_app = fake_client.agent_engines.created[0]["agent"]
    agent = _unwrap_agent(adk_app)
    assert agent.tools[0] is copass_dispatch
    assert any(t is my_extra_tool for t in agent.tools[1:])


# ──────────────────────────────────────────────────────────────────────
# Proxy-tool module constants sanity
# ──────────────────────────────────────────────────────────────────────


def test_default_dispatch_path() -> None:
    assert DEFAULT_DISPATCH_PATH == "/api/v1/agents/dispatch"
