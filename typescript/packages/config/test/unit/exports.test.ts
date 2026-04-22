import { describe, it, expect } from 'vitest';
import * as config from '../../src/index.js';

describe('@copass/config exports', () => {
  const keys = [
    'DISCOVER_DESCRIPTION',
    'MCP_DISCOVER_DESCRIPTION',
    'INTERPRET_DESCRIPTION',
    'SEARCH_DESCRIPTION',
    'DISCOVER_QUERY_PARAM',
    'INTERPRET_QUERY_PARAM',
    'SEARCH_QUERY_PARAM',
    'INTERPRET_ITEMS_PARAM',
    'PROJECT_ID_PARAM',
    'PRESET_PARAM',
    'COPASS_AGENT_MCP_SYSTEM_PROMPT',
    'COPASS_AGENT_SDK_SYSTEM_PROMPT',
  ] as const;

  for (const key of keys) {
    it(`exports ${key} as a non-empty string`, () => {
      const value = (config as Record<string, unknown>)[key];
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });
  }

  it('DISCOVER_DESCRIPTION mentions window-awareness + new signal', () => {
    expect(config.DISCOVER_DESCRIPTION).toMatch(/window-aware/i);
    expect(config.DISCOVER_DESCRIPTION).toMatch(/new\s+signal/i);
  });

  it('MCP_DISCOVER_DESCRIPTION additionally mentions the env var hook', () => {
    expect(config.MCP_DISCOVER_DESCRIPTION).toMatch(/COPASS_CONTEXT_WINDOW_ID/);
    expect(config.MCP_DISCOVER_DESCRIPTION).toMatch(/context_window_create/);
  });

  it('system prompts tell the LLM it can call discover repeatedly', () => {
    for (const prompt of [
      config.COPASS_AGENT_MCP_SYSTEM_PROMPT,
      config.COPASS_AGENT_SDK_SYSTEM_PROMPT,
    ]) {
      expect(prompt).toMatch(/multiple times|again/i);
      expect(prompt).toMatch(/new\s+items|fresh\s+signal/i);
    }
  });
});
