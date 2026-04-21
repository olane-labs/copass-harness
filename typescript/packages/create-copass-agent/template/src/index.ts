import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { z } from 'zod';
import { chat } from './agent.js';
import { getWindow } from './copass.js';

const ChatRequest = z.object({
  message: z.string().min(1),
  threadId: z.string().optional(),
});

const app = new Hono();

app.get('/', (c) =>
  c.text('copass-agent: POST /chat with { message: string, threadId?: string }'),
);

app.post('/chat', async (c) => {
  let body: z.infer<typeof ChatRequest>;
  try {
    body = ChatRequest.parse(await c.req.json());
  } catch (err) {
    return c.json({ error: 'Invalid request body', detail: String(err) }, 400);
  }

  try {
    const window = await getWindow(body.threadId);
    const answer = await chat({ message: body.message, window });
    return c.json({
      threadId: window.dataSourceId,
      answer,
    });
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
