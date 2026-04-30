import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CopassClient } from '../../../src/client.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function lastFetchCall(): { url: string; method: string } {
  const call = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
  const init = call[1] as RequestInit;
  return { url: String(call[0]), method: String(init.method ?? 'GET') };
}

function makeClient(): CopassClient {
  return new CopassClient({
    apiUrl: 'http://test',
    auth: { type: 'api-key', key: 'olk_test' },
  });
}

describe('agents.getRun (Phase 1A parity)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('targets /agents/runs/{run_id} under the sandbox prefix', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        run_id: 'rn-1',
        agent_id: 'ag-1',
        status: 'succeeded',
        tool_resolution_trace: { sources_resolved: [] },
      }),
    );
    const client = makeClient();
    const result = await client.agents.getRun('sb-1', 'rn-1');

    const last = lastFetchCall();
    expect(last.method).toBe('GET');
    expect(last.url).toBe(
      'http://test/api/v1/storage/sandboxes/sb-1/agents/runs/rn-1',
    );
    expect(result.run_id).toBe('rn-1');
    expect(result.tool_resolution_trace).toEqual({ sources_resolved: [] });
  });
});

describe('integrations.listAccounts (Phase 1A parity)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('targets /sources/integrations/accounts and serializes app_slug', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        accounts: [
          {
            id: 'acct_1',
            app_slug: 'slack',
            name: 'workspace',
            created_at: '2026-04-29T18:00:00Z',
            provider: 'tool-source',
          },
        ],
        count: 1,
      }),
    );
    const client = makeClient();
    const result = await client.integrations.listAccounts('sb-1', {
      app_slug: 'slack',
    });

    const last = lastFetchCall();
    expect(last.method).toBe('GET');
    expect(last.url).toBe(
      'http://test/api/v1/storage/sandboxes/sb-1/sources/integrations/accounts?app_slug=slack',
    );
    expect(result.count).toBe(1);
    expect(result.accounts[0].app_slug).toBe('slack');
  });

  it('omits the query string when no options are passed', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ accounts: [], count: 0 }));
    const client = makeClient();
    await client.integrations.listAccounts('sb-1');

    const last = lastFetchCall();
    expect(last.url).toBe(
      'http://test/api/v1/storage/sandboxes/sb-1/sources/integrations/accounts',
    );
  });
});
