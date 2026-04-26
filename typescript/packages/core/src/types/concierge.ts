/**
 * Copass Concierge — request/response + streaming event types.
 *
 * Backs the `/api/v1/storage/sandboxes/{sandbox_id}/concierge/*`
 * endpoints (server-side: `frame_graph/copass_id/api/concierge.py`).
 *
 * The Concierge is a per-user platform agent that exposes the
 * Copass management surface (sandboxes, sources, agents, triggers,
 * runs, Pipedream trigger components) as tools to itself. Read tools
 * are always enabled; mutating tools require sandbox owner/editor
 * role. Destructive operations (archive/destroy/disconnect/delete)
 * are intentionally CLI-only — the Concierge advises the equivalent
 * `copass …` command rather than calling a tool.
 */

// ─── Synchronous /test endpoint ────────────────────────────────────

export interface ConciergeTestRequest {
  /**
   * The user's input for this one-shot turn. Server caps at 4000
   * characters.
   */
  message: string;
}

export interface ConciergeTestResponse {
  /** Persisted run row id — useful for `client.agents.runs(...)`. */
  run_id: string;
  /** Terminal run status: `succeeded` | `failed` | `timeout` | `cancelled`. */
  status: string;
  /** The Concierge's text reply. May be empty on tool-only turns. */
  output_text: string;
  /**
   * Phase-1 stub — always empty on `/test`. Use `/chat` to observe
   * tool calls live as they happen.
   */
  tools_called: string[];
  tokens_in?: number | null;
  tokens_out?: number | null;
  duration_ms?: number | null;
  error_message?: string | null;
}

// ─── Streaming /chat endpoint ──────────────────────────────────────

export interface ConciergeChatRequest {
  /** The user's input for this turn. Server caps at 4000 characters. */
  message: string;
  /**
   * The Anthropic provider session token from the prior turn's
   * `agent_finish` event. Omit / null to start a fresh conversation.
   * Threading this preserves multi-turn context without the SDK
   * having to manage history client-side.
   */
  session_id?: string | null;
}

/**
 * Discriminated union of SSE events emitted by `/concierge/chat`.
 *
 * Frame ordering:
 *   1. `run_started` — exactly once, first frame; carries `run_id`
 *      so the consumer can link the stream to a row in `agent_runs`.
 *   2. Zero or more `agent_text_delta` / `agent_tool_call` /
 *      `agent_tool_result` frames as the model works.
 *   3. Either `agent_finish` (success) or `agent_error` (terminal).
 *
 * Forward-compat: unknown event names are still yielded by the
 * parser; consumers that only `switch` on known events skip them.
 */
export type ConciergeEvent =
  | { event: 'run_started'; data: { run_id: string } }
  | { event: 'agent_text_delta'; data: { text: string } }
  | {
      event: 'agent_tool_call';
      data: { call_id: string; name: string; arguments: Record<string, unknown> };
    }
  | {
      event: 'agent_tool_result';
      data: {
        call_id: string;
        name: string;
        result: unknown;
        error?: string | null;
      };
    }
  | {
      event: 'agent_finish';
      data: {
        stop_reason: string;
        /** Pass back as `ConciergeChatRequest.session_id` to continue the conversation. */
        session_id: string | null;
        usage: Record<string, number>;
        run_id: string | null;
      };
    }
  | {
      event: 'agent_error';
      data: { message: string; type: string; run_id?: string | null };
    };
