import type { ToolContext, ToolHandler } from '../registrar.js';

export const updateAgentModelSettings: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  const slug = String(input.slug);
  const patch: Record<string, unknown> = {};
  if (input.backend === 'anthropic' || input.backend === 'google') {
    patch.backend = input.backend;
  }
  if (typeof input.model === 'string') {
    patch.model = input.model;
  }
  if (typeof input.temperature === 'number') {
    patch.temperature = input.temperature;
  }
  if (typeof input.max_tokens === 'number') {
    patch.max_tokens = input.max_tokens;
  }
  if (typeof input.max_turns === 'number') {
    patch.max_turns = input.max_turns;
  }
  if (typeof input.timeout_s === 'number') {
    patch.timeout_s = input.timeout_s;
  }
  const agent = await ctx.client.agents.updateModelSettings(
    ctx.sandboxId,
    slug,
    patch as Parameters<typeof ctx.client.agents.updateModelSettings>[2],
  );
  return { agent };
};
