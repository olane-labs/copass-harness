import type { ToolContext, ToolHandler } from '../registrar.js';

export const listConnectedAccounts: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  return ctx.client.integrations.listAccounts(ctx.sandboxId, {
    app_slug: typeof input.app_slug === 'string' ? input.app_slug : undefined,
  });
};
