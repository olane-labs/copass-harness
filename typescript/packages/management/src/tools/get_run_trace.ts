import type { ToolContext, ToolHandler } from '../registrar.js';

export const getRunTrace: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  const runId = String(input.run_id);
  return ctx.client.agents.getRun(ctx.sandboxId, runId);
};
