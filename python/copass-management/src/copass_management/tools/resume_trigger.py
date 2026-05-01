from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def resume_trigger(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    trigger_id = str(input["trigger_id"])
    trigger = await ctx.client.agents.triggers.update_by_id(
        ctx.sandbox_id, trigger_id, status="active",
    )
    return {"trigger": trigger}
