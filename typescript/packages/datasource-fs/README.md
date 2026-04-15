# @copass/datasource-fs

Filesystem data source driver for [Copass](https://copass.id).

Implements `BaseDataSource` (from [`@copass/core`](../core/)) over the local
filesystem: register once, then scan, watch, and push file events through
the copass-id storage layer. Every byte is attributed to the underlying
`DataSource` record.

## Installation

```bash
npm install @copass/datasource-fs @copass/core
```

## Usage

### High-level: `FileSystemDataSource`

One call registers (or reuses) the data source and hands back a bound driver.

```typescript
import { CopassClient } from '@copass/core';
import { FileSystemDataSource } from '@copass/datasource-fs';

const client = new CopassClient({
  auth: { type: 'api-key', key: 'olk_...' },
});

const sandbox = await client.sandboxes.create({
  name: 'repo-index',
  owner_id: 'owner-uuid',
});

const fs = await FileSystemDataSource.create({
  client,
  sandboxId: sandbox.sandbox_id,
  projectPath: '/path/to/project',
  name: 'my-repo', // optional; defaults to basename(projectPath)
});

// One-shot full index
const summary = await fs.fullIndex({
  onProgress: (msg) => console.log(msg),
});
console.log(`Indexed ${summary.indexed_count} files in ${summary.duration_ms}ms`);

// Continuous watching
await fs.start();
// Every file event is pushed via client.sources.ingest(sandboxId, sourceId, …)
// …
await fs.stop();

// Lifecycle pass-throughs inherited from BaseDataSource
await fs.pause();
await fs.resume();
await fs.disconnect();
```

### Low-level building blocks

If you need to orchestrate full index / watching yourself, the underlying
primitives are exported directly:

```typescript
import {
  runFullIndex,
  ProjectWatchRuntime,
  scanProjectFiles,
  diffFiles,
} from '@copass/datasource-fs';

const summary = await runFullIndex(client, {
  projectPath: '/path/to/project',
  sandboxId,
  dataSourceId,
});

const watcher = new ProjectWatchRuntime(client, {
  projectPath: '/path/to/project',
  sandboxId,
  dataSourceId,
});
await watcher.start();

const files = await scanProjectFiles('/path/to/project');
// Returns Record<relativePath, { mtimeMs, size, sha256 }>
```

## License

MIT
