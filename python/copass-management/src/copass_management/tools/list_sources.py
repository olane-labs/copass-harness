from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def list_sources(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    provider = input.get("provider")
    return await ctx.client.sources.list(
        ctx.sandbox_id,
        provider=provider if isinstance(provider, str) else None,
    )
