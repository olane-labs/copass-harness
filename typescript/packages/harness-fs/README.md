# @copass/harness-fs

Filesystem ingestion, watching, and indexing for the [Copass](https://copass.id) knowledge graph platform.

Built on top of [`@copass/core`](../core/) — requires a `CopassClient` instance for API communication.

## Installation

```bash
npm install @copass/harness-fs @copass/core
```

## Usage

### Full project indexing

Ingestion is **data-source driven**. Register a sandbox, register a data
source inside it (e.g. a `filesystem` source describing the repo), and pass
both ids into `runFullIndex`.

```typescript
import { CopassClient } from '@copass/core';
import { runFullIndex } from '@copass/harness-fs';

const client = new CopassClient({
  auth: { type: 'api-key', key: 'olk_...' },
});

const sandbox = await client.sandboxes.create({
  name: 'repo-index',
  owner_id: 'owner-uuid',
});

const source = await client.sources.register(sandbox.sandbox_id, {
  provider: 'filesystem',
  name: 'my-repo',
  ingestion_mode: 'manual',
  adapter_config: { root: '/path/to/project' },
});

const summary = await runFullIndex(client, {
  projectPath: '/path/to/project',
  sandboxId: sandbox.sandbox_id,
  dataSourceId: source.data_source_id,
  onProgress: (msg) => console.log(msg),
});

console.log(`Indexed ${summary.indexed_count} files in ${summary.duration_ms}ms`);
```

### File watching

```typescript
import { ProjectWatchRuntime } from '@copass/harness-fs';

const watcher = new ProjectWatchRuntime(client, {
  projectPath: '/path/to/project',
  sandboxId: sandbox.sandbox_id,
  dataSourceId: source.data_source_id,
  // projectId: 'optional-existing-project-id',
});

await watcher.start();
// Every file event is pushed via client.sources.ingest(sandboxId, sourceId, ...)
// Call watcher.stop() to shut down
```

### File scanning

```typescript
import { scanProjectFiles, diffFiles } from '@copass/harness-fs';

const files = await scanProjectFiles('/path/to/project');
// Returns Record<relativePath, { mtimeMs, size, sha256 }>
```

## License

MIT
