/**
 * Events emitted by `chatStream` (agent mode) and `runTestModeStream`
 * (preset mode). The Hono server forwards them as SSE frames so the
 * browser UI can render collapsible tool cards + stream assistant text
 * as it arrives.
 */
export type StreamEvent =
  | { type: 'tool-call'; id: string; name: string; input: unknown }
  | { type: 'tool-result'; id: string; name: string; output: unknown }
  | { type: 'text'; delta: string }
  | { type: 'final'; sessionId?: string };
