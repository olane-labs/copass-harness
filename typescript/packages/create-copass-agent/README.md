# create-copass-agent

**Scaffold a Copass-backed agent in three copy-pasteable steps.** Hono server + [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/typescript) + [`@copass/mcp`](https://www.npmjs.com/package/@copass/mcp) + an embedded chat UI. Open `http://localhost:3000` and start chatting.

## Quick start

### 1. Bootstrap Copass (once, ~30 s)

```bash
npm install -g @copass/cli
copass login        # email OTP
copass setup        # writes .olane/refs.json to your current directory
copass ingest README.md   # give retrieval something real to work with
```

`copass setup` creates a sandbox and drops `.olane/refs.json` next to wherever you ran it — remember this location, the scaffolder walks up to find it.

### 2. Scaffold + start (~60 s)

```bash
npx create-copass-agent my-app
cd my-app
# .env is auto-populated from ~/.olane/config.json + ../.olane/refs.json.
# Add your ANTHROPIC_API_KEY (https://console.anthropic.com) and go:
echo "ANTHROPIC_API_KEY=sk-ant-your-key" >> .env
npm install
npm dev
```

### 3. Chat

Open **[http://localhost:3000](http://localhost:3000)** in your browser. You get a minimal chat UI that posts to the Hono server, keeps `threadId` in localStorage, and reconnects to the same Context Window on refresh.

Or hit it from the terminal:

```bash
curl -s -X POST http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"what do we know from the README I just ingested?"}'
```

Expected response shape:

```json
{ "threadId": "ds_abc...", "answer": "Based on the README, this project..." }
```

Pass the `threadId` back on follow-up calls to keep retrieval window-aware.

## What gets scaffolded

```
my-app/
├── src/
│   ├── index.ts       # Hono server: GET / (chat UI), POST /chat, threadId↔sessionId map
│   ├── agent.ts       # query() from Claude Agent SDK + @copass/mcp subprocess config
│   ├── copass.ts      # CopassClient singleton + createThread() helper
│   └── chat-ui.ts     # Vanilla HTML/CSS/JS chat page served at GET /
├── package.json
├── tsconfig.json
├── .env               # auto-populated from CLI config at scaffold time
├── .env.example       # reference only
├── .gitignore
└── README.md
```

~300 lines of source across four files. Everything editable.

## Architecture

```
Browser (embedded chat UI)
    ▼  POST /chat { message, threadId? }
┌────────────────────────────────────┐
│ Hono server  (src/index.ts)        │
│  ├─ create Context Window (first)  │ ◀── @copass/core
│  └─ run agent turn                 │
└──────────┬─────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ Claude Agent SDK  (src/agent.ts)   │ ◀── @anthropic-ai/claude-agent-sdk
│  • agent loop, tool calling        │
│  • session persistence (resume)    │
└──────────┬─────────────────────────┘
           │ stdio MCP
           ▼
┌────────────────────────────────────┐
│ @copass/mcp (subprocess per turn)  │
│  COPASS_CONTEXT_WINDOW_ID=ds_…     │ ◀── auto-attached on startup
│  tools: discover / interpret /     │
│         search / context_window_* /│
│         ingest                     │
└────────────────────────────────────┘
```

## Going further

- **Swap in a polished React UI.** Delete `src/chat-ui.ts` and wire [Assistant UI](https://assistant-ui.com) (open-source React, MIT, pluggable runtime) or [Vercel AI SDK UI](https://sdk.vercel.ai). Point it at `POST /chat`; backend stays unchanged.
- **Streaming.** The `query()` result already streams via AsyncGenerator — in `src/index.ts`, swap the `join('')` for an SSE response and the embedded UI can render chunks as they arrive.
- **More tools.** Flip `tools: []` to `tools: { type: 'preset', preset: 'claude_code' }` in `src/agent.ts` to give the agent Read/Write/Bash/Web on top of Copass. Tighten via `allowedTools`.
- **Production sessions.** Replace the in-memory `threadSessions` Map in `src/index.ts` with Redis / Postgres / your existing store.

## Troubleshooting

### `pnpm install` fails with `ETARGET No matching version found for @copass/core`

The scaffold pins `@copass/core@^0.2.0` and `@copass/mcp@^0.1.0`. If those aren't on npm yet, install fails with `ETARGET`. Until they publish, work from a local checkout — `pnpm link` against a cloned `copass-harness` repo.

### `.env` is empty or still has placeholders

The scaffolder walks **up** from your project dir looking for `.olane/refs.json`. If you scaffolded into a directory whose ancestors don't contain one, auto-populate fails silently.

Fix: run `copass login && copass setup` in the directory **above** your scaffolded project, then either rerun the scaffolder or manually paste:

```bash
copass config get access_token                  # → COPASS_API_KEY
jq -r .sandbox_id ../.olane/refs.json           # → COPASS_SANDBOX_ID
```

### Agent returns "I don't have information about that"

Your Copass sandbox has nothing ingested. Run `copass ingest <file>` before chatting — even `copass ingest README.md` is enough for the agent to start citing real content.

## Stack

- [Hono](https://hono.dev) — lightweight server, Node + edge runtimes
- [`@anthropic-ai/claude-agent-sdk`](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) — managed agent loop (same runtime that powers Claude Code)
- [`@copass/mcp`](https://www.npmjs.com/package/@copass/mcp) — MCP server exposing Copass retrieval + Context Window
- [`@copass/core`](https://www.npmjs.com/package/@copass/core) — client SDK for Context Window lifecycle

## License

MIT
