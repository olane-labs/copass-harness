from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def list_agent_tools(ctx: "ToolContext", _input: Dict[str, Any]) -> Any:
    return await ctx.client.agents.list_tools(ctx.sandbox_id)
