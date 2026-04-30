import type { ToolContext, ToolHandler } from '../registrar.js';

export const listTriggers: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  const slug = String(input.agent_slug);
  return ctx.client.agents.triggers.list(ctx.sandboxId, slug);
};
