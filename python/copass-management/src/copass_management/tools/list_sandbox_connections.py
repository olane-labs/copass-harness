from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def list_sandbox_connections(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    return await ctx.client.sandbox_connections.list(
        ctx.sandbox_id,
        include_revoked=bool(input.get("include_revoked")),
    )
