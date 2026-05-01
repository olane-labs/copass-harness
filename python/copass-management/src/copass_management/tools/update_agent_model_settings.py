from __future__ import annotations

from typing import Any, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from copass_management.registrar import ToolContext


async def update_agent_model_settings(
    ctx: "ToolContext", input: Dict[str, Any],
) -> Any:
    slug = str(input["slug"])
    kwargs: Dict[str, Any] = {}
    if "backend" in input and input["backend"] is not None:
        kwargs["backend"] = str(input["backend"])
    if "model" in input and input["model"] is not None:
        kwargs["model"] = str(input["model"])
    if "temperature" in input and input["temperature"] is not None:
        kwargs["temperature"] = float(input["temperature"])
    if "max_tokens" in input and input["max_tokens"] is not None:
        kwargs["max_tokens"] = int(input["max_tokens"])
    if "max_turns" in input and input["max_turns"] is not None:
        kwargs["max_turns"] = int(input["max_turns"])
    if "timeout_s" in input and input["timeout_s"] is not None:
        kwargs["timeout_s"] = int(input["timeout_s"])
    agent = await ctx.client.agents.update_model_settings(
        ctx.sandbox_id, slug, **kwargs,
    )
    return {"agent": agent}
