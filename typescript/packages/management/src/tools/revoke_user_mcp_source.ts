import type { ToolContext, ToolHandler } from '../registrar.js';

export const revokeUserMcpSource: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  const sourceId = String(input.data_source_id);
  return ctx.client.sources.revokeUserMcp(ctx.sandboxId, sourceId);
};
