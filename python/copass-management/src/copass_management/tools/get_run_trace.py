from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def get_run_trace(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    return await ctx.client.agents.get_run(ctx.sandbox_id, str(input["run_id"]))
