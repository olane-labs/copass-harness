import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  it('parses all fields from env', () => {
    const cfg = loadConfig({
      COPASS_API_KEY: 'olk_test',
      COPASS_SANDBOX_ID: 'sb1',
      COPASS_API_URL: 'http://localhost:8000',
      COPASS_PROJECT_ID: 'proj_42',
      COPASS_PRESET: 'auto',
      COPASS_INGEST_DATA_SOURCE_ID: 'ds_ingest',
    });

    expect(cfg).toEqual({
      api_key: 'olk_test',
      sandbox_id: 'sb1',
      api_url: 'http://localhost:8000',
      project_id: 'proj_42',
      preset: 'auto',
      ingest_data_source_id: 'ds_ingest',
    });
  });

  it('defaults optional fields', () => {
    const cfg = loadConfig({
      COPASS_API_KEY: 'olk_test',
      COPASS_SANDBOX_ID: 'sb1',
    });

    expect(cfg.api_url).toBe('https://ai.copass.id');
    expect(cfg.preset).toBe('fast');
    expect(cfg.project_id).toBeUndefined();
    expect(cfg.ingest_data_source_id).toBeUndefined();
  });

  it('throws listing missing required vars', () => {
    expect(() => loadConfig({})).toThrow(/COPASS_API_KEY.*COPASS_SANDBOX_ID/);
  });

  it('throws on invalid preset', () => {
    expect(() =>
      loadConfig({
        COPASS_API_KEY: 'olk_test',
        COPASS_SANDBOX_ID: 'sb1',
        COPASS_PRESET: 'ludicrous',
      }),
    ).toThrow(/COPASS_PRESET must be one of/);
  });
});
