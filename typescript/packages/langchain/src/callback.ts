import { BaseCallbackHandler, type BaseCallbackHandlerInput } from '@langchain/core/callbacks/base';
import type { BaseMessage } from '@langchain/core/messages';
import type { ChatMessage, ChatRole, ContextWindow } from '@copass/core';

export interface CopassWindowCallbackOptions extends BaseCallbackHandlerInput {
  /** The Context Window to mirror messages into. */
  window: ContextWindow;
  /**
   * Include LangChain `ToolMessage`s (tool-call results) as turns. Default: false.
   *
   * Tool results tend to be noisy — the underlying graph already has the
   * retrieved content indexed — so they're skipped by default. Enable only if
   * your agent's tool results carry conceptual content you want retrieval to
   * dedupe against.
   */
  includeToolMessages?: boolean;
}

/**
 * LangChain callback that auto-mirrors the chat model's conversation history
 * into a Copass {@link ContextWindow}.
 *
 * Hooks `handleChatModelStart`, which fires before every chat model invocation
 * with the full message history. We walk that history and call
 * {@link ContextWindow.addTurn} for any message we haven't seen — so retrieval
 * tools called inside the same agent step get a window that reflects the
 * actual conversation, not an empty buffer.
 *
 * @example
 * ```ts
 * import { CopassWindowCallback, copassTools } from '@copass/langchain';
 *
 * const tools = copassTools({ client, sandbox_id, window });
 * const agent = createReactAgent({ llm, tools: Object.values(tools) });
 *
 * await agent.invoke(
 *   { messages: [{ role: 'user', content: 'why is checkout flaky?' }] },
 *   { callbacks: [new CopassWindowCallback({ window })] },
 * );
 * ```
 */
export class CopassWindowCallback extends BaseCallbackHandler {
  readonly name = 'copass-window';
  private readonly window: ContextWindow;
  private readonly includeToolMessages: boolean;
  private readonly seen = new Set<string>();

  constructor(options: CopassWindowCallbackOptions) {
    super(options);
    this.window = options.window;
    this.includeToolMessages = options.includeToolMessages ?? false;
    // Seed the dedup set with turns already in the window so we don't re-add.
    for (const turn of options.window.getTurns()) {
      this.seen.add(hashTurn(turn));
    }
  }

  async handleChatModelStart(
    _llm: unknown,
    messages: BaseMessage[][],
  ): Promise<void> {
    // `messages` is `BaseMessage[][]` because chat models support batched calls.
    // Flatten — in agent loops this is always a single conversation.
    for (const msg of messages.flat()) {
      const turn = toTurn(msg, this.includeToolMessages);
      if (!turn) continue;

      const key = hashTurn(turn);
      if (this.seen.has(key)) continue;
      this.seen.add(key);

      // Fire-and-forget — window.addTurn pushes into the graph. We don't block
      // the model call on ingestion latency; we swallow errors because missing
      // a turn is recoverable (retrieval still sees already-added turns).
      this.window.addTurn(turn).catch(() => {
        /* intentionally empty */
      });
    }
  }
}

function toTurn(msg: BaseMessage, includeToolMessages: boolean): ChatMessage | null {
  const role = roleFromMessage(msg, includeToolMessages);
  if (!role) return null;

  const content = contentToString(msg.content);
  if (!content.trim()) return null;

  return { role, content };
}

function roleFromMessage(msg: BaseMessage, includeToolMessages: boolean): ChatRole | null {
  const type = msg.getType();
  switch (type) {
    case 'human':
      return 'user';
    case 'ai':
      return 'assistant';
    case 'system':
      return 'system';
    case 'tool':
      return includeToolMessages ? 'system' : null;
    default:
      return null;
  }
}

function contentToString(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content ?? '');
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && 'text' in (part as Record<string, unknown>)) {
        return String((part as Record<string, unknown>).text ?? '');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function hashTurn(turn: ChatMessage): string {
  // Stable-ish hash: role + first 500 chars of content.
  // Collisions across different long messages starting identically are accepted
  // as benign — worst case, we skip adding one turn.
  return `${turn.role}:${turn.content.slice(0, 500)}`;
}
