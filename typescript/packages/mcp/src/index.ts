export { buildServer } from './server.js';
export type { BuildServerOptions } from './server.js';
export { loadConfig } from './config.js';
export type { ServerConfig } from './config.js';
export { WindowRegistry } from './windows.js';

// Sub-registrars — for callers that want to compose tools onto an
// existing `McpServer` rather than spinning up a whole `buildServer()`.
// Pick the tool groups you want and skip the rest (e.g. embed
// `discover` / `interpret` / `search` without the SDK ingest when the
// host process owns its own ingest tool).
export { registerRetrievalTools } from './tools/retrieval.js';
export { registerContextWindowTools } from './tools/context-window.js';
export { registerIngestTool } from './tools/ingest.js';
