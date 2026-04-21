import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWindowTracker } from '../../src/window-tracker.js';
import type { ContextWindow, ChatMessage } from '@copass/core';

function fakeWindow(initialTurns: ChatMessage[] = []): ContextWindow {
  const turns = [...initialTurns];
  return {
    getTurns: () => [...turns],
    addTurn: vi.fn(async (turn: ChatMessage) => {
      turns.push(turn);
    }),
  } as unknown as ContextWindow;
}

describe('createWindowTracker (Mastra)', () => {
  let window: ContextWindow;

  beforeEach(() => {
    window = fakeWindow();
  });

  it('recordUserTurn + onStepFinish together mirror a full turn', async () => {
    const tracker = createWindowTracker({ window });

    await tracker.recordUserTurn('why is checkout flaky?');
    await tracker.onStepFinish({
      response: {
        messages: [{ role: 'assistant', content: 'Checkout retries on 5xx.' }],
      },
    });

    expect(window.addTurn).toHaveBeenCalledTimes(2);
    expect(window.addTurn).toHaveBeenNthCalledWith(1, {
      role: 'user',
      content: 'why is checkout flaky?',
    });
    expect(window.addTurn).toHaveBeenNthCalledWith(2, {
      role: 'assistant',
      content: 'Checkout retries on 5xx.',
    });
  });

  it('skips tool messages by default', async () => {
    const tracker = createWindowTracker({ window });
    await tracker.onStepFinish({
      response: {
        messages: [
          { role: 'tool', content: 'tool result' },
          { role: 'assistant', content: 'a' },
        ],
      },
    });

    expect(window.addTurn).toHaveBeenCalledTimes(1);
  });

  it('deduplicates on repeat', async () => {
    const tracker = createWindowTracker({ window });
    await tracker.recordUserTurn('q');
    await tracker.recordUserTurn('q');

    expect(window.addTurn).toHaveBeenCalledTimes(1);
  });

  it('seeds dedup set from existing window turns', async () => {
    const seeded = fakeWindow([{ role: 'user', content: 'q1' }]);
    const tracker = createWindowTracker({ window: seeded });

    await tracker.recordUserTurn('q1');
    expect(seeded.addTurn).not.toHaveBeenCalled();
  });
});
