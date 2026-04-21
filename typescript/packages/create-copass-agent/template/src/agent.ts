import { anthropic } from '@ai-sdk/anthropic';
import { copassTools } from '@copass/ai-sdk';
import type { ContextWindow } from '@copass/core';
import { generateText } from 'ai';
import { getCopass, getSandboxId } from './copass.js';

const SYSTEM_PROMPT = `You are a knowledgeable assistant grounded in the user's knowledge graph.

For every user turn:
1. Start with \`discover\` to see what's relevant. Cheap and fast.
2. If specific items look valuable, call \`interpret\` on their canonical_ids tuples for a brief.
3. If the question is broad and self-contained, prefer \`search\` for a direct synthesized answer.

Answer directly and concisely. Cite canonical_ids where it helps the user verify.`;

export async function chat(args: {
  message: string;
  window: ContextWindow;
}): Promise<string> {
  const { message, window } = args;
  const copass = getCopass();
  const sandbox_id = getSandboxId();

  // Record the user turn so it lands in the graph and the window buffer.
  await window.addTurn({ role: 'user', content: message });

  const tools = copassTools({
    client: copass,
    sandbox_id,
    window,
    preset: 'auto',
  });

  const { text } = await generateText({
    model: anthropic('claude-opus-4-7'),
    system: SYSTEM_PROMPT,
    tools,
    maxSteps: 5,
    prompt: message,
  });

  // Record the assistant turn.
  await window.addTurn({ role: 'assistant', content: text });

  return text;
}
