import type { ToolContext, ToolHandler } from '../registrar.js';

export const testUserMcpSource: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  const sourceId = String(input.data_source_id);
  return ctx.client.sources.testUserMcp(ctx.sandboxId, sourceId);
};
