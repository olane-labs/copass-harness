import type { ToolContext, ToolHandler } from '../registrar.js';

export const listTriggerComponents: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  return ctx.client.agents.listTriggerComponents(ctx.sandboxId, {
    app: typeof input.app === 'string' ? input.app : undefined,
    q: typeof input.q === 'string' ? input.q : undefined,
    limit: typeof input.limit === 'number' ? input.limit : undefined,
  });
};
