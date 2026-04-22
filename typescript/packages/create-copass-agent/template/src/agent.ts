import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import { COPASS_AGENT_MCP_SYSTEM_PROMPT } from '@copass/config';
import type { ContextWindow } from '@copass/core';
import type { StreamEvent } from './stream-events.js';

// Canonical prompt — shared across every Copass adapter via @copass/config.
// To customise for your app, import and extend:
//   const SYSTEM_PROMPT = COPASS_AGENT_MCP_SYSTEM_PROMPT + '\n\nYou always respond in French.';
const SYSTEM_PROMPT = COPASS_AGENT_MCP_SYSTEM_PROMPT;

/** Cap on turns serialized into the MCP subprocess env var to keep env size reasonable. */
const MAX_INITIAL_TURNS = 50;

export interface ChatArgs {
  message: string;
  /** The Context Window for this conversation thread. */
  window: ContextWindow;
  /** Agent SDK session id to resume, if any. Empty on first turn. */
  resumeSessionId?: string;
}

/**
 * Run one turn of the agent loop and stream each text / tool event.
 *
 * Spawns `@copass/mcp` as a stdio MCP subprocess with the context-window
 * env wiring (see `COPASS_CONTEXT_WINDOW_*`) so retrieval is window-aware
 * from the very first tool call.
 *
 * The generator yields `tool-call` + `tool-result` pairs as the agent
 * invokes MCP tools and assistant `text` blocks as they arrive, then a
 * final `final` event carrying the Agent SDK session id. Callers can
 * accumulate text + forward events downstream (e.g. to an SSE stream).
 */
export async function* chatStream(args: ChatArgs): AsyncGenerator<StreamEvent> {
  const { message, window, resumeSessionId } = args;

  // The Hono server calls window.addTurn before invoking us, so
  // window.getTurns() already includes the just-arrived user message.
  const recentTurns = window.getTurns().slice(-MAX_INITIAL_TURNS);

  const env: Record<string, string> = {
    COPASS_API_KEY: process.env.COPASS_API_KEY ?? '',
    COPASS_SANDBOX_ID: process.env.COPASS_SANDBOX_ID ?? '',
    COPASS_CONTEXT_WINDOW_ID: window.dataSourceId,
    COPASS_CONTEXT_WINDOW_INITIAL_TURNS: JSON.stringify(recentTurns),
  };
  if (process.env.COPASS_API_URL) env.COPASS_API_URL = process.env.COPASS_API_URL;
  if (process.env.COPASS_PROJECT_ID) env.COPASS_PROJECT_ID = process.env.COPASS_PROJECT_ID;

  const options: Options = {
    model: 'claude-opus-4-7',
    systemPrompt: SYSTEM_PROMPT,
    // Remove all built-in tools (Read/Write/Bash/etc.) — this agent is
    // Copass-scoped. Re-enable selectively if your agent needs them.
    tools: [],
    allowedTools: ['mcp__copass__*'],
    maxTurns: 10,
    mcpServers: {
      copass: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@copass/mcp'],
        env,
      },
    },
  };

  if (resumeSessionId) {
    (options as Options & { resume?: string }).resume = resumeSessionId;
  }

  let sessionId = resumeSessionId ?? '';
  // Remember tool names by id so `tool-result` events can surface them in
  // the UI (the Agent SDK's `tool_result` blocks only carry `tool_use_id`).
  const toolNames = new Map<string, string>();

  for await (const msg of query({ prompt: message, options })) {
    if (msg.type === 'system') {
      const sys = msg as typeof msg & { session_id?: string };
      if (sys.session_id) sessionId = sys.session_id;
    } else if (msg.type === 'assistant') {
      for (const block of msg.message.content) {
        if (block.type === 'text') {
          yield { type: 'text', delta: block.text };
        } else if (block.type === 'tool_use') {
          toolNames.set(block.id, block.name);
          yield {
            type: 'tool-call',
            id: block.id,
            name: block.name,
            input: block.input,
          };
        }
      }
    } else if (msg.type === 'user') {
      const content = (msg.message as { content?: unknown }).content;
      if (!Array.isArray(content)) continue;
      for (const block of content as Array<{ type?: string; tool_use_id?: string; content?: unknown }>) {
        if (block.type === 'tool_result' && block.tool_use_id) {
          yield {
            type: 'tool-result',
            id: block.tool_use_id,
            name: toolNames.get(block.tool_use_id) ?? '',
            output: block.content,
          };
        }
      }
    } else if (msg.type === 'result') {
      const result = msg as typeof msg & { session_id?: string };
      if (result.session_id) sessionId = result.session_id;
    }
  }

  yield { type: 'final', sessionId };
}
