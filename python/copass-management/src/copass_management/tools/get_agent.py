from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def get_agent(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    return await ctx.client.agents.retrieve(ctx.sandbox_id, str(input["slug"]))
