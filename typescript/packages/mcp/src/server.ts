import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CopassClient } from '@copass/core';
import type { ServerConfig } from './config.js';
import { WindowRegistry } from './windows.js';
import { registerRetrievalTools } from './tools/retrieval.js';
import { registerContextWindowTools } from './tools/context-window.js';
import { registerIngestTool } from './tools/ingest.js';

export interface BuildServerOptions {
  client: CopassClient;
  config: ServerConfig;
}

/**
 * Assemble the Copass MCP server with every tool registered. Doesn't connect
 * a transport — see `startStdioServer` in `./bin.ts` for the default path,
 * or wire your own transport if embedding.
 */
export function buildServer({ client, config }: BuildServerOptions): McpServer {
  const server = new McpServer(
    {
      name: 'copass',
      version: '0.1.0',
    },
    {
      capabilities: { tools: {} },
    },
  );

  const windows = new WindowRegistry();
  const deps = { client, config, windows };

  registerRetrievalTools(server, deps);
  registerContextWindowTools(server, deps);
  registerIngestTool(server, { client, config });

  return server;
}
