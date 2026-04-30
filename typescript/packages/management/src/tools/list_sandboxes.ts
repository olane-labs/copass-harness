import type { ToolContext, ToolHandler } from '../registrar.js';

export const listSandboxes: ToolHandler = async (ctx: ToolContext) => {
  return ctx.client.sandboxes.list();
};
