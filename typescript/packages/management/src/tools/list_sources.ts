import type { ToolContext, ToolHandler } from '../registrar.js';

export const listSources: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  return ctx.client.sources.list(ctx.sandboxId, {
    provider: typeof input.provider === 'string' ? input.provider : undefined,
  });
};
