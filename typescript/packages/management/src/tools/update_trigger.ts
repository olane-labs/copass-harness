import type { UpdateTriggerRequest } from '@copass/core';

import type { ToolContext, ToolHandler } from '../registrar.js';

export const updateTrigger: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  const triggerId = String(input.trigger_id);
  const patch: UpdateTriggerRequest = {};
  if (typeof input.event_type_filter === 'string') {
    patch.event_type_filter = input.event_type_filter;
  }
  if ('rate_limit_per_hour' in input) {
    const v = input.rate_limit_per_hour;
    if (v === null) {
      patch.clear_rate_limit = true;
    } else if (typeof v === 'number') {
      patch.rate_limit_per_hour = v;
    }
  }
  if ('filter_config' in input) {
    const v = input.filter_config;
    if (v === null) {
      patch.clear_filter_config = true;
    } else if (typeof v === 'object' && v !== null) {
      patch.filter_config = v as Record<string, unknown>;
    }
  }
  const trigger = await ctx.client.agents.triggers.updateById(
    ctx.sandboxId,
    triggerId,
    patch,
  );
  return { trigger };
};
