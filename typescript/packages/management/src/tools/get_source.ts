import type { ToolContext, ToolHandler } from '../registrar.js';

export const getSource: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  const dataSourceId = String(input.data_source_id);
  return ctx.client.sources.retrieve(ctx.sandboxId, dataSourceId);
};
