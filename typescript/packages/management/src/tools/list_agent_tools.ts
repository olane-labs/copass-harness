import type { ToolContext, ToolHandler } from '../registrar.js';

export const listAgentTools: ToolHandler = async (ctx: ToolContext) => {
  return ctx.client.agents.listTools(ctx.sandboxId);
};
