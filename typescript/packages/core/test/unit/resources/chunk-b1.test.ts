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

interface FetchCall {
  url: string;
  method: string;
  body: unknown;
}

function lastFetchCall(): FetchCall {
  const call = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
  const init = call[1] as RequestInit;
  let body: unknown = undefined;
  if (typeof init.body === 'string' && init.body.length > 0) {
    body = JSON.parse(init.body);
  }
  return { url: String(call[0]), method: String(init.method ?? 'GET'), body };
}

function makeClient(): CopassClient {
  return new CopassClient({
    apiUrl: 'http://test',
    auth: { type: 'api-key', key: 'olk_test' },
  });
}

describe('agents.updateModelSettings (Chunk B1)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('PATCHes /agents/{slug}/model-settings with the partial body', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        agent_id: 'ag-1',
        slug: 'demo',
        version: 5,
        model_settings: {
          backend: 'anthropic',
          model: 'claude-sonnet-4-6',
          temperature: 1.0,
          max_tokens: 4096,
          max_turns: 8,
          timeout_s: 60,
        },
      }),
    );
    const client = makeClient();
    await client.agents.updateModelSettings('sb-1', 'demo', {
      temperature: 1.0,
    });

    const last = lastFetchCall();
    expect(last.method).toBe('PATCH');
    expect(last.url).toBe(
      'http://test/api/v1/storage/sandboxes/sb-1/agents/demo/model-settings',
    );
    expect(last.body).toEqual({ temperature: 1.0 });
  });

  it('serialises a multi-field patch verbatim (no merge client-side)', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ agent_id: 'ag-1', slug: 'demo', version: 6 }),
    );
    const client = makeClient();
    await client.agents.updateModelSettings('sb-1', 'demo', {
      backend: 'google',
      model: 'gemini-2.5-flash',
      max_tokens: 8192,
    });
    expect(lastFetchCall().body).toEqual({
      backend: 'google',
      model: 'gemini-2.5-flash',
      max_tokens: 8192,
    });
  });
});

describe('sources.connectLinear (Chunk B1)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('POSTs /sources/linear with the request body', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        data_source_id: 'ds-linear-1',
        status: 'active',
        name: 'Linear',
        ingestion_mode: 'polling',
        entities: ['issues'],
      }),
    );
    const client = makeClient();
    const result = await client.sources.connectLinear('sb-1', {
      api_key: 'lin_api_test',
      include: ['issues'],
      rate_cap_per_minute: 120,
    });

    const last = lastFetchCall();
    expect(last.method).toBe('POST');
    expect(last.url).toBe(
      'http://test/api/v1/storage/sandboxes/sb-1/sources/linear',
    );
    expect(last.body).toEqual({
      api_key: 'lin_api_test',
      include: ['issues'],
      rate_cap_per_minute: 120,
    });
    expect(result.data_source_id).toBe('ds-linear-1');
    expect(result.status).toBe('active');
  });
});

describe('sources.update — mergeAdapterConfig (Chunk B1)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('omits the query param by default (backward-compat)', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ data_source_id: 'ds-1', adapter_config: {} }),
    );
    const client = makeClient();
    await client.sources.update('sb-1', 'ds-1', {
      adapter_config: { ingest_to_graph: true },
    });

    const last = lastFetchCall();
    expect(last.method).toBe('PATCH');
    expect(last.url).toBe(
      'http://test/api/v1/storage/sandboxes/sb-1/sources/ds-1',
    );
    // URL does NOT carry merge_adapter_config when option is absent.
    expect(last.url).not.toContain('merge_adapter_config');
  });

  it('appends ?merge_adapter_config=true when the flag is set', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ data_source_id: 'ds-1', adapter_config: {} }),
    );
    const client = makeClient();
    await client.sources.update(
      'sb-1',
      'ds-1',
      { adapter_config: { ingest_to_graph: true } },
      { mergeAdapterConfig: true },
    );

    const last = lastFetchCall();
    expect(last.url).toBe(
      'http://test/api/v1/storage/sandboxes/sb-1/sources/ds-1?merge_adapter_config=true',
    );
    expect(last.body).toEqual({ adapter_config: { ingest_to_graph: true } });
  });
});

describe('integrations.connect — webhook_uri pass-through (Chunk B1)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('forwards webhook_uri verbatim when provided', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        connect_url: 'https://provider/connect/abc',
        session_id: 'ctok_abc',
      }),
    );
    const client = makeClient();
    await client.integrations.connect('sb-1', 'slack', {
      success_redirect_uri: 'https://ok',
      error_redirect_uri: 'https://err',
      webhook_uri: 'https://custom.dev/webhook',
    });

    const last = lastFetchCall();
    expect(last.method).toBe('POST');
    expect(last.url).toBe(
      'http://test/api/v1/storage/sandboxes/sb-1/sources/integrations/slack/connect',
    );
    expect(last.body).toEqual({
      success_redirect_uri: 'https://ok',
      error_redirect_uri: 'https://err',
      webhook_uri: 'https://custom.dev/webhook',
    });
  });

  it('omits webhook_uri when not supplied (backward-compat)', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        connect_url: 'https://provider/connect/abc',
        session_id: 'ctok_abc',
      }),
    );
    const client = makeClient();
    await client.integrations.connect('sb-1', 'slack', {
      success_redirect_uri: 'https://ok',
      error_redirect_uri: 'https://err',
    });

    const body = lastFetchCall().body as Record<string, unknown>;
    expect('webhook_uri' in body).toBe(false);
  });
});

describe('agents.triggers.updateById (Chunk B1)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('PATCHes the flat /sandboxes/{id}/triggers/{trigger_id} route', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        trigger_id: 'tr-1',
        status: 'paused',
      }),
    );
    const client = makeClient();
    await client.agents.triggers.updateById('sb-1', 'tr-1', {
      status: 'paused',
    });

    const last = lastFetchCall();
    expect(last.method).toBe('PATCH');
    expect(last.url).toBe(
      'http://test/api/v1/storage/sandboxes/sb-1/triggers/tr-1',
    );
    expect(last.body).toEqual({ status: 'paused' });
  });

  it('preserves the nested route signature alongside (parity check)', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ trigger_id: 'tr-1' }));
    const client = makeClient();
    await client.agents.triggers.update('sb-1', 'demo', 'tr-1', {
      status: 'active',
    });
    expect(lastFetchCall().url).toBe(
      'http://test/api/v1/storage/sandboxes/sb-1/agents/demo/triggers/tr-1',
    );
  });
});
