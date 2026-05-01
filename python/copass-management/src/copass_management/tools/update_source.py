from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def update_source(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    source_id = str(input["data_source_id"])
    kwargs: Dict[str, Any] = {}
    if "name" in input and input["name"] is not None:
        kwargs["name"] = str(input["name"])
    if "ingestion_mode" in input and input["ingestion_mode"] is not None:
        kwargs["ingestion_mode"] = str(input["ingestion_mode"])
    if "external_account_id" in input and input["external_account_id"] is not None:
        kwargs["external_account_id"] = str(input["external_account_id"])
    if "poll_interval_seconds" in input and input["poll_interval_seconds"] is not None:
        kwargs["poll_interval_seconds"] = int(input["poll_interval_seconds"])

    merge_adapter_config = False
    adapter_config: Dict[str, Any] = {}
    if isinstance(input.get("adapter_config"), dict):
        adapter_config.update(input["adapter_config"])
    if "ingest_to_graph" in input and input["ingest_to_graph"] is not None:
        adapter_config["ingest_to_graph"] = bool(input["ingest_to_graph"])
        merge_adapter_config = True
    if adapter_config:
        kwargs["adapter_config"] = adapter_config

    source = await ctx.client.sources.update(
        ctx.sandbox_id,
        source_id,
        merge_adapter_config=merge_adapter_config,
        **kwargs,
    )
    return {"source": source}
