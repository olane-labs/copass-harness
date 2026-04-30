"""Wire-level tests for Phase 1A resources.

Covers ``AgentsResource``, ``IntegrationsResource``, and
``SandboxConnectionsResource`` — the three resources added to back the
14 read tools in the Concierge management spec corpus.

One representative test per method — covers HTTP method, path shape,
and body / query serialization. Mocked via respx; no network.
"""

from __future__ import annotations

import json

import httpx
import pytest
import respx

from copass_core import ApiKeyAuth, CopassClient


@pytest.fixture
def client() -> CopassClient:
    return CopassClient(auth=ApiKeyAuth(key="olk_test"), api_url="http://test")


# --- agents -----------------------------------------------------


@respx.mock
async def test_agents_list_passes_status_query(client: CopassClient) -> None:
    route = respx.get("http://test/api/v1/storage/sandboxes/sb-1/agents").mock(
        return_value=httpx.Response(200, json={"agents": [], "count": 0}),
    )
    await client.agents.list("sb-1", status="active")
    assert route.called
    assert route.calls.last.request.url.params.get("status") == "active"


@respx.mock
async def test_agents_retrieve(client: CopassClient) -> None:
    respx.get("http://test/api/v1/storage/sandboxes/sb-1/agents/gtm-marketing").mock(
        return_value=httpx.Response(
            200,
            json={
                "agent_id": "ag-1",
                "slug": "gtm-marketing",
                "name": "GTM Marketing",
                "status": "active",
                "version": 1,
            },
        )
    )
    result = await client.agents.retrieve("sb-1", "gtm-marketing")
    assert result["slug"] == "gtm-marketing"


@respx.mock
async def test_agents_create_posts_body(client: CopassClient) -> None:
    route = respx.post("http://test/api/v1/storage/sandboxes/sb-1/agents").mock(
        return_value=httpx.Response(
            200,
            json={"agent_id": "ag-1", "slug": "demo", "name": "Demo"},
        )
    )
    await client.agents.create(
        "sb-1",
        slug="demo",
        name="Demo",
        system_prompt="You are demo.",
        tool_allowlist=["discover"],
        model_settings={"backend": "anthropic", "model": "claude-sonnet-4-6"},
    )
    body = json.loads(route.calls.last.request.content)
    assert body["slug"] == "demo"
    assert body["tool_allowlist"] == ["discover"]
    assert body["model_settings"]["backend"] == "anthropic"


@respx.mock
async def test_agents_list_runs_passes_limit_and_before(client: CopassClient) -> None:
    route = respx.get(
        "http://test/api/v1/storage/sandboxes/sb-1/agents/demo/runs"
    ).mock(return_value=httpx.Response(200, json={"runs": [], "count": 0}))
    await client.agents.list_runs("sb-1", "demo", limit=5, before="rn-9")
    params = route.calls.last.request.url.params
    assert params.get("limit") == "5"
    assert params.get("before") == "rn-9"


@respx.mock
async def test_agents_get_run_targets_runs_subpath(client: CopassClient) -> None:
    route = respx.get(
        "http://test/api/v1/storage/sandboxes/sb-1/agents/runs/rn-1"
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "run_id": "rn-1",
                "agent_id": "ag-1",
                "status": "succeeded",
                "tool_resolution_trace": {"sources_resolved": []},
            },
        )
    )
    result = await client.agents.get_run("sb-1", "rn-1")
    assert route.called
    assert result["run_id"] == "rn-1"
    assert "tool_resolution_trace" in result


@respx.mock
async def test_agents_list_tools(client: CopassClient) -> None:
    respx.get(
        "http://test/api/v1/storage/sandboxes/sb-1/agents/tools"
    ).mock(return_value=httpx.Response(200, json={"tools": [], "count": 0}))
    result = await client.agents.list_tools("sb-1")
    assert result["count"] == 0


@respx.mock
async def test_agents_list_trigger_components_serializes_query(
    client: CopassClient,
) -> None:
    route = respx.get(
        "http://test/api/v1/storage/sandboxes/sb-1/agents/triggers/components"
    ).mock(return_value=httpx.Response(200, json={"components": [], "count": 0}))
    await client.agents.list_trigger_components(
        "sb-1", app="slack", q="message", limit=10
    )
    params = route.calls.last.request.url.params
    assert params.get("app") == "slack"
    assert params.get("q") == "message"
    assert params.get("limit") == "10"


@respx.mock
async def test_agent_triggers_list(client: CopassClient) -> None:
    respx.get(
        "http://test/api/v1/storage/sandboxes/sb-1/agents/demo/triggers"
    ).mock(return_value=httpx.Response(200, json={"triggers": [], "count": 0}))
    result = await client.agents.triggers.list("sb-1", "demo")
    assert result["count"] == 0


# --- integrations ------------------------------------------------


@respx.mock
async def test_integrations_catalog_serializes_query(client: CopassClient) -> None:
    route = respx.get(
        "http://test/api/v1/storage/sandboxes/sb-1/sources/integrations/catalog"
    ).mock(return_value=httpx.Response(200, json={"apps": [], "next_cursor": None}))
    await client.integrations.catalog("sb-1", q="slack", limit=25)
    params = route.calls.last.request.url.params
    assert params.get("q") == "slack"
    assert params.get("limit") == "25"


@respx.mock
async def test_integrations_list_accounts_passes_app_slug(
    client: CopassClient,
) -> None:
    route = respx.get(
        "http://test/api/v1/storage/sandboxes/sb-1/sources/integrations/accounts"
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "accounts": [
                    {
                        "id": "acct_1",
                        "app_slug": "slack",
                        "name": "workspace",
                        "created_at": "2026-04-29T18:00:00Z",
                        "provider": "tool-source",
                    }
                ],
                "count": 1,
            },
        )
    )
    result = await client.integrations.list_accounts("sb-1", app_slug="slack")
    assert route.calls.last.request.url.params.get("app_slug") == "slack"
    assert result["count"] == 1
    assert result["accounts"][0]["app_slug"] == "slack"


@respx.mock
async def test_integrations_list_accounts_omits_query_when_empty(
    client: CopassClient,
) -> None:
    route = respx.get(
        "http://test/api/v1/storage/sandboxes/sb-1/sources/integrations/accounts"
    ).mock(return_value=httpx.Response(200, json={"accounts": [], "count": 0}))
    await client.integrations.list_accounts("sb-1")
    assert "?" not in str(route.calls.last.request.url)


@respx.mock
async def test_integrations_list_connections(client: CopassClient) -> None:
    respx.get(
        "http://test/api/v1/storage/sandboxes/sb-1/sources/integrations/connections"
    ).mock(return_value=httpx.Response(200, json={"connections": [], "count": 0}))
    result = await client.integrations.list("sb-1", app="slack")
    assert result["count"] == 0


# --- sandbox-connections ----------------------------------------


@respx.mock
async def test_sandbox_connections_list(client: CopassClient) -> None:
    route = respx.get(
        "http://test/api/v1/storage/sandboxes/sb-1/connections"
    ).mock(return_value=httpx.Response(200, json=[]))
    await client.sandbox_connections.list("sb-1")
    assert route.called


@respx.mock
async def test_sandbox_connections_list_include_revoked(client: CopassClient) -> None:
    route = respx.get(
        "http://test/api/v1/storage/sandboxes/sb-1/connections"
    ).mock(return_value=httpx.Response(200, json=[]))
    await client.sandbox_connections.list("sb-1", include_revoked=True)
    assert route.calls.last.request.url.params.get("include_revoked") == "true"


@respx.mock
async def test_sandbox_connections_create_posts_body(client: CopassClient) -> None:
    route = respx.post(
        "http://test/api/v1/storage/sandboxes/sb-1/connections"
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "connection_id": "cn-1",
                "user_id": "u-2",
                "role": "viewer",
            },
        )
    )
    await client.sandbox_connections.create(
        "sb-1", role="viewer", copass_id="@teammate"
    )
    body = json.loads(route.calls.last.request.content)
    assert body == {"role": "viewer", "copass_id": "@teammate"}


@respx.mock
async def test_sandbox_connections_spawn_api_key(client: CopassClient) -> None:
    route = respx.post(
        "http://test/api/v1/storage/sandboxes/sb-1/connections/cn-1/api-keys"
    ).mock(
        return_value=httpx.Response(
            200,
            json={"api_key_id": "ak-1", "key": "olk_secret"},
        )
    )
    await client.sandbox_connections.spawn_api_key("sb-1", "cn-1")
    assert route.called
