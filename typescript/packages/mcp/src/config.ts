import type { SearchPreset } from '@copass/core';

export interface ServerConfig {
  api_url: string;
  api_key: string;
  sandbox_id: string;
  project_id?: string;
  preset: SearchPreset;
  /** Default data_source_id for `ingest` when the caller doesn't pass one. */
  ingest_data_source_id?: string;
  /**
   * If set, the server attaches to this Context Window on startup and makes
   * it the active window. Use when another process (e.g. a Hono server)
   * already created the window and you're launching the MCP server as a
   * subprocess that should share it.
   */
  context_window_id?: string;
}

const VALID_PRESETS: readonly SearchPreset[] = ['fast', 'auto', 'max'] as const;

/**
 * Read config from `process.env`.
 *
 * - `COPASS_API_KEY` (required)
 * - `COPASS_SANDBOX_ID` (required)
 * - `COPASS_API_URL` (default: https://ai.copass.id)
 * - `COPASS_PROJECT_ID` (optional — default for retrieval/ingest)
 * - `COPASS_PRESET` (default: `fast`; one of fast/auto/max)
 *
 * Throws a descriptive error for missing/invalid values so the MCP client
 * sees an immediate startup failure with actionable text.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const missing: string[] = [];
  const api_key = env.COPASS_API_KEY ?? '';
  const sandbox_id = env.COPASS_SANDBOX_ID ?? '';

  if (!api_key) missing.push('COPASS_API_KEY');
  if (!sandbox_id) missing.push('COPASS_SANDBOX_ID');

  if (missing.length > 0) {
    throw new Error(
      `@copass/mcp: missing required env var(s): ${missing.join(', ')}. ` +
        `Set them before launching the server.`,
    );
  }

  const api_url = env.COPASS_API_URL?.trim() || 'https://ai.copass.id';
  const project_id = env.COPASS_PROJECT_ID?.trim() || undefined;
  const rawPreset = env.COPASS_PRESET?.trim() || 'fast';

  if (!VALID_PRESETS.includes(rawPreset as SearchPreset)) {
    throw new Error(
      `@copass/mcp: COPASS_PRESET must be one of ${VALID_PRESETS.join(', ')}; got "${rawPreset}"`,
    );
  }

  const ingest_data_source_id = env.COPASS_INGEST_DATA_SOURCE_ID?.trim() || undefined;
  const context_window_id = env.COPASS_CONTEXT_WINDOW_ID?.trim() || undefined;

  return {
    api_url,
    api_key,
    sandbox_id,
    project_id,
    preset: rawPreset as SearchPreset,
    ingest_data_source_id,
    context_window_id,
  };
}
