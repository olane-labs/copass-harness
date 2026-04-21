import { describe, it, expect, vi } from 'vitest';
import { FakeChatModel } from '@langchain/core/utils/testing';
import { AIMessage } from '@langchain/core/messages';
import { createCopassAgent } from '../../src/agent.js';
import type { CopassClient, ContextWindow, ChatMessage } from '@copass/core';

// FakeChatModel doesn't implement `bindTools`, which createReactAgent needs.
// Stub it as a no-op — we don't actually emit tool calls in these tests.
class AgentCompatibleFakeChatModel extends FakeChatModel {
  bindTools() {
    return this;
  }
}

function fakeCopassClient(): CopassClient {
  return {
    retrieval: {
      discover: vi.fn(),
      interpret: vi.fn(),
      search: vi.fn(),
    },
  } as unknown as CopassClient;
}

function fakeWindow(initialTurns: ChatMessage[] = []): ContextWindow {
  const turns = [...initialTurns];
  return {
    dataSourceId: 'ds_test',
    sandboxId: 'sb_test',
    getTurns: () => [...turns],
    addTurn: vi.fn(async (turn: ChatMessage) => {
      turns.push(turn);
    }),
  } as unknown as ContextWindow;
}

describe('createCopassAgent', () => {
  it('returns a Runnable-shaped object', () => {
    const agent = createCopassAgent({
      client: fakeCopassClient(),
      sandbox_id: 'sb_test',
      window: fakeWindow(),
      llm: new AgentCompatibleFakeChatModel({}),
    });

    expect(agent).toBeDefined();
    expect(typeof agent.invoke).toBe('function');
    expect(typeof agent.stream).toBe('function');
    expect(typeof agent.streamEvents).toBe('function');
    expect(typeof agent.batch).toBe('function');
    expect(typeof agent.pipe).toBe('function');
    expect(typeof agent.withConfig).toBe('function');
  });

  it('mirrors conversation turns into the Context Window on invoke', async () => {
    const window = fakeWindow();

    // FakeChatModel returns a constant AIMessage reply. No tool calls — we
    // just want to see the dev's user message get auto-mirrored into the
    // window via CopassWindowCallback.handleChatModelStart.
    const llm = new AgentCompatibleFakeChatModel({});
    vi.spyOn(llm, '_generate').mockResolvedValue({
      generations: [
        {
          text: 'ok',
          message: new AIMessage('ok'),
        },
      ],
    });

    const agent = createCopassAgent({
      client: fakeCopassClient(),
      sandbox_id: 'sb_test',
      window,
      llm,
    });

    await agent.invoke({
      messages: [{ role: 'user', content: 'why is checkout flaky?' }],
    });

    expect(window.addTurn).toHaveBeenCalledWith({
      role: 'user',
      content: 'why is checkout flaky?',
    });
  });
});
