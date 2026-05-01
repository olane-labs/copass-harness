from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def grant_sandbox_connection(
    ctx: "ToolContext", input: Dict[str, Any],
) -> Any:
    kwargs: Dict[str, Any] = {"role": str(input["role"])}
    if input.get("copass_id") is not None:
        kwargs["copass_id"] = str(input["copass_id"])
    if input.get("user_id") is not None:
        kwargs["user_id"] = str(input["user_id"])
    if input.get("project_id") is not None:
        kwargs["project_id"] = str(input["project_id"])
    if input.get("label") is not None:
        kwargs["label"] = str(input["label"])
    if input.get("expires_at") is not None:
        kwargs["expires_at"] = str(input["expires_at"])
    return await ctx.client.sandbox_connections.create(
        ctx.sandbox_id, **kwargs,
    )
