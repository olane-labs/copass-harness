# Getting Started

## Installation

### TypeScript / Node.js

```bash
npm install @copass/harness
```

Requires Node.js >= 18.0.0 (for native `fetch`).

## Create a Client

The simplest way to get started is with an API key:

```typescript
import { CopassClient } from '@copass/harness';

const client = new CopassClient({
  auth: { type: 'api-key', key: 'olk_your_api_key' },
});
```

### With encryption (for ingestion endpoints)

```typescript
const client = new CopassClient({
  auth: { type: 'api-key', key: 'olk_your_api_key' },
  encryptionKey: 'your-master-key',
});
```

### Custom API URL

```typescript
const client = new CopassClient({
  apiUrl: 'https://your-instance.example.com',
  auth: { type: 'api-key', key: 'olk_your_api_key' },
});
```

## Common Operations

### Ask a question (Matrix query)

```typescript
const result = await client.matrix.query({
  query: 'How does the authentication system work?',
});

console.log(result.answer);
```

### Score knowledge confidence (Cosync)

```typescript
const score = await client.cosync.score({
  canonical_ids: ['entity-uuid-here'],
});

console.log(score.aggregate_score); // 0.0 - 1.0
console.log(score.tier);            // 'safe' | 'review' | 'caution' | 'critical'
```

### Create a sandbox

A sandbox is the tenancy unit for everything else (sources, projects, vault, ingestion).

```typescript
const sandbox = await client.sandboxes.create({
  name: 'my-sandbox',
  owner_id: 'owner-uuid',
  tier: 'free',
});
```

### Create a project inside a sandbox

```typescript
const project = await client.projects.create(sandbox.sandbox_id, {
  name: 'my-project',
  description: 'Code + docs for my-project',
});
```

### Register a data source (primary ingestion path)

Ingestion in Copass is **data-source driven**: everything you push should be
attributed to a registered source. Register once, then push through it.

```typescript
const source = await client.sources.register(sandbox.sandbox_id, {
  provider: 'github',
  name: 'my-github',
  ingestion_mode: 'manual', // 'manual' | 'polling' | 'realtime' — see below
  adapter_config: { repo: 'org/repo' },
});

await client.projects.linkSource(
  sandbox.sandbox_id,
  project.project_id,
  source.data_source_id,
);
```

### Push data through the source

```typescript
const job = await client.sources.ingest(sandbox.sandbox_id, source.data_source_id, {
  text: readFileSync('src/auth.ts', 'utf-8'),
  source_type: 'code',
  project_id: project.project_id,
});

// Poll for completion
const status = await client.ingest.getJob(job.job_id);
console.log(status.status);   // queued | processing | completed | failed
console.log(status.children); // child-job aggregation when this is a parent chunking job
```

`last_sync_at` is stamped server-side on each successful `ingest` call, so
polling / realtime drivers do not need to write it from the client.

### Shorthand (no source attribution)

For REPL / quick-start work, `client.ingest.text` auto-resolves the caller's
primary sandbox and default project, and leaves `data_source_id` unset. Use
source-driven ingest in production so provenance stays coherent.

```typescript
const job = await client.ingest.text({
  text: 'hello world',
  source_type: 'text',
});
```

### Store encrypted objects in the vault

```typescript
const bytes = new TextEncoder().encode('hello');
await client.vault.store(sandbox.sandbox_id, 'notes/welcome.txt', bytes, {
  encrypt: true,
  deduplicate: true,
  contentType: 'text/plain',
});

const retrieved = await client.vault.retrieve(sandbox.sandbox_id, 'notes/welcome.txt');
```

### List entities

```typescript
const entities = await client.entities.list();
```

## Error Handling

All API errors throw a `CopassApiError`:

```typescript
import { CopassApiError } from '@copass/harness';

try {
  await client.matrix.query({ query: '...' });
} catch (error) {
  if (error instanceof CopassApiError) {
    console.error(error.status);  // HTTP status code
    console.error(error.message); // Error message
    console.error(error.body);    // Raw error body
  }
}
```

## Next Steps

- [Architecture](./architecture.md) -- Understand the SDK design
- [API Surface](./api-surface.md) -- Full endpoint reference
- [Authentication](./authentication.md) -- Auth flow details
- [Encryption](./encryption.md) -- Encryption protocol for ingestion
