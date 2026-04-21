import { CopassClient, type ContextWindow } from '@copass/core';

let _client: CopassClient | null = null;

export function getCopass(): CopassClient {
  if (!_client) {
    const apiKey = process.env.COPASS_API_KEY;
    if (!apiKey) throw new Error('COPASS_API_KEY env var required');
    _client = new CopassClient({
      apiUrl: process.env.COPASS_API_URL,
      auth: apiKey.startsWith('olk_')
        ? { type: 'api-key', key: apiKey }
        : { type: 'bearer', token: apiKey },
    });
  }
  return _client;
}

export function getSandboxId(): string {
  const sandboxId = process.env.COPASS_SANDBOX_ID;
  if (!sandboxId) throw new Error('COPASS_SANDBOX_ID env var required');
  return sandboxId;
}

/**
 * Create a new Copass Context Window for a fresh conversation thread.
 *
 * The returned window's `dataSourceId` identifies the thread. Persist it on
 * your side (or return it to the client as a threadId) so subsequent turns
 * can reuse the same window.
 */
export async function createThread(): Promise<ContextWindow> {
  const client = getCopass();
  return client.contextWindow.create({
    sandbox_id: getSandboxId(),
    project_id: process.env.COPASS_PROJECT_ID || undefined,
  });
}

/**
 * Reattach to an existing Context Window by `data_source_id`, seeding the
 * local turn buffer with whatever turns you've tracked on your side. Used
 * on cold starts / server restarts where the in-memory window was lost.
 */
export async function attachThread(
  dataSourceId: string,
  initialTurns?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
): Promise<ContextWindow> {
  const client = getCopass();
  return client.contextWindow.attach({
    sandbox_id: getSandboxId(),
    data_source_id: dataSourceId,
    initialTurns,
  });
}
