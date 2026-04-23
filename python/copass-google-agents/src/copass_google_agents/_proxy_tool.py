"""Module-scope definition of the ``copass_dispatch`` proxy tool.

ADK serializes function tools by reference; closures over deploy-time
variables do not round-trip into Agent Engine's remote runtime.
This module defines the tool at module scope and reads its
configuration from environment variables baked into the deployed
engine (``COPASS_API_URL``, ``COPASS_API_KEY``, ``COPASS_DISPATCH_PATH``).

The function's signature and docstring are what ADK exposes to the
model as the tool schema — keep both pedagogical.
"""

from __future__ import annotations

import os
from typing import Any, Dict, Optional


DEFAULT_DISPATCH_PATH = "/api/v1/agents/dispatch"
"""Default path on the Copass service where the proxy POSTs tool
invocations. Overridable at deploy time via ``COPASS_DISPATCH_PATH``."""


async def copass_dispatch(
    tool_name: str,
    arguments: Dict[str, Any],
    tool_context: Optional[Any] = None,
) -> Dict[str, Any]:
    """Route a tool invocation through Copass's server-side resolver.

    ADK Agent Engine bakes tools at deploy time. To preserve the
    runtime ``AgentToolResolver`` plug model, every deployed Copass
    agent carries exactly this one function tool. The model calls
    ``copass_dispatch`` with the logical tool name and arguments;
    the Copass service receives the call, looks the tool up against
    the current user's resolver, executes it, and returns the result.

    Args:
        tool_name: The logical name of the tool to invoke (as
            advertised in the agent's system prompt).
        arguments: JSON-serializable arguments for the tool.
        tool_context: ADK-injected context providing ``user_id`` and
            ``session_id`` when available. ADK populates this
            automatically at invocation time.

    Returns:
        The tool result dict, passed straight from the Copass
        service response body.
    """
    import httpx  # deferred import — keeps cold-start lean

    api_url = os.environ.get("COPASS_API_URL")
    api_key = os.environ.get("COPASS_API_KEY")
    if not api_url or not api_key:
        return {
            "error": (
                "copass_dispatch misconfigured: COPASS_API_URL / "
                "COPASS_API_KEY env vars not set on the deployed agent."
            )
        }
    path = os.environ.get("COPASS_DISPATCH_PATH", DEFAULT_DISPATCH_PATH)

    user_id = None
    session_id = None
    if tool_context is not None:
        user_id = getattr(tool_context, "user_id", None)
        session_id = getattr(tool_context, "session_id", None)

    payload = {
        "tool_name": tool_name,
        "arguments": arguments or {},
        "user_id": user_id,
        "session_id": session_id,
    }
    url = f"{api_url.rstrip('/')}{path}"

    async with httpx.AsyncClient(timeout=60.0) as http:
        resp = await http.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as err:
            return {
                "error": (
                    f"copass_dispatch HTTP {resp.status_code}: {err}"
                ),
                "response_text": resp.text[:1000],
            }
        try:
            return dict(resp.json())
        except ValueError:
            return {"text": resp.text}


__all__ = ["copass_dispatch", "DEFAULT_DISPATCH_PATH"]
