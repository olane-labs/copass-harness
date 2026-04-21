import { z } from 'zod';
import type { CopassClient } from '@copass/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ServerConfig } from '../config.js';
import type { WindowRegistry } from '../windows.js';

interface RetrievalDeps {
  client: CopassClient;
  config: ServerConfig;
  windows: WindowRegistry;
}

function mcpResult(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

function mcpError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true,
  };
}

export function registerRetrievalTools(server: McpServer, deps: RetrievalDeps): void {
  const { client, config, windows } = deps;

  server.registerTool(
    'discover',
    {
      description:
        'Return a ranked menu of context items relevant to a query. Each item is a ' +
        'pointer (canonical_ids + short summary), not prose. Cheap and fast — use it ' +
        'FIRST to see what the knowledge graph has before committing to a heavier call. ' +
        "Pass an item's canonical_ids tuple to `interpret` to drill in. Automatically " +
        'window-aware when a Context Window is active (see `context_window_create`).',
      inputSchema: {
        query: z.string().describe('Natural-language query to surface relevant context for.'),
        project_id: z.string().optional().describe('Override the server default project_id.'),
      },
    },
    async ({ query, project_id }) => {
      try {
        const response = await client.retrieval.discover(config.sandbox_id, {
          query,
          project_id: project_id ?? config.project_id,
          window: windows.resolve(),
        });
        return mcpResult({
          header: response.header,
          items: response.items.map((item) => ({
            score: item.score,
            summary: item.summary,
            canonical_ids: item.canonical_ids,
          })),
          next_steps: response.next_steps,
        });
      } catch (e) {
        return mcpError(e);
      }
    },
  );

  server.registerTool(
    'interpret',
    {
      description:
        'Return a 1–2 paragraph synthesized brief pinned to specific items picked from ' +
        '`discover`. Pass one or more canonical_ids tuples (one per item you want to ' +
        'include). Use this AFTER `discover` when you know which items matter.',
      inputSchema: {
        query: z.string().describe('The question the brief should answer.'),
        items: z
          .array(z.array(z.string()).min(1))
          .min(1)
          .describe(
            'List of canonical_ids tuples — each tuple is the `canonical_ids` field ' +
              'from one discover item. Pass several to synthesize across items.',
          ),
        preset: z
          .enum(['fast', 'auto', 'max'])
          .optional()
          .describe('Override the server default preset.'),
        project_id: z.string().optional().describe('Override the server default project_id.'),
      },
    },
    async ({ query, items, preset, project_id }) => {
      try {
        const response = await client.retrieval.interpret(config.sandbox_id, {
          query,
          items,
          project_id: project_id ?? config.project_id,
          window: windows.resolve(),
          preset: preset ?? config.preset,
        });
        return mcpResult({ brief: response.brief });
      } catch (e) {
        return mcpError(e);
      }
    },
  );

  server.registerTool(
    'search',
    {
      description:
        'Return a full synthesized natural-language answer in one call. Use for ' +
        'self-contained questions that do NOT benefit from a staged discover→interpret flow. ' +
        'Heaviest of the three tools.',
      inputSchema: {
        query: z.string().describe('The question to answer.'),
        preset: z
          .enum(['fast', 'auto', 'max'])
          .optional()
          .describe('Override the server default preset.'),
        project_id: z.string().optional().describe('Override the server default project_id.'),
      },
    },
    async ({ query, preset, project_id }) => {
      try {
        const response = await client.retrieval.search(config.sandbox_id, {
          query,
          project_id: project_id ?? config.project_id,
          window: windows.resolve(),
          preset: preset ?? config.preset,
        });
        return mcpResult({ answer: response.answer });
      } catch (e) {
        return mcpError(e);
      }
    },
  );
}
