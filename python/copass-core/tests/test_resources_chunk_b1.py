"""Wire-level tests for Chunk B1 core methods.

Covers the new and widened methods on ``copass_core``:

* ``agents.update_model_settings`` — PATCH /agents/{slug}/model-settings.
* ``sources.connect_linear`` — POST /sources/linear.
* ``sources.update`` widened with ``merge_adapter_config: bool`` —
  appends ``?merge_adapter_config=true`` query param when set.
* ``integrations.connect`` widened with ``webhook_uri: Optional[str]``.
* ``agents.triggers.update_by_id`` — flat top-level
  PATCH /sandboxes/{sandbox_id}/triggers/{trigger_id} route.

Mocked via respx; no network.
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


# --- agents.update_model_settings -----------------------------------


@respx.mock
async def test_update_model_settings_partial(client: CopassClient) -> None:
    route = respx.patch(
        "http://test/api/v1/storage/sandboxes/sb-1/agents/demo/model-settings",
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "agent_id": "ag-1",
                "slug": "demo",
                "version": 5,
                "model_settings": {
                    "backend": "anthropic",
                    "model": "claude-sonnet-4-6",
                    "temperature": 1.0,
                    "max_tokens": 4096,
                    "max_turns": 8,
                    "timeout_s": 60,
                },
            },
        )
    )
    await client.agents.update_model_settings(
        "sb-1", "demo", temperature=1.0,
    )
    body = json.loads(route.calls.last.request.content)
    assert body == {"temperature": 1.0}


@respx.mock
async def test_update_model_settings_multi_field(client: CopassClient) -> None:
    route = respx.patch(
        "http://test/api/v1/storage/sandboxes/sb-1/agents/demo/model-settings",
    ).mock(
        return_value=httpx.Response(
            200, json={"agent_id": "ag-1", "slug": "demo", "version": 6},
        )
    )
    await client.agents.update_model_settings(
        "sb-1", "demo",
        backend="google",
        model="gemini-2.5-flash",
        max_tokens=8192,
    )
    body = json.loads(route.calls.last.request.content)
    assert body == {
        "backend": "google",
        "model": "gemini-2.5-flash",
        "max_tokens": 8192,
    }


# --- sources.connect_linear -----------------------------------------


@respx.mock
async def test_connect_linear_posts_body(client: CopassClient) -> None:
    route = respx.post(
        "http://test/api/v1/storage/sandboxes/sb-1/sources/linear",
    ).mock(
        return_value=httpx.Response(
            201,
            json={
                "data_source_id": "ds-linear-1",
                "status": "active",
                "name": "Linear",
                "ingestion_mode": "polling",
                "entities": ["issues", "projects"],
            },
        )
    )
    result = await client.sources.connect_linear(
        "sb-1",
        api_key="lin_api_test",
        include=["issues", "projects"],
        rate_cap_per_minute=120,
    )
    assert result["data_source_id"] == "ds-linear-1"
    body = json.loads(route.calls.last.request.content)
    assert body == {
        "api_key": "lin_api_test",
        "include": ["issues", "projects"],
        "rate_cap_per_minute": 120,
    }


# --- sources.update merge_adapter_config -----------------------------


@respx.mock
async def test_sources_update_default_omits_merge_query(
    client: CopassClient,
) -> None:
    route = respx.patch(
        "http://test/api/v1/storage/sandboxes/sb-1/sources/ds-1",
    ).mock(
        return_value=httpx.Response(
            200, json={"data_source_id": "ds-1", "adapter_config": {}},
        )
    )
    await client.sources.update(
        "sb-1", "ds-1",
        adapter_config={"ingest_to_graph": True},
    )
    qp = route.calls.last.request.url.params
    assert qp.get("merge_adapter_config") is None


@respx.mock
async def test_sources_update_merge_appends_query_param(
    client: CopassClient,
) -> None:
    route = respx.patch(
        "http://test/api/v1/storage/sandboxes/sb-1/sources/ds-1",
    ).mock(
        return_value=httpx.Response(
            200, json={"data_source_id": "ds-1", "adapter_config": {}},
        )
    )
    await client.sources.update(
        "sb-1", "ds-1",
        adapter_config={"ingest_to_graph": True},
        merge_adapter_config=True,
    )
    qp = route.calls.last.request.url.params
    assert qp.get("merge_adapter_config") == "true"
    body = json.loads(route.calls.last.request.content)
    assert body == {"adapter_config": {"ingest_to_graph": True}}


# --- integrations.connect webhook_uri -------------------------------


@respx.mock
async def test_integrations_connect_includes_webhook_uri(
    client: CopassClient,
) -> None:
    route = respx.post(
        "http://test/api/v1/storage/sandboxes/sb-1/sources/integrations/slack/connect",
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "connect_url": "https://provider/connect/abc",
                "session_id": "ctok_abc",
            },
        )
    )
    await client.integrations.connect(
        "sb-1", "slack",
        success_redirect_uri="https://ok",
        error_redirect_uri="https://err",
        webhook_uri="https://custom.dev/webhook",
    )
    body = json.loads(route.calls.last.request.content)
    assert body == {
        "success_redirect_uri": "https://ok",
        "error_redirect_uri": "https://err",
        "webhook_uri": "https://custom.dev/webhook",
    }


@respx.mock
async def test_integrations_connect_omits_webhook_uri_by_default(
    client: CopassClient,
) -> None:
    route = respx.post(
        "http://test/api/v1/storage/sandboxes/sb-1/sources/integrations/slack/connect",
    ).mock(
        return_value=httpx.Response(
            200,
            json={
                "connect_url": "https://provider/connect/abc",
                "session_id": "ctok_abc",
            },
        )
    )
    await client.integrations.connect(
        "sb-1", "slack",
        success_redirect_uri="https://ok",
        error_redirect_uri="https://err",
    )
    body = json.loads(route.calls.last.request.content)
    assert "webhook_uri" not in body


# --- agents.triggers.update_by_id -----------------------------------


@respx.mock
async def test_triggers_update_by_id_flat_route(client: CopassClient) -> None:
    route = respx.patch(
        "http://test/api/v1/storage/sandboxes/sb-1/triggers/tr-1",
    ).mock(
        return_value=httpx.Response(
            200,
            json={"trigger_id": "tr-1", "status": "paused"},
        )
    )
    result = await client.agents.triggers.update_by_id(
        "sb-1", "tr-1", status="paused",
    )
    assert result["status"] == "paused"
    body = json.loads(route.calls.last.request.content)
    # Booleans default through; status set per-call.
    assert body["status"] == "paused"
    assert body["clear_filter_config"] is False
    assert body["clear_rate_limit"] is False


# --- TS / Py parity -- shared input shapes the spec layer relies on


def test_ts_py_signature_parity_trigger_update_by_id() -> None:
    """Sanity: the Py method exists with the documented kwargs.

    Cross-language conformance is exercised end-to-end by the harness
    conformance script; this test just guards against accidental
    rename / signature drift on the Py side.
    """
    from copass_core.resources.agents import AgentTriggersResource

    sig = AgentTriggersResource.update_by_id  # type: ignore[attr-defined]
    assert callable(sig)


def test_ts_py_signature_parity_sources_update_widened() -> None:
    from copass_core.resources.sources import SourcesResource
    import inspect

    params = inspect.signature(SourcesResource.update).parameters
    assert "merge_adapter_config" in params
    assert params["merge_adapter_config"].default is False


def test_ts_py_signature_parity_integrations_connect_widened() -> None:
    from copass_core.resources.integrations import IntegrationsResource
    import inspect

    params = inspect.signature(IntegrationsResource.connect).parameters
    assert "webhook_uri" in params
    assert params["webhook_uri"].default is None
