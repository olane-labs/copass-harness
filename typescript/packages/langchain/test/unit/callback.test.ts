import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { CopassWindowCallback } from '../../src/callback.js';
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

async function flush() {
  // handleChatModelStart fires window.addTurn without awaiting (fire-and-forget);
  // yield so the microtasks settle before we assert.
  await new Promise((r) => setTimeout(r, 0));
}

describe('CopassWindowCallback', () => {
  let window: ContextWindow;

  beforeEach(() => {
    window = fakeWindow();
  });

  it('adds a user HumanMessage as a user turn', async () => {
    const cb = new CopassWindowCallback({ window });
    await cb.handleChatModelStart(null, [[new HumanMessage('why is checkout flaky?')]]);
    await flush();

    expect(window.addTurn).toHaveBeenCalledTimes(1);
    expect(window.addTurn).toHaveBeenCalledWith({
      role: 'user',
      content: 'why is checkout flaky?',
    });
  });

  it('adds an AIMessage as an assistant turn', async () => {
    const cb = new CopassWindowCallback({ window });
    await cb.handleChatModelStart(null, [[new AIMessage('Checkout retries on 5xx.')]]);
    await flush();

    expect(window.addTurn).toHaveBeenCalledWith({
      role: 'assistant',
      content: 'Checkout retries on 5xx.',
    });
  });

  it('skips ToolMessages by default', async () => {
    const cb = new CopassWindowCallback({ window });
    await cb.handleChatModelStart(null, [
      [
        new HumanMessage('q'),
        new ToolMessage({ content: 'tool result', tool_call_id: 't1' }),
      ],
    ]);
    await flush();

    expect(window.addTurn).toHaveBeenCalledTimes(1);
    expect(window.addTurn).toHaveBeenCalledWith({ role: 'user', content: 'q' });
  });

  it('includes ToolMessages as system turns when includeToolMessages=true', async () => {
    const cb = new CopassWindowCallback({ window, includeToolMessages: true });
    await cb.handleChatModelStart(null, [
      [new ToolMessage({ content: 'tool result', tool_call_id: 't1' })],
    ]);
    await flush();

    expect(window.addTurn).toHaveBeenCalledWith({ role: 'system', content: 'tool result' });
  });

  it('skips empty-content AIMessages (pure tool-call triggers)', async () => {
    const cb = new CopassWindowCallback({ window });
    await cb.handleChatModelStart(null, [[new AIMessage('')]]);
    await flush();

    expect(window.addTurn).not.toHaveBeenCalled();
  });

  it('de-duplicates repeated messages across calls', async () => {
    const cb = new CopassWindowCallback({ window });

    // Step 1: user message only.
    await cb.handleChatModelStart(null, [[new HumanMessage('q1')]]);
    await flush();
    // Step 2: same user message + new assistant message (typical ReAct flow).
    await cb.handleChatModelStart(null, [
      [new HumanMessage('q1'), new AIMessage('answer')],
    ]);
    await flush();

    expect(window.addTurn).toHaveBeenCalledTimes(2);
    expect(window.addTurn).toHaveBeenNthCalledWith(1, { role: 'user', content: 'q1' });
    expect(window.addTurn).toHaveBeenNthCalledWith(2, { role: 'assistant', content: 'answer' });
  });

  it('seeds dedup set from the window existing turns', async () => {
    const seeded = fakeWindow([{ role: 'user', content: 'q1' }]);
    const cb = new CopassWindowCallback({ window: seeded });

    await cb.handleChatModelStart(null, [[new HumanMessage('q1'), new AIMessage('a1')]]);
    await flush();

    // q1 should NOT be re-added; only a1 is new.
    expect(seeded.addTurn).toHaveBeenCalledTimes(1);
    expect(seeded.addTurn).toHaveBeenCalledWith({ role: 'assistant', content: 'a1' });
  });

  it('handles array content (multi-part messages)', async () => {
    const cb = new CopassWindowCallback({ window });
    const msg = new HumanMessage({
      content: [
        { type: 'text', text: 'Look at this:' },
        { type: 'text', text: 'the screenshot' },
      ],
    });

    await cb.handleChatModelStart(null, [[msg]]);
    await flush();

    expect(window.addTurn).toHaveBeenCalledWith({
      role: 'user',
      content: 'Look at this:\nthe screenshot',
    });
  });
});
