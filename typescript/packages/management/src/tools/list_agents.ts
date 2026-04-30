import type { ToolContext, ToolHandler } from '../registrar.js';

export const listAgents: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  return ctx.client.agents.list(ctx.sandboxId, {
    status:
      input.status === 'active' || input.status === 'archived'
        ? input.status
        : undefined,
  });
};
