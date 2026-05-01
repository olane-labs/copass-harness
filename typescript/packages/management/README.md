# @copass/management

Spec-driven management tool registrar for Copass agents.

This package consumes the `copass/spec/management/v1/` JSON
Schema corpus and exposes a transport-agnostic registrar that wires
each tool through `@copass/core`. An optional MCP adapter lives at
`@copass/management/adapters/mcp` for Model Context Protocol consumers.

Phase 1 ships the **read-only subset** (14 tools). Write tools follow
in Phase 2.

## Usage

```ts
import { CopassClient } from '@copass/core';
import { registerToMcpServer } from '@copass/management/adapters/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const client = new CopassClient({
  auth: { type: 'api-key', key: process.env.COPASS_API_KEY! },
});

const server = new McpServer({ name: 'my-mcp', version: '0.1.0' });
registerToMcpServer(server, client, { sandboxId: 'sb_...' });
```

For non-MCP transports, call `registerManagementTools` directly with
your own `register(...)` callable.

## Spec source

The package bundles a copy of the JSON Schema corpus under
`dist/specs/v1/`. In dev, set `COPASS_MANAGEMENT_SPEC_DIR` to point at
the source tree.
