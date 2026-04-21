# copass-agent

A Copass-backed agent scaffold — Hono server + Vercel AI SDK + Claude, with a
Context Window per conversation so retrieval is automatically window-aware.

## Setup

```bash
cp .env.example .env   # fill in COPASS_API_KEY, COPASS_SANDBOX_ID, ANTHROPIC_API_KEY
pnpm install           # or npm install
pnpm dev               # starts on http://localhost:3000
```

## Try it

```bash
# Turn 1 — no threadId
curl -s -X POST http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"why is checkout flaky?"}'
```

The response includes a `threadId`. Pass it on subsequent turns to continue
the conversation — retrieval is automatically window-aware and won't
re-surface items the agent has already seen:

```bash
curl -s -X POST http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"and the payment retry policy?","threadId":"<from last response>"}'
```

## Structure

- `src/index.ts` — Hono server with `POST /chat`.
- `src/agent.ts` — system prompt + `generateText` loop with Copass tools wired in.
- `src/copass.ts` — `CopassClient` singleton + Context Window helpers.

The agent's tools come from `@copass/ai-sdk`:

- `discover` — ranked menu of relevant context
- `interpret` — brief pinned to picked items
- `search` — synthesized answer

The LLM chooses which tool to call on each turn. All three run
window-aware automatically thanks to the `ContextWindow` threaded through
them.

## Deploy

Runs on any Node 18+ host. Hono also supports Cloudflare Workers, Vercel
Edge, and Deno with minimal changes — swap `@hono/node-server` for the
edge adapter of your choice.
