from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def revoke_sandbox_connection(
    ctx: "ToolContext", input: Dict[str, Any],
) -> Any:
    connection_id = str(input["connection_id"])
    return await ctx.client.sandbox_connections.revoke(
        ctx.sandbox_id, connection_id,
    )
