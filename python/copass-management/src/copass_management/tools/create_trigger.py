from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def create_trigger(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    agent_slug = str(input["agent_slug"])
    data_source_id = str(input["data_source_id"])
    event_type = str(input.get("event_type_filter") or "*")
    kwargs: Dict[str, Any] = {
        "data_source_id": data_source_id,
        "event_type_filter": event_type,
    }
    if isinstance(input.get("filter_config"), dict):
        kwargs["filter_config"] = dict(input["filter_config"])
    if input.get("rate_limit_per_hour") is not None:
        kwargs["rate_limit_per_hour"] = int(input["rate_limit_per_hour"])
    trigger = await ctx.client.agents.triggers.create(
        ctx.sandbox_id, agent_slug, **kwargs,
    )
    return {"trigger": trigger}
