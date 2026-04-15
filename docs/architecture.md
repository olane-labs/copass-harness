# SDK Architecture

The Copass harness SDK is organized in four layers. Each language implementation follows this same structure.

## Layer Diagram

```
┌─────────────────────────────────────────────┐
│  CopassClient                               │  ← Public entry point
│  Composes resources with shared auth/config  │
├─────────────────────────────────────────────┤
│  Data Source Drivers                         │  ← BaseDataSource (core)
│  FileSystemDataSource (@copass/datasource-fs)│    + per-provider subclasses
├─────────────────────────────────────────────┤
│  Resources                                   │  ← One per API domain
│  Storage (copass-id):                        │
│    sandboxes · sources · projects            │
│    vault · ingest                            │
│  Knowledge graph:                            │
│    matrix · cosync · plans · entities        │
│    users · api-keys · usage                  │
├─────────────────────────────────────────────┤
│  HTTP Layer                                  │  ← Transport
│  Fetch-based client · retry · errors         │
├─────────────────────────────────────────────┤
│  Crypto Layer                                │  ← Security
│  AES-256-GCM · HKDF key derivation          │
│  Session token wrapping                      │
├─────────────────────────────────────────────┤
│  Auth Layer                                  │  ← Identity
│  API key · Bearer JWT · Supabase OTP         │
└─────────────────────────────────────────────┘
```

## CopassClient

The top-level entry point. Consumers create a single client instance and access backend services through typed resource properties.

```typescript
const client = new CopassClient({
  auth: { type: 'api-key', key: 'olk_...' },
  encryptionKey: 'optional-master-key',
});

await client.matrix.query({ query: '...' });
await client.cosync.score({ canonical_ids: ['...'] });
```

### Design: Stripe-style resource pattern

Each backend API domain is exposed as a resource object on the client. Resources are thin wrappers that:

1. Accept typed request parameters
2. Delegate to the shared HTTP client
3. Return typed response objects
4. Throw typed errors (`CopassApiError`)

This pattern scales cleanly -- adding a new API domain means adding one resource class and one types file.

## Resource Layer

Each resource maps to a group of related backend endpoints:

**Storage layer (copass-id, `/api/v1/storage/*`):**

| Resource | Endpoints | Purpose |
|----------|-----------|---------|
| `sandboxes` | `/storage/sandboxes/*` | Tenancy unit CRUD + suspend/reactivate/archive/destroy |
| `sources` | `/storage/sandboxes/{sid}/sources/*` | Data source registration + pause/resume/disconnect |
| `projects` | `/storage/sandboxes/{sid}/projects/*` | Sandbox-scoped projects + link/unlink data sources |
| `vault` | `/storage/sandboxes/{sid}/vault/{key:path}` | Encrypted raw-bytes KV with optional dedup |
| `ingest` | `/storage/ingest`, `/storage/sandboxes/{sid}/ingest` | Chunking + ontology ingestion jobs |

**Knowledge-graph layer (`/api/v1/*`):**

| Resource | Endpoints | Purpose |
|----------|-----------|---------|
| `matrix` | `/matrix/query` | Natural language search |
| `cosync` | `/cosync` | Knowledge confidence scoring |
| `plans` | `/plans/cosync` | Plan-level knowledge scoring (v2) |
| `entities` | `/users/me/canonical-entities/*`, `/users/me/entities/search` | Canonical entity query + search |
| `users` | `/users/me/profile` (GET/POST) | User profile |
| `apiKeys` | `/api-keys/*` | API key CRUD |
| `usage` | `/usage`, `/usage/credits` | Token consumption + credit balance |

> Ingestion is **data-source driven**. In production, push through
> `client.sources.ingest(sandboxId, sourceId, …)` so every event carries a
> `data_source_id`; `client.ingest.text(…)` is a shorthand for quick starts
> and REPL experiments. The legacy `/api/v1/extract/*` and `/api/v1/projects/*`
> (indexing) endpoints are deprecated and no longer exposed by the SDK.

## HTTP Layer

The internal HTTP client handles:

- **Auth header injection** -- `Authorization: Bearer <token>` from the configured auth provider
- **Encryption header** -- `X-Encryption-Token: <session-token>` when encryption is configured
- **Retry with backoff** -- Configurable exponential/linear/fixed backoff for transient failures
- **Error normalization** -- HTTP errors become typed `CopassApiError` instances with status, body, and request context
- **Content negotiation** -- JSON by default; raw bytes for vault PUT/GET (caller-supplied `Content-Type`); multipart/form-data for file uploads

The HTTP layer uses the platform's native `fetch` (Node 18+, browsers, Deno, Cloudflare Workers).

## Crypto Layer

Implements the Copass encryption protocol (see [encryption.md](./encryption.md)):

- **AES-256-GCM** encryption/decryption for request payloads
- **HKDF-SHA256** key derivation for DEK and session token wrapping
- **Session token creation** -- wraps the DEK with an access-token-derived key

The crypto layer uses only platform-native crypto (`node:crypto` in Node.js, `SubtleCrypto` in browsers).

## Auth Layer

Three authentication strategies:

1. **API Key** -- simplest; pass `olk_` prefixed key as Bearer token
2. **Bearer JWT** -- pass a Supabase JWT directly (caller manages refresh)
3. **Supabase OTP** -- managed auth with automatic token refresh (email/phone OTP flow)

See [authentication.md](./authentication.md) for details on each flow.

## Design Principles

1. **No filesystem access in core** -- Configuration is passed via constructor, not read from disk. A separate utility can load `.olane/config.json` for Node.js environments.
2. **Minimal dependencies** -- Only `zod` for schema validation. Everything else uses platform built-ins.
3. **Environment agnostic** -- Works in Node.js, browsers, Deno, and edge runtimes.
4. **Encryption is optional** -- Endpoints that don't require encrypted payloads work without an encryption key.
5. **Typed end-to-end** -- Every request and response has TypeScript types. Errors are typed too.
