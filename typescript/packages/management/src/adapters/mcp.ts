import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CopassClient } from '@copass/core';

import {
  registerManagementTools,
  type RegistrarOptions,
  type ToolRegistration,
} from '../registrar.js';

/**
 * Wire every read-tool registration onto an MCP server. The MCP SDK is the
 * only dependency this adapter takes — the underlying registrar stays
 * transport-agnostic so backend Phase 3 can reuse it without pulling MCP.
 */
export function registerToMcpServer(
  server: McpServer,
  client: CopassClient,
  options: RegistrarOptions,
): ToolRegistration[] {
  return registerManagementTools(
    (registration) => {
      // The MCP SDK accepts a Zod schema for `inputSchema`/`outputSchema`.
      // We hand it the compiled Zod from our spec corpus so MCP-side
      // validation matches the conformance contract exactly.
      server.registerTool(
        registration.name,
        {
          description: registration.description,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          inputSchema: registration.inputZod as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          outputSchema: registration.outputZod as any,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (async (rawInput: unknown) => {
          const result = await registration.handler(rawInput);
          const isObjectResult =
            typeof result === 'object' && result !== null;
          return {
            content: [
              {
                type: 'text',
                text:
                  typeof result === 'string'
                    ? result
                    : JSON.stringify(result, null, 2),
              },
            ],
            ...(isObjectResult
              ? { structuredContent: result as Record<string, unknown> }
              : {}),
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any,
      );
    },
    client,
    options,
  );
}
