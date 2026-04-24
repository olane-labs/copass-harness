/**
 * Provider-neutral agent event types — mirrors `copass_core_agents.events`
 * on the Python side so consumers get the same shape regardless of SDK.
 */

export type AgentEventType =
  | 'text'
  | 'tool_call'
  | 'tool_result'
  | 'finish'
  | 'error';

export interface AgentTextDelta {
  type: 'text';
  text: string;
}

export interface AgentToolCall {
  type: 'tool_call';
  call_id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AgentToolResult {
  type: 'tool_result';
  call_id: string;
  name: string;
  result: Record<string, unknown>;
  error?: string | null;
}

/**
 * Per-tier cost decomposition for one agent run. Every field is an
 * integer number of USD microcents (1e-6 USD). ``total`` is the sum of
 * the tiers — NOT a round of the sum — so a sub-microcent tier
 * (e.g. a handful of cache-read tokens on Haiku) isn't silently hidden
 * inside a blended figure.
 *
 * Mirrors ``frame_graph.agents.pricing.CostBreakdown`` on the Python
 * side. When a new tier is added there, add it here too.
 */
export interface CostBreakdownMicrocents {
  /** Non-cached prompt tokens × model input rate. */
  input: number;
  /** Completion tokens × model output rate. */
  output: number;
  /** Cache-hit input tokens × cache-read rate (Anthropic ≈ 0.1× input). */
  cache_read: number;
  /** 5-minute cache-write tokens × cache-creation rate (Anthropic ≈ 1.25× input). */
  cache_creation: number;
  /** Extended-thinking / thoughts tokens × output rate. */
  thinking: number;
  /** Session-runtime wall-clock × hourly compute rate (Anthropic Agent SDK). */
  compute: number;
  /** Sum of tiers; matches the ledger ``deduction`` amount. */
  total: number;
}

/**
 * ``AgentFinish.usage`` is provider-neutral. Token counts come from the
 * backend (Anthropic ``input_tokens`` / ``output_tokens`` / ``cache_*``;
 * Google ``input_tokens`` / ``output_tokens`` / ``thinking_tokens``).
 * ``cost_microcents`` and ``cost_breakdown_microcents`` are attached by
 * the server at the finish boundary — same number the ledger deducts.
 */
export interface AgentUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  thinking_tokens?: number;
  /** Integer total cost in microcents for this run. */
  cost_microcents?: number;
  /** Per-tier decomposition of ``cost_microcents``. */
  cost_breakdown_microcents?: CostBreakdownMicrocents;
  /** Forward-compat escape hatch — unknown provider keys are preserved. */
  [key: string]: unknown;
}

export interface AgentFinish {
  type: 'finish';
  stop_reason: string;
  /** Provider-managed conversation handle. Pass back to continue. */
  session_id?: string | null;
  usage: AgentUsage;
}

export interface AgentErrorEvent {
  type: 'error';
  message: string;
  errorType: string;
}

export type AgentEvent =
  | AgentTextDelta
  | AgentToolCall
  | AgentToolResult
  | AgentFinish
  | AgentErrorEvent;
