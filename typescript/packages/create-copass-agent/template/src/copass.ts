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
 * Return a Context Window for this conversation. If `threadId` is supplied,
 * resume the existing window; otherwise create a new one. Persist the
 * `data_source_id` on your side (e.g. in your app's database) to keep
 * window-aware retrieval flowing across sessions.
 */
export async function getWindow(threadId?: string): Promise<ContextWindow> {
  const copass = getCopass();
  const sandbox_id = getSandboxId();

  if (threadId) {
    return copass.contextWindow.attach({
      sandbox_id,
      data_source_id: threadId,
    });
  }
  return copass.contextWindow.create({
    sandbox_id,
    project_id: process.env.COPASS_PROJECT_ID || undefined,
  });
}
