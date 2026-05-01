from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def update_trigger(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    trigger_id = str(input["trigger_id"])
    kwargs: Dict[str, Any] = {}
    if "event_type_filter" in input and input["event_type_filter"] is not None:
        kwargs["event_type_filter"] = str(input["event_type_filter"])
    if "rate_limit_per_hour" in input:
        v = input["rate_limit_per_hour"]
        if v is None:
            kwargs["clear_rate_limit"] = True
        else:
            kwargs["rate_limit_per_hour"] = int(v)
    if "filter_config" in input:
        v = input["filter_config"]
        if v is None:
            kwargs["clear_filter_config"] = True
        elif isinstance(v, dict):
            kwargs["filter_config"] = dict(v)
    trigger = await ctx.client.agents.triggers.update_by_id(
        ctx.sandbox_id, trigger_id, **kwargs,
    )
    return {"trigger": trigger}
