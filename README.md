# copass

**Developer SDKs and integrations for [Copass](https://copass.id).** A typed, multi-language monorepo for building agents grounded in a knowledge graph.

## Pick your path

**Building an agent with an LLM framework?** Use an adapter — the LLM picks between `discover` / `interpret` / `search` on each turn, and retrieval is window-aware automatically.

| Framework | Package |
|---|---|
| Vercel AI SDK | [`@copass/ai-sdk`](./typescript/packages/ai-sdk) |
| LangChain / LangGraph (TS) | [`@copass/langchain`](./typescript/packages/langchain) |
| Mastra | [`@copass/mastra`](./typescript/packages/mastra) |
| LangChain / LangGraph (Python) | [`copass-langchain`](./python/copass-langchain) |
| Pydantic AI (Python) | [`copass-pydantic-ai`](./python/copass-pydantic-ai) |
| Anthropic Managed Agents (Python) | [`copass-anthropic-agents`](./python/copass-anthropic-agents) |
| Google Vertex Agent Engine / ADK (Python) | [`copass-google-agents`](./python/copass-google-agents) |

**On the Anthropic managed stack?** Use MCP — zero code, just a config line.

| Client | Package |
|---|---|
| Claude Code · Claude Desktop · Cursor · Claude Agent SDK | [`@copass/mcp`](./typescript/packages/mcp) |

**Starting from zero?** Scaffold a ready-to-deploy Hono server + Claude agent:

```bash
npx create-copass-agent my-app
```

See [`create-copass-agent`](./typescript/packages/create-copass-agent).

**Going lower level?** Talk to the API directly with the typed `CopassClient`:

| Use case | Package |
|---|---|
| `CopassClient` — auth, retrieval, ingestion, Context Window, sandboxes, sources, projects, vault | [`@copass/core`](./typescript/packages/core) · [`copass-core`](./python/copass-core) |
| High-level agent SDK — `router.run()` event stream + one-call OAuth integrations | [`@copass/agent-router`](./typescript/packages/agent-router) · [`copass-agent-router`](./python/copass-agent-router) |
| Spec-driven management tool registrar (read-only Phase 1, 14 tools) | [`@copass/management`](./typescript/packages/management) · [`copass-management`](./python/copass-management) |
| Filesystem → knowledge graph watcher driver | [`@copass/datasource-fs`](./typescript/packages/datasource-fs) |
| Olane OS instance management + address book | [`@copass/datasource-olane`](./typescript/packages/datasource-olane) |

## Prerequisites (every path)

```bash
npm install -g @copass/cli
copass login                             # email OTP
copass setup                             # creates a sandbox, writes .olane/refs.json
copass apikey create --name my-app       # prints an olk_... key — shown once, save it
```

You end up with two things every adapter needs:

| Output | Use as |
|---|---|
| `olk_...` key printed by `copass apikey create` | `COPASS_API_KEY` |
| `./.olane/refs.json` (`sandbox_id`, `project_id`, `data_source_id`) | `COPASS_SANDBOX_ID`, `COPASS_PROJECT_ID` |

Ingest something so retrieval has material to work with:

```bash
copass ingest path/to/notes.md
```

## Talking to the API directly

`@copass/core` (and its Python mirror `copass-core`) exposes the full backend surface as a single typed client. Adapters and the MCP server are all built on top of it.

```typescript
import { CopassClient } from '@copass/core';

const client = new CopassClient({
  auth: { type: 'api-key', key: process.env.COPASS_API_KEY! },
});

// Knowledge-graph retrieval
const answer = await client.matrix.query({ query: 'How does auth work?' });

// Knowledge confidence scoring
const score = await client.cosync.score({ canonical_ids: ['…'] });

// Source-driven ingestion (production path)
const job = await client.sources.ingest(sandboxId, sourceId, {
  text: '…',
  source_type: 'code',
  project_id: projectId,
});
```

The client splits cleanly into two layers, both documented in [`docs/api-surface.md`](./docs/api-surface.md):

- **Storage (`/api/v1/storage/*`)** — `sandboxes`, `sources`, `projects`, `vault`, `ingest`
- **Knowledge graph (`/api/v1/*`)** — `matrix`, `cosync`, `plans`, `entities`, `users`, `apiKeys`, `usage`

## Core primitives

- **Sandbox** — your tenancy boundary. Data, quotas, and encryption keys scope here.
- **Data source** — a named connection feeding content in. Built-in providers: `slack`, `github`, `linear`, `gmail`, `jira`, `notion`, `custom`. Pick `manual` / `polling` / `realtime` ingestion mode; the wire path is identical, the mode just describes who drives the push.
- **Project** — sandbox-scoped grouping. Link one or more data sources; retrieval can be project-scoped.
- **Vault** — sandbox-scoped raw-bytes KV with optional AES-256-GCM at rest and content-hash dedup.
- **Context Window** — an agent conversation wrapped as an ephemeral data source. Retrieval is automatically window-aware; the agent's memory isn't a prompt-engineering problem anymore.
- **Retrieval gradient** — one axis, three calls: `discover` (ranked menu) → `interpret` (synthesized brief) → `search` (direct answer). Pick the point that matches your cost-quality tradeoff.

## Authentication

Three flavors, all resolved to a Bearer token by the SDK. Full flow details in [`docs/authentication.md`](./docs/authentication.md).

| Type | Header | Refresh | Best for |
|---|---|---|---|
| `api-key` | `Bearer olk_…` | None — long-lived | Servers, CI, scripts |
| `bearer` | `Bearer <jwt>` | Caller-managed | Apps already using Supabase auth |
| `supabase` | `Bearer <jwt>` | SDK auto-refresh | CLIs and interactive tools |

## Encryption

Ingestion and vault payloads can be client-side encrypted with **AES-256-GCM**. The DEK is derived from a master key via **HKDF-SHA256** and wrapped per-session for transport in the `X-Encryption-Token` header. Pass `encryptionKey` to the client and the SDK handles the rest:

```typescript
const client = new CopassClient({
  auth: { type: 'api-key', key: 'olk_…' },
  encryptionKey: process.env.COPASS_MASTER_KEY,
});
```

Full protocol — including key derivation salts and on-the-wire layout — in [`docs/encryption.md`](./docs/encryption.md).

## Repository layout

```
copass/
  typescript/packages/
    core                  # CopassClient SDK — auth, retrieval, Context Window, sources, vault
    agent-router          # High-level agent SDK + integration OAuth
    ai-sdk                # Vercel AI SDK tool adapter
    langchain             # LangChain / LangGraph tool adapter
    mastra                # Mastra tool adapter
    mcp                   # Standalone MCP server (npx @copass/mcp)
    management            # Spec-driven management tool registrar (+ MCP adapter)
    create-copass-agent   # npx scaffold for Hono + Claude agent
    config                # Canonical tool descriptions / system prompts (shared)
    datasource-fs         # Filesystem watcher driver
    datasource-olane      # Olane OS driver
  python/
    copass-core           # Python mirror of @copass/core
    copass-agent-router   # Python mirror of @copass/agent-router
    copass-core-agents    # Vendor-neutral agent primitives (BaseAgent, events, scope)
    copass-anthropic-agents  # Anthropic Managed Agents backend
    copass-google-agents  # Google Vertex Agent Engine / ADK backend
    copass-context-agents # Context-Window-aware agent helpers
    copass-langchain      # LangChain / LangGraph tool adapter
    copass-pydantic-ai    # Pydantic AI tool adapter
    copass-management     # Python mirror of @copass/management
    copass-config         # Canonical tool descriptions (shared)
  docs/                   # Architecture, API surface, auth, encryption, getting-started
  spec/                   # Shared contracts (management v1 JSON Schema, crypto constants)
  examples/               # Per-language usage examples
```

## Documentation

- [Architecture](./docs/architecture.md) — Four-layer SDK design (Auth → Crypto → HTTP → Resources → Client)
- [API Surface](./docs/api-surface.md) — Full endpoint catalog, split by storage vs knowledge-graph layer
- [Authentication](./docs/authentication.md) — API key, Bearer JWT, Supabase OTP flows
- [Encryption](./docs/encryption.md) — AES-256-GCM protocol and HKDF key derivation
- [Getting Started](./docs/getting-started.md) — Install, create a client, first retrieval, full ingestion walkthrough

## Publishing

- TypeScript packages — Lerna (`pnpm -w version`, `pnpm -w release`)
- Python packages — Hatchling, lockstep-versioned (`python/scripts/bump-lockstep-version.sh`)

See each package's `package.json` / `pyproject.toml` for version state.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup.

## License

MIT — see [LICENSE](./LICENSE).
