import type { ToolContext, ToolHandler } from '../registrar.js';

export const resumeTrigger: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  const triggerId = String(input.trigger_id);
  const trigger = await ctx.client.agents.triggers.updateById(
    ctx.sandboxId,
    triggerId,
    { status: 'active' },
  );
  return { trigger };
};
