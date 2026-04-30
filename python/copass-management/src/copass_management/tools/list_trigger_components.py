from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def list_trigger_components(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    app = input.get("app")
    q = input.get("q")
    limit = input.get("limit")
    return await ctx.client.agents.list_trigger_components(
        ctx.sandbox_id,
        app=app if isinstance(app, str) else None,
        q=q if isinstance(q, str) else None,
        limit=int(limit) if isinstance(limit, int) else None,
    )
