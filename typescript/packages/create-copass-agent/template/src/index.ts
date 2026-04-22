import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import type { ContextWindow } from '@copass/core';
import { chatStream } from './agent.js';
import { CHAT_UI } from './chat-ui.js';
import { attachThread, createThread } from './copass.js';
import { TEST_MODES, runTestModeStream } from './test-modes.js';

/**
 * In-memory thread state. Two maps keyed by Copass `dataSourceId`
 * (which the client sees as `threadId`):
 *
 * - `threadWindows` — the live `ContextWindow` for each thread. The server
 *   calls `window.addTurn()` before + after each agent run, so its local
 *   buffer is the authoritative turn log that gets serialized into the MCP
 *   subprocess. This is what closes the cross-turn window-awareness gap
 *   that subprocess-per-turn otherwise creates.
 *
 * - `threadSessions` — Claude Agent SDK session id for `resume`, so Claude's
 *   own chat history carries across turns.
 *
 * Scaffold only — persist both in Redis / your DB / a file for production.
 */
const threadWindows = new Map<string, ContextWindow>();
const threadSessions = new Map<string, string>();

async function getOrCreateWindow(threadId?: string): Promise<ContextWindow> {
  if (threadId) {
    const existing = threadWindows.get(threadId);
    if (existing) return existing;
    const attached = await attachThread(threadId);
    threadWindows.set(threadId, attached);
    return attached;
  }
  const fresh = await createThread();
  threadWindows.set(fresh.dataSourceId, fresh);
  return fresh;
}

const ChatRequest = z.object({
  message: z.string().min(1),
  threadId: z.string().optional(),
  /**
   * Optional preset mode. When omitted, the default Agent-SDK + MCP flow
   * runs. When set, the server bypasses the agent and calls the retrieval
   * API directly so each UI selection maps 1:1 to a specific shape.
   */
  preset: z.enum(TEST_MODES).optional(),
});

const app = new Hono();

app.get('/', (c) => c.html(CHAT_UI));

app.post('/chat', async (c) => {
  let body: z.infer<typeof ChatRequest>;
  try {
    body = ChatRequest.parse(await c.req.json());
  } catch (err) {
    return c.json({ error: 'Invalid request body', detail: String(err) }, 400);
  }

  // Resolve the window synchronously — if this throws, the client gets a
  // plain JSON error instead of a malformed SSE stream.
  let window: ContextWindow;
  try {
    window = await getOrCreateWindow(body.threadId);
    await window.addTurn({ role: 'user', content: body.message });
  } catch (err) {
    console.error(err);
    return c.json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }

  return streamSSE(c, async (stream) => {
    // `meta` frame first so the client can persist threadId immediately
    // and show it in the UI before any retrieval latency accrues.
    await stream.writeSSE({
      event: 'meta',
      data: JSON.stringify({ threadId: window.dataSourceId }),
    });

    const events = body.preset
      ? runTestModeStream(body.preset, body.message, window)
      : chatStream({
          message: body.message,
          window,
          resumeSessionId: threadSessions.get(window.dataSourceId),
        });

    const textChunks: string[] = [];
    let sessionId: string | undefined;

    try {
      for await (const ev of events) {
        switch (ev.type) {
          case 'tool-call':
            await stream.writeSSE({
              event: 'tool-call',
              data: JSON.stringify({ id: ev.id, name: ev.name, input: ev.input }),
            });
            break;
          case 'tool-result':
            await stream.writeSSE({
              event: 'tool-result',
              data: JSON.stringify({ id: ev.id, name: ev.name, output: ev.output }),
            });
            break;
          case 'text':
            textChunks.push(ev.delta);
            await stream.writeSSE({
              event: 'text',
              data: JSON.stringify({ delta: ev.delta }),
            });
            break;
          case 'final':
            sessionId = ev.sessionId;
            break;
        }
      }

      const answer = textChunks.join('');
      await window.addTurn({ role: 'assistant', content: answer });
      if (sessionId) threadSessions.set(window.dataSourceId, sessionId);

      await stream.writeSSE({ event: 'done', data: '{}' });
    } catch (err) {
      console.error(err);
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({
          error: err instanceof Error ? err.message : String(err),
        }),
      });
    }
  });
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port });
console.log(`copass-agent listening on http://localhost:${port}`);
