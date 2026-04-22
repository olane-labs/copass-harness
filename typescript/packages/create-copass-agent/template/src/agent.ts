import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import { COPASS_AGENT_MCP_SYSTEM_PROMPT } from '@copass/config';
import type { ContextWindow } from '@copass/core';

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

export interface ChatResult {
  answer: string;
  sessionId: string;
}

/**
 * Run one turn of the agent loop.
 *
 * Spawns `@copass/mcp` as a stdio MCP subprocess with:
 * - `COPASS_CONTEXT_WINDOW_ID`: the thread's data_source_id so the subprocess
 *   attaches to the right window
 * - `COPASS_CONTEXT_WINDOW_INITIAL_TURNS`: JSON-serialized recent turns so
 *   retrieval is window-aware from the very first tool call (subprocesses
 *   are ephemeral; without this, the local buffer would reset every spawn)
 *
 * On subsequent turns, pass `resumeSessionId` so the Agent SDK restores the
 * conversation and Claude sees its own prior replies in context.
 */
export async function chat(args: ChatArgs): Promise<ChatResult> {
  const { message, window, resumeSessionId } = args;

  // The Hono server calls window.addTurn before + after this function, so
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
  const chunks: string[] = [];

  for await (const msg of query({ prompt: message, options })) {
    if (msg.type === 'system') {
      const sys = msg as typeof msg & { session_id?: string };
      if (sys.session_id) sessionId = sys.session_id;
    } else if (msg.type === 'assistant') {
      for (const block of msg.message.content) {
        if (block.type === 'text') chunks.push(block.text);
      }
    } else if (msg.type === 'result') {
      const result = msg as typeof msg & { session_id?: string };
      if (result.session_id) sessionId = result.session_id;
    }
  }

  return { answer: chunks.join(''), sessionId };
}
