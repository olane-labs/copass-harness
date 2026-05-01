from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def provision_source(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    adapter_config: Dict[str, Any] = {}
    if isinstance(input.get("adapter_config"), dict):
        adapter_config.update(input["adapter_config"])
    if input.get("ingest_to_graph") is True:
        adapter_config["ingest_to_graph"] = True

    kwargs: Dict[str, Any] = {
        "provider": str(input.get("provider") or "pipedream"),
        "name": str(input["name"]),
    }
    if input.get("ingestion_mode") is not None:
        kwargs["ingestion_mode"] = str(input["ingestion_mode"])
    if input.get("kind") is not None:
        kwargs["kind"] = str(input["kind"])
    if input.get("external_account_id") is not None:
        kwargs["external_account_id"] = str(input["external_account_id"])
    if input.get("poll_interval_seconds") is not None:
        kwargs["poll_interval_seconds"] = int(input["poll_interval_seconds"])
    if adapter_config:
        kwargs["adapter_config"] = adapter_config

    source = await ctx.client.sources.register(ctx.sandbox_id, **kwargs)
    return {"source": source}
