import type { ToolContext, ToolHandler } from '../registrar.js';

export const listRuns: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  const slug = String(input.agent_slug);
  const limit = typeof input.limit === 'number' ? input.limit : undefined;
  return ctx.client.agents.listRuns(ctx.sandboxId, slug, { limit });
};
