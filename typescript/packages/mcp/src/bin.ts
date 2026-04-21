#!/usr/bin/env node
import { CopassClient } from '@copass/core';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { buildServer } from './server.js';
import { WindowRegistry } from './windows.js';

async function main(): Promise<void> {
  const config = loadConfig();

  const client = new CopassClient({
    apiUrl: config.api_url,
    auth: config.api_key.startsWith('olk_')
      ? { type: 'api-key', key: config.api_key }
      : { type: 'bearer', token: config.api_key },
  });

  const windows = new WindowRegistry();

  // Pre-attach to a Context Window if the caller passed one via env var.
  // Lets a parent process (e.g. an HTTP server) own window lifecycle and share
  // it across multiple MCP subprocess spawns.
  if (config.context_window_id) {
    try {
      const window = await client.contextWindow.attach({
        sandbox_id: config.sandbox_id,
        data_source_id: config.context_window_id,
      });
      windows.set(window);
      process.stderr.write(
        `copass-mcp: attached to context window ${config.context_window_id}\n`,
      );
    } catch (err) {
      process.stderr.write(
        `copass-mcp: failed to attach to COPASS_CONTEXT_WINDOW_ID=${config.context_window_id}: ${
          err instanceof Error ? err.message : String(err)
        }\n`,
      );
      throw err;
    }
  }

  const server = buildServer({ client, config, windows });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(
    `copass-mcp: started (sandbox=${config.sandbox_id}, preset=${config.preset})\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`copass-mcp: fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
