import type { ToolContext, ToolHandler } from '../registrar.js';

export const listSandboxConnections: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  return ctx.client.sandboxConnections.list(ctx.sandboxId, {
    include_revoked: input.include_revoked === true,
  });
};
