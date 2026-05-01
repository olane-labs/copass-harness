import type { CreateTriggerRequest } from '@copass/core';

import type { ToolContext, ToolHandler } from '../registrar.js';

export const createTrigger: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  const agentSlug = String(input.agent_slug);
  const dataSourceId = String(input.data_source_id);
  const eventType =
    typeof input.event_type_filter === 'string' && input.event_type_filter.length > 0
      ? input.event_type_filter
      : '*';
  const request: CreateTriggerRequest = {
    data_source_id: dataSourceId,
    event_type_filter: eventType,
  };
  if (
    typeof input.filter_config === 'object' &&
    input.filter_config !== null
  ) {
    request.filter_config = input.filter_config as Record<string, unknown>;
  }
  if (typeof input.rate_limit_per_hour === 'number') {
    request.rate_limit_per_hour = input.rate_limit_per_hour;
  }
  const trigger = await ctx.client.agents.triggers.create(
    ctx.sandboxId,
    agentSlug,
    request,
  );
  return { trigger };
};
