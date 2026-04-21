# create-copass-agent

**Scaffold a Copass-backed agent in under a minute.** Hono server + Vercel AI SDK + Claude + Context Window, pre-wired and ready to edit.

## Prerequisites

Install the Copass CLI and bootstrap your account:

```bash
npm install -g @copass/cli
copass login       # email OTP
copass setup       # creates a sandbox, writes .olane/refs.json
```

Your credentials land in two files — the scaffolded agent reads them via env vars:

| File | Contains | Goes into `.env` as |
|---|---|---|
| `~/.olane/config.json` | `access_token` | `COPASS_API_KEY` |
| `./.olane/refs.json` | `sandbox_id` | `COPASS_SANDBOX_ID` |

Ingest some content so retrieval has something to return:

```bash
copass ingest path/to/file.md
```

You'll also need an `ANTHROPIC_API_KEY` (from https://console.anthropic.com).

## Usage

```bash
npx create-copass-agent my-agent
cd my-agent
cp .env.example .env   # fill in COPASS_API_KEY, COPASS_SANDBOX_ID, ANTHROPIC_API_KEY
pnpm install
pnpm dev
```

Server listens on `http://localhost:3000`.

## Try it

```bash
# Turn 1 — no threadId
curl -s -X POST http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"what do we know about checkout retry behavior?"}'
# → { "threadId": "ds_...", "answer": "..." }

# Turn 2 — pass the threadId back for window-aware follow-up
curl -s -X POST http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"and the payment retry policy?","threadId":"ds_..."}'
# retrieval now window-aware — won't re-surface items already used
```

The `threadId` is the Context Window's `data_source_id`. Persist it in your app's DB to resume conversations across sessions.

## What gets scaffolded

```
my-agent/
├── src/
│   ├── index.ts      # Hono server, POST /chat
│   ├── agent.ts      # generateText loop + Copass tools + system prompt
│   └── copass.ts     # CopassClient singleton + Context Window helpers
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

136 lines of source across three files — nothing opaque, everything editable. Tweak the `SYSTEM_PROMPT` in `src/agent.ts` to shape the agent's behavior; swap the model in the same file to use a different Claude variant.

## Stack

- [Hono](https://hono.dev) — lightweight server, Node + edge runtimes
- [Vercel AI SDK](https://sdk.vercel.ai) — agent loop + tool-calling
- [`@copass/ai-sdk`](https://www.npmjs.com/package/@copass/ai-sdk) — retrieval tools
- [`@copass/core`](https://www.npmjs.com/package/@copass/core) — client SDK
- [Claude](https://docs.anthropic.com) via `@ai-sdk/anthropic`

## License

MIT
