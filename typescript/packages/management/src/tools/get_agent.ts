import type { ToolContext, ToolHandler } from '../registrar.js';

export const getAgent: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  const slug = String(input.slug);
  return ctx.client.agents.retrieve(ctx.sandboxId, slug);
};
