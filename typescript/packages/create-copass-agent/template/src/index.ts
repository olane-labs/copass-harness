import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { z } from 'zod';
import { chat } from './agent.js';
import { CHAT_UI } from './chat-ui.js';
import { createThread } from './copass.js';

/**
 * In-memory map: Copass `dataSourceId` (the Context Window id) → Agent SDK
 * `sessionId`. The client sees the `dataSourceId` as `threadId`; we look up
 * the matching `sessionId` to resume the agent's chat history.
 *
 * Scaffold only — persist this in Redis / your DB / a file in production.
 */
const threadSessions = new Map<string, string>();

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
    let threadId = body.threadId;
    let resumeSessionId: string | undefined;

    if (!threadId) {
      const thread = await createThread();
      threadId = thread.dataSourceId;
    } else {
      resumeSessionId = threadSessions.get(threadId);
    }

    const { answer, sessionId } = await chat({
      message: body.message,
      dataSourceId: threadId,
      resumeSessionId,
    });

    if (sessionId) threadSessions.set(threadId, sessionId);

    return c.json({ threadId, answer });
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
