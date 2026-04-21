import { query, type Options } from '@anthropic-ai/claude-agent-sdk';

const SYSTEM_PROMPT = `You are a knowledgeable assistant grounded in the user's Copass knowledge graph.

For every user turn:
1. Start with \`mcp__copass__discover\` to see what's relevant. Cheap and fast.
2. If specific items look valuable, call \`mcp__copass__interpret\` on their canonical_ids tuples for a brief.
3. If the question is broad and self-contained, prefer \`mcp__copass__search\` for a direct synthesized answer.
4. Record user questions with \`mcp__copass__context_window_add_turn\` ({role: "user", content: ...}) and your replies with ({role: "assistant", content: ...}) — this keeps retrieval window-aware across turns.

Keep answers concise. Cite canonical_ids where it helps the user verify.`;

export interface ChatArgs {
  message: string;
  /** The Copass Context Window data_source_id for this thread. */
  dataSourceId: string;
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
 * Spawns `@copass/mcp` as a stdio MCP subprocess with the Context Window
 * pre-attached (via `COPASS_CONTEXT_WINDOW_ID`). Claude sees the full
 * `discover` / `interpret` / `search` / `context_window_*` / `ingest` tool
 * surface and chooses which to call on each step.
 *
 * On subsequent turns, pass `resumeSessionId` to resume the Agent SDK's
 * persisted conversation so Claude sees the full chat history.
 */
export async function chat(args: ChatArgs): Promise<ChatResult> {
  const { message, dataSourceId, resumeSessionId } = args;

  const env: Record<string, string> = {
    COPASS_API_KEY: process.env.COPASS_API_KEY ?? '',
    COPASS_SANDBOX_ID: process.env.COPASS_SANDBOX_ID ?? '',
    COPASS_CONTEXT_WINDOW_ID: dataSourceId,
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
