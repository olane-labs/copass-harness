from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def start_integration_connect(
    ctx: "ToolContext", input: Dict[str, Any],
) -> Any:
    app_slug = str(input["app_slug"])
    kwargs: Dict[str, Any] = {
        "success_redirect_uri": str(input.get("success_redirect_uri") or ""),
        "error_redirect_uri": str(input.get("error_redirect_uri") or ""),
    }
    if input.get("webhook_uri") is not None:
        kwargs["webhook_uri"] = str(input["webhook_uri"])
    return await ctx.client.integrations.connect(
        ctx.sandbox_id, app_slug, **kwargs,
    )
