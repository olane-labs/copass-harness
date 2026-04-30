from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def list_runs(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    limit = input.get("limit")
    return await ctx.client.agents.list_runs(
        ctx.sandbox_id,
        str(input["agent_slug"]),
        limit=int(limit) if isinstance(limit, int) else None,
    )
