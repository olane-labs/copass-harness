from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def list_triggers(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    return await ctx.client.agents.triggers.list(
        ctx.sandbox_id, str(input["agent_slug"])
    )
