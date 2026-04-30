import type { ToolContext, ToolHandler } from '../registrar.js';

export const listApps: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  return ctx.client.integrations.catalog(ctx.sandboxId, {
    q: typeof input.q === 'string' ? input.q : undefined,
    cursor: typeof input.cursor === 'string' ? input.cursor : undefined,
    limit: typeof input.limit === 'number' ? input.limit : undefined,
  });
};
