#!/usr/bin/env node
import { CopassClient } from '@copass/core';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { buildServer } from './server.js';

async function main(): Promise<void> {
  const config = loadConfig();

  const client = new CopassClient({
    apiUrl: config.api_url,
    auth: config.api_key.startsWith('olk_')
      ? { type: 'api-key', key: config.api_key }
      : { type: 'bearer', token: config.api_key },
  });

  const server = buildServer({ client, config });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log once to stderr so MCP clients see confirmation without polluting stdio.
  // stdio is reserved for the JSON-RPC stream.
  process.stderr.write(
    `copass-mcp: started (sandbox=${config.sandbox_id}, preset=${config.preset})\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`copass-mcp: fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
