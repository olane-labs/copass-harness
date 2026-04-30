from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def list_agents(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    status = input.get("status")
    return await ctx.client.agents.list(
        ctx.sandbox_id,
        status=status if status in ("active", "archived") else None,
    )
