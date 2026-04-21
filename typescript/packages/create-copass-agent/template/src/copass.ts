import { CopassClient } from '@copass/core';

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
 * Create a new Copass Context Window for a conversation thread.
 *
 * The returned `dataSourceId` identifies the window. Persist it on your side
 * (or return it to the client as a threadId) so subsequent turns can reuse
 * the same window — retrieval becomes window-aware automatically.
 */
export async function createThread(): Promise<{ dataSourceId: string }> {
  const client = getCopass();
  const sandbox_id = getSandboxId();
  const window = await client.contextWindow.create({
    sandbox_id,
    project_id: process.env.COPASS_PROJECT_ID || undefined,
  });
  return { dataSourceId: window.dataSourceId };
}
