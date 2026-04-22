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
  /**
   * Optional pre-populated window registry. Useful when a parent process has
   * already created or attached to a Context Window and wants the server to
   * start with it as the active window.
   */
  windows?: WindowRegistry;
}

/**
 * Assemble the Copass MCP server with every tool registered. Doesn't connect
 * a transport — see `startStdioServer` in `./bin.ts` for the default path,
 * or wire your own transport if embedding.
 */
export function buildServer({ client, config, windows }: BuildServerOptions): McpServer {
  const server = new McpServer(
    {
      name: 'copass',
      version: '0.2.0',
    },
    {
      capabilities: { tools: {} },
    },
  );

  const registry = windows ?? new WindowRegistry();
  const deps = { client, config, windows: registry };

  registerRetrievalTools(server, deps);
  registerContextWindowTools(server, deps);
  registerIngestTool(server, { client, config });

  return server;
}
