from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def connect_linear(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    kwargs: Dict[str, Any] = {
        "api_key": str(input["api_key"]),
    }
    if input.get("name") is not None:
        kwargs["name"] = str(input["name"])
    if isinstance(input.get("include"), list):
        kwargs["include"] = [str(x) for x in input["include"]]
    if input.get("rate_cap_per_minute") is not None:
        kwargs["rate_cap_per_minute"] = int(input["rate_cap_per_minute"])
    if input.get("poll_interval_seconds") is not None:
        kwargs["poll_interval_seconds"] = int(input["poll_interval_seconds"])
    return await ctx.client.sources.connect_linear(ctx.sandbox_id, **kwargs)
