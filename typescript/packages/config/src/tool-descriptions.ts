/**
 * Tool descriptions presented to the LLM.
 *
 * These are the single source of truth. Every Copass adapter
 * (`@copass/ai-sdk`, `@copass/langchain`, `@copass/mastra`, `@copass/mcp`,
 * and the Python `copass-pydantic-ai` package) imports or mirrors these
 * exact strings so the LLM sees identical tool semantics regardless of the
 * agent framework wrapping.
 *
 * Edit here, rebuild all adapters, and every downstream sees the change.
 */

/**
 * Description for the `discover` retrieval tool.
 *
 * Leads with what the tool does, then emphasises the window-awareness /
 * fresh-signal property that makes repeated calls cheap and productive.
 * LLMs reading this should understand: call `discover` any time more
 * context is needed, not just as the first step.
 */
export const DISCOVER_DESCRIPTION = [
  'Return a ranked menu of context items relevant to a query. Each item is a',
  'pointer (canonical_ids + short summary), not prose.',
  '',
  'Window-aware by construction: results automatically exclude items already',
  'surfaced earlier in this conversation, so every call returns genuinely NEW',
  'signal — never duplicates. This makes `discover` the primary context-',
  'engineering primitive: call it freely whenever you need more context. Repeated',
  'calls progressively map the relevant slice of the knowledge graph, and because',
  "results skip what's already been seen, you never waste tokens re-consuming",
  'known material.',
  '',
  "After calling, pass an item's canonical_ids tuple to `interpret` for a deeper",
  'brief, or call `discover` again for more items.',
].join('\n');

/**
 * MCP-specific variant of {@link DISCOVER_DESCRIPTION}.
 *
 * Identical content plus one clarifying clause about how the server's
 * Context Window is bound — MCP consumers don't construct a
 * `ContextWindow` object themselves, they inherit one via
 * `COPASS_CONTEXT_WINDOW_ID` env var or the `context_window_create` tool.
 */
export const MCP_DISCOVER_DESCRIPTION = [
  'Return a ranked menu of context items relevant to a query. Each item is a',
  'pointer (canonical_ids + short summary), not prose.',
  '',
  'Window-aware by construction: when a Context Window is active (pre-attached via',
  'COPASS_CONTEXT_WINDOW_ID or created via `context_window_create`), results',
  'automatically exclude items already surfaced earlier in this conversation.',
  'Every call returns genuinely NEW signal — never duplicates.',
  '',
  'This makes `discover` the primary context-engineering primitive: call it',
  'freely whenever you need more context. Repeated calls progressively map the',
  "relevant slice of the knowledge graph, and because results skip what's",
  'already been seen, you never waste tokens re-consuming known material.',
  '',
  "After calling, pass an item's canonical_ids tuple to `interpret` for a deeper",
  'brief, or call `discover` again for more items.',
].join('\n');

/** Description for the `interpret` retrieval tool. */
export const INTERPRET_DESCRIPTION = [
  'Return a 1–2 paragraph synthesized brief pinned to specific items picked from',
  '`discover`. Pass one or more canonical_ids tuples (one per item you want to',
  'include). Use this AFTER `discover` when you know which items matter.',
].join('\n');

/** Description for the `search` retrieval tool. */
export const SEARCH_DESCRIPTION = [
  'Return a full synthesized natural-language answer in one call. Use for',
  'self-contained questions that do NOT benefit from a staged discover→interpret flow.',
  'Heaviest of the three tools.',
].join('\n');
