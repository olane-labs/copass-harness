from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def list_api_keys(ctx: "ToolContext", _input: Dict[str, Any]) -> Any:
    """Return inventory of user's API keys.

    The core resource exposes a flat list; the spec output is
    ``{"keys": [...], "count": int}``. Server-side filtering by
    ``kinds`` / ``include_revoked`` lands when the API exposes those
    query params; today we surface the inventory and let the caller
    filter post-hoc.
    """
    keys = await ctx.client.api_keys.list()
    return {"keys": keys if isinstance(keys, list) else [], "count": len(keys) if isinstance(keys, list) else 0}
