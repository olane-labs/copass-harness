from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def get_source(ctx: "ToolContext", input: Dict[str, Any]) -> Any:
    return await ctx.client.sources.retrieve(
        ctx.sandbox_id,
        str(input["data_source_id"]),
    )
