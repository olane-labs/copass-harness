import { describe, it, expect } from 'vitest';
import { WindowRegistry } from '../../src/windows.js';
import type { ContextWindow } from '@copass/core';

function fakeWindow(id: string): ContextWindow {
  return { dataSourceId: id } as unknown as ContextWindow;
}

describe('WindowRegistry', () => {
  it('set() makes a window active and resolvable', () => {
    const registry = new WindowRegistry();
    const w = fakeWindow('ds1');

    registry.set(w);

    expect(registry.activeDataSourceId).toBe('ds1');
    expect(registry.resolve()).toBe(w);
    expect(registry.resolve('ds1')).toBe(w);
  });

  it('resolve() with unknown id returns undefined', () => {
    const registry = new WindowRegistry();
    expect(registry.resolve('missing')).toBeUndefined();
  });

  it('activate() promotes an existing window, throws for unknown ids', () => {
    const registry = new WindowRegistry();
    registry.set(fakeWindow('ds1'));
    registry.set(fakeWindow('ds2'));

    registry.activate('ds1');
    expect(registry.activeDataSourceId).toBe('ds1');

    expect(() => registry.activate('missing')).toThrow(/No window registered/);
  });

  it('drop() clears active when it matches', () => {
    const registry = new WindowRegistry();
    registry.set(fakeWindow('ds1'));
    registry.set(fakeWindow('ds2'));

    registry.drop('ds2');
    expect(registry.activeDataSourceId).toBeNull();
    expect(registry.resolve('ds1')).toBeDefined();
  });

  it('drop() of non-active leaves active untouched', () => {
    const registry = new WindowRegistry();
    registry.set(fakeWindow('ds1'));
    registry.set(fakeWindow('ds2'));
    // ds2 is active

    registry.drop('ds1');
    expect(registry.activeDataSourceId).toBe('ds2');
  });
});
