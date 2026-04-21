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

describe('createWindowTracker', () => {
  let window: ContextWindow;

  beforeEach(() => {
    window = fakeWindow();
  });

  it('recordUserTurn adds a user turn', async () => {
    const tracker = createWindowTracker({ window });
    await tracker.recordUserTurn('why is checkout flaky?');

    expect(window.addTurn).toHaveBeenCalledWith({
      role: 'user',
      content: 'why is checkout flaky?',
    });
  });

  it('onStepFinish adds assistant messages', async () => {
    const tracker = createWindowTracker({ window });
    await tracker.onStepFinish({
      response: {
        messages: [{ role: 'assistant', content: 'Checkout retries on 5xx.' }],
      },
    });

    expect(window.addTurn).toHaveBeenCalledWith({
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
    expect(window.addTurn).toHaveBeenCalledWith({ role: 'assistant', content: 'a' });
  });

  it('includes tool messages when opted in', async () => {
    const tracker = createWindowTracker({ window, includeToolMessages: true });
    await tracker.onStepFinish({
      response: {
        messages: [{ role: 'tool', content: 'tool result' }],
      },
    });

    expect(window.addTurn).toHaveBeenCalledWith({ role: 'system', content: 'tool result' });
  });

  it('skips empty content messages', async () => {
    const tracker = createWindowTracker({ window });
    await tracker.onStepFinish({
      response: { messages: [{ role: 'assistant', content: '' }] },
    });

    expect(window.addTurn).not.toHaveBeenCalled();
  });

  it('deduplicates across multiple step calls', async () => {
    const tracker = createWindowTracker({ window });
    await tracker.recordUserTurn('q1');
    await tracker.onStepFinish({
      response: { messages: [{ role: 'assistant', content: 'a1' }] },
    });
    // Second step: the AI SDK typically doesn't re-send prior assistant messages
    // in response.messages, but if it does, we dedupe.
    await tracker.onStepFinish({
      response: { messages: [{ role: 'assistant', content: 'a1' }] },
    });

    expect(window.addTurn).toHaveBeenCalledTimes(2);
  });

  it('seeds dedup set from existing window turns', async () => {
    const seeded = fakeWindow([{ role: 'user', content: 'q1' }]);
    const tracker = createWindowTracker({ window: seeded });

    await tracker.recordUserTurn('q1');
    await tracker.onStepFinish({
      response: { messages: [{ role: 'assistant', content: 'a1' }] },
    });

    expect(seeded.addTurn).toHaveBeenCalledTimes(1);
    expect(seeded.addTurn).toHaveBeenCalledWith({ role: 'assistant', content: 'a1' });
  });

  it('flattens array-content messages', async () => {
    const tracker = createWindowTracker({ window });
    await tracker.onStepFinish({
      response: {
        messages: [
          {
            role: 'assistant',
            content: [
              { type: 'text', text: 'First' },
              { type: 'text', text: 'Second' },
            ],
          },
        ],
      },
    });

    expect(window.addTurn).toHaveBeenCalledWith({
      role: 'assistant',
      content: 'First\nSecond',
    });
  });
});
