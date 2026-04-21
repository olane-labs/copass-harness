import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { CopassClient, SearchPreset, WindowLike } from '@copass/core';

export interface CopassToolsOptions {
  /** An authenticated `@copass/core` client. */
  client: CopassClient;
  /** Sandbox all retrieval runs against. */
  sandbox_id: string;
  /** Optional project scoping for retrieval calls. */
  project_id?: string;
  /**
   * Optional conversation window — a {@link WindowLike} (typically a
   * `ContextWindow` from `client.contextWindow.create()`). When provided,
   * every retrieval call is automatically window-aware.
   */
  window?: WindowLike;
  /**
   * Preset for `interpret` and `search` (ignored by `discover`).
   * Defaults to `"fast"`.
   */
  preset?: SearchPreset;
}

/**
 * Return Copass retrieval as a set of Mastra tool objects (built with
 * `createTool` from `@mastra/core/tools`).
 *
 * Agent-framework-neutral shape: the LLM chooses whether to surface a menu
 * (`discover`), drill into specific items (`interpret`), or get a
 * synthesized answer in one shot (`search`).
 *
 * @example
 * ```ts
 * import { Agent } from '@mastra/core/agent';
 * import { anthropic } from '@ai-sdk/anthropic';
 * import { copassTools } from '@copass/mastra';
 *
 * const window = await copass.contextWindow.create({ sandbox_id });
 * const tools = copassTools({ client: copass, sandbox_id, window });
 *
 * const agent = new Agent({
 *   name: 'support-bot',
 *   instructions: 'Answer questions using the knowledge graph.',
 *   model: anthropic('claude-opus-4-7'),
 *   tools,
 * });
 *
 * const response = await agent.generate('why is checkout flaky?');
 * ```
 */
export function copassTools(options: CopassToolsOptions) {
  const { client, sandbox_id, project_id, window, preset = 'fast' } = options;

  const discover = createTool({
    id: 'discover',
    description:
      'Return a ranked menu of context items relevant to a query. Each item is a ' +
      'pointer (canonical_ids + short summary), not prose. Cheap and fast — use it ' +
      'FIRST to see what the knowledge graph has before committing to a heavier call. ' +
      "Pass an item's canonical_ids tuple to `interpret` to drill in.",
    inputSchema: z.object({
      query: z.string().describe('Natural-language query to surface relevant context for.'),
    }),
    execute: async ({ context }) => {
      const response = await client.retrieval.discover(sandbox_id, {
        query: context.query,
        project_id,
        window,
      });
      return {
        header: response.header,
        items: response.items.map((item) => ({
          score: item.score,
          summary: item.summary,
          canonical_ids: item.canonical_ids,
        })),
        next_steps: response.next_steps,
      };
    },
  });

  const interpret = createTool({
    id: 'interpret',
    description:
      'Return a 1–2 paragraph synthesized brief pinned to specific items picked from ' +
      '`discover`. Pass one or more `canonical_ids` tuples (one per item you want to ' +
      'include). Use this AFTER `discover` when you know which items matter.',
    inputSchema: z.object({
      query: z.string().describe('The question the brief should answer.'),
      items: z
        .array(z.array(z.string()))
        .min(1)
        .describe(
          'List of canonical_ids tuples — each tuple is the `canonical_ids` field ' +
            'from one discover item. Pass several to synthesize across items.',
        ),
    }),
    execute: async ({ context }) => {
      const response = await client.retrieval.interpret(sandbox_id, {
        query: context.query,
        items: context.items,
        project_id,
        window,
        preset,
      });
      return { brief: response.brief };
    },
  });

  const search = createTool({
    id: 'search',
    description:
      'Return a full synthesized natural-language answer in one call. Use for ' +
      'self-contained questions that do NOT benefit from a staged discover→interpret flow. ' +
      'Heaviest of the three tools.',
    inputSchema: z.object({
      query: z.string().describe('The question to answer.'),
    }),
    execute: async ({ context }) => {
      const response = await client.retrieval.search(sandbox_id, {
        query: context.query,
        project_id,
        window,
        preset,
      });
      return { answer: response.answer };
    },
  });

  return { discover, interpret, search };
}
