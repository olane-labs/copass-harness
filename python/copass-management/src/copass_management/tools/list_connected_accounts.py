from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def list_connected_accounts(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    app_slug = input.get("app_slug")
    return await ctx.client.integrations.list_accounts(
        ctx.sandbox_id,
        app_slug=app_slug if isinstance(app_slug, str) else None,
    )
