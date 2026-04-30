from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def list_apps(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    q = input.get("q")
    cursor = input.get("cursor")
    limit = input.get("limit")
    return await ctx.client.integrations.catalog(
        ctx.sandbox_id,
        q=q if isinstance(q, str) else None,
        cursor=cursor if isinstance(cursor, str) else None,
        limit=int(limit) if isinstance(limit, int) else None,
    )
