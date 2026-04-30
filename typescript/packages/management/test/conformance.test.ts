import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import {
  jsonSchemaToZod,
  loadManagementSpecs,
  MIN_SPEC_VERSION,
  MAX_SPEC_VERSION,
  TOOL_HANDLERS,
} from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const sourceSpecDir = resolve(here, '..', '..', '..', '..', 'spec', 'management', 'v1');

describe('@copass/management conformance', () => {
  const corpus = loadManagementSpecs({ specDir: sourceSpecDir });

  it('declares supported spec versions', () => {
    expect(MIN_SPEC_VERSION).toBe('v1');
    expect(MAX_SPEC_VERSION).toBe('v1');
  });

  it('loads all 14 read tools from the spec corpus', () => {
    const names = Object.keys(corpus.specs).sort();
    expect(names).toEqual(
      [
        'get_agent',
        'get_run_trace',
        'get_source',
        'list_agent_tools',
        'list_agents',
        'list_api_keys',
        'list_apps',
        'list_connected_accounts',
        'list_runs',
        'list_sandbox_connections',
        'list_sandboxes',
        'list_sources',
        'list_trigger_components',
        'list_triggers',
      ].sort(),
    );
    expect(names.length).toBe(14);
  });

  it('has a fixture for every tool', () => {
    for (const name of Object.keys(corpus.specs)) {
      expect(corpus.fixtures[name], `missing fixture for ${name}`).toBeDefined();
    }
  });

  it('has a TS handler bound for every tool', () => {
    for (const name of Object.keys(corpus.specs)) {
      expect(TOOL_HANDLERS[name], `missing handler for ${name}`).toBeTypeOf('function');
    }
  });

  describe('every fixture round-trips through Zod', () => {
    for (const [name, spec] of Object.entries(corpus.specs)) {
      const fixture = corpus.fixtures[name];
      if (!fixture) continue;
      it(`${name}: input parses against inputSchema`, () => {
        const inputZod = jsonSchemaToZod(spec.inputSchema);
        expect(() => inputZod.parse(fixture.input)).not.toThrow();
      });
      it(`${name}: output parses against outputSchema`, () => {
        const outputZod = jsonSchemaToZod(spec.outputSchema);
        expect(() => outputZod.parse(fixture.output)).not.toThrow();
      });
      it(`${name}: round-trip JSON is byte-equivalent (key-sorted)`, () => {
        const inputZod = jsonSchemaToZod(spec.inputSchema);
        const outputZod = jsonSchemaToZod(spec.outputSchema);

        const parsedInput = inputZod.parse(fixture.input);
        const parsedOutput = outputZod.parse(fixture.output);

        expect(stableStringify(parsedInput)).toEqual(stableStringify(fixture.input));
        expect(stableStringify(parsedOutput)).toEqual(stableStringify(fixture.output));
      });
    }
  });
});

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}
