from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def revoke_user_mcp_source(
    ctx: "ToolContext", input: Dict[str, Any],
) -> Any:
    source_id = str(input["data_source_id"])
    return await ctx.client.sources.revoke_user_mcp(ctx.sandbox_id, source_id)
