import type { ToolContext, ToolHandler } from '../registrar.js';

export const revokeSandboxConnection: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  const connectionId = String(input.connection_id);
  return ctx.client.sandboxConnections.revoke(ctx.sandboxId, connectionId);
};
