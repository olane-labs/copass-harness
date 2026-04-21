import type { ChatMessage, ChatRole, ContextWindow } from '@copass/core';

/**
 * Minimal shape of a Vercel AI SDK step finish event — typed structurally so
 * this module doesn't lock you to an `ai` major version.
 */
export interface StepFinishLike {
  response?: {
    messages?: Array<{
      role?: string;
      content?: unknown;
    }>;
  };
}

export interface WindowTrackerOptions {
  /** The Context Window to mirror messages into. */
  window: ContextWindow;
  /**
   * Include `tool` messages (results returned by a tool call) as turns.
   * Default: false — tool results are usually retrieval noise.
   */
  includeToolMessages?: boolean;
}

export interface WindowTracker {
  /**
   * Pass to Vercel AI SDK's `generateText` / `streamText` as `onStepFinish`.
   * Each step's assistant + tool output messages land in the window,
   * de-duplicated against what's already there.
   */
  onStepFinish: (step: StepFinishLike) => Promise<void>;
  /**
   * Record the user's turn before you call `generateText`. Vercel's
   * `onStepFinish` only surfaces messages *generated* during a step, so the
   * user's initial input has to be captured explicitly. Safe to call even if
   * the message was already added — the tracker de-duplicates.
   */
  recordUserTurn: (content: string) => Promise<void>;
}

/**
 * Build a window tracker for Vercel AI SDK agent loops.
 *
 * @example
 * ```ts
 * import { copassTools, createWindowTracker } from '@copass/ai-sdk';
 *
 * const tools = copassTools({ client, sandbox_id, window });
 * const tracker = createWindowTracker({ window });
 *
 * await tracker.recordUserTurn(userMessage);
 * const { text } = await generateText({
 *   model,
 *   tools,
 *   onStepFinish: tracker.onStepFinish,
 *   prompt: userMessage,
 *   maxSteps: 5,
 * });
 * ```
 */
export function createWindowTracker(options: WindowTrackerOptions): WindowTracker {
  const { window, includeToolMessages = false } = options;
  const seen = new Set<string>();
  for (const turn of window.getTurns()) {
    seen.add(hashTurn(turn));
  }

  async function addIfNew(turn: ChatMessage): Promise<void> {
    if (!turn.content.trim()) return;
    const key = hashTurn(turn);
    if (seen.has(key)) return;
    seen.add(key);
    try {
      await window.addTurn(turn);
    } catch {
      // Best-effort — missing a turn still lets retrieval see prior ones.
    }
  }

  return {
    async onStepFinish(step) {
      const messages = step.response?.messages ?? [];
      for (const msg of messages) {
        const role = roleFromRole(msg.role, includeToolMessages);
        if (!role) continue;
        await addIfNew({ role, content: contentToString(msg.content) });
      }
    },
    recordUserTurn(content) {
      return addIfNew({ role: 'user', content });
    },
  };
}

function roleFromRole(role: string | undefined, includeToolMessages: boolean): ChatRole | null {
  switch (role) {
    case 'user':
      return 'user';
    case 'assistant':
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
      if (part && typeof part === 'object') {
        const rec = part as Record<string, unknown>;
        if (typeof rec.text === 'string') return rec.text;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function hashTurn(turn: ChatMessage): string {
  return `${turn.role}:${turn.content.slice(0, 500)}`;
}
