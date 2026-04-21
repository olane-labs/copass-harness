import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ContextWindow } from '@copass/core';
import { chat } from './agent.js';
import { CHAT_UI } from './chat-ui.js';
import { attachThread, createThread } from './copass.js';

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
 * On server restart the maps are lost; clients passing a stale `threadId`
 * will fall through to `attachThread` below (window state re-hydrated from
 * whatever turns the caller still has on their side, or empty otherwise).
 */
const threadWindows = new Map<string, ContextWindow>();
const threadSessions = new Map<string, string>();

async function getOrCreateWindow(threadId?: string): Promise<ContextWindow> {
  if (threadId) {
    const existing = threadWindows.get(threadId);
    if (existing) return existing;
    // Cold-start recovery: the server was restarted (or this process never
    // saw this thread). Reattach to the underlying data source; turn buffer
    // starts empty. Turns from the past will live on the server side in
    // the data source chunks but won't feed push-down exclusion until new
    // turns accumulate.
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

  try {
    const window = await getOrCreateWindow(body.threadId);
    const resumeSessionId = threadSessions.get(window.dataSourceId);

    // Record the user turn before invoking the agent. This pushes content
    // into the data source AND updates the window's local buffer so the
    // subprocess spawned inside `chat()` receives it via initial turns.
    await window.addTurn({ role: 'user', content: body.message });

    const { answer, sessionId } = await chat({
      message: body.message,
      window,
      resumeSessionId,
    });

    // Symmetric — record the assistant reply so it shows up in the history
    // passed to the next turn's retrieval.
    await window.addTurn({ role: 'assistant', content: answer });

    if (sessionId) threadSessions.set(window.dataSourceId, sessionId);

    return c.json({ threadId: window.dataSourceId, answer });
  } catch (err) {
    console.error(err);
    return c.json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port });
console.log(`copass-agent listening on http://localhost:${port}`);
