"""Optional MCP adapter.

The Python ``mcp`` package is the only dependency this module imports
— guarded behind a runtime check so the rest of ``copass-management``
stays MCP-agnostic. Backend Phase 3 reuses ``register_management_tools``
without pulling MCP.
"""

from __future__ import annotations

import json
from typing import Any, List, TYPE_CHECKING

from copass_core import CopassClient

from copass_management.registrar import (
    RegistrarOptions,
    ToolRegistration,
    register_management_tools,
)

if TYPE_CHECKING:
    # Avoid a hard import — MCP is optional.
    from mcp.server.fastmcp import FastMCP


def register_to_mcp_server(
    server: "FastMCP",
    client: CopassClient,
    options: RegistrarOptions,
) -> List[ToolRegistration]:
    """Wire every read-tool registration onto an MCP server.

    Uses ``server.add_tool(...)`` from the ``mcp`` Python package, which
    must be installed separately. The MCP SDK is the only dependency
    this adapter takes — the underlying registrar stays
    transport-agnostic so backend Phase 3 can reuse it without the SDK.
    """

    def _register(registration: ToolRegistration) -> None:
        async def _handler(**kwargs: Any) -> str:
            result = await registration.handler(kwargs)
            if isinstance(result, str):
                return result
            return json.dumps(result, default=str)

        # Stash the spec on the function so introspection tools can find it.
        _handler.__name__ = registration.name
        _handler.__doc__ = registration.description

        server.add_tool(
            _handler,
            name=registration.name,
            description=registration.description,
        )

    return register_management_tools(_register, client, options)


__all__ = ["register_to_mcp_server"]
