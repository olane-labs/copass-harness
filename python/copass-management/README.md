# copass-management

Spec-driven management tool registrar for Copass agents (Python).

This package consumes the `copass-harness/spec/management/v1/` JSON
Schema corpus and exposes a transport-agnostic registrar that wires
each tool through `copass-core`. An optional MCP adapter lives at
`copass_management.adapters.mcp` for Model Context Protocol consumers.

Phase 1 ships the **read-only subset** (14 tools). Write tools follow
in Phase 2.

## Usage

```python
from copass_core import ApiKeyAuth, CopassClient
from copass_management import (
    RegistrarOptions,
    register_management_tools,
)

client = CopassClient(auth=ApiKeyAuth(key="olk_..."))

def register(registration):
    print(registration.name, registration.description)

register_management_tools(
    register,
    client,
    RegistrarOptions(sandbox_id="sb_..."),
)
```

For MCP transports, use `register_to_mcp_server` from
`copass_management.adapters.mcp`. The MCP SDK is an optional
dependency installed separately.

## Spec source

The package vendors a copy of the JSON Schema corpus under
`copass_management/_spec/v1/`. In dev, set
`COPASS_MANAGEMENT_SPEC_DIR` to point at the source tree.
