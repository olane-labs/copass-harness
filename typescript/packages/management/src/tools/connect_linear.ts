import type { ToolContext, ToolHandler } from '../registrar.js';

type ConnectLinearRequest = Parameters<
  ToolContext['client']['sources']['connectLinear']
>[1];

export const connectLinear: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  const request: ConnectLinearRequest = {
    api_key: String(input.api_key),
  };
  if (typeof input.name === 'string') {
    request.name = input.name;
  }
  if (Array.isArray(input.include)) {
    request.include = input.include.map(String) as ConnectLinearRequest['include'];
  }
  if (typeof input.rate_cap_per_minute === 'number') {
    request.rate_cap_per_minute = input.rate_cap_per_minute;
  }
  if (typeof input.poll_interval_seconds === 'number') {
    request.poll_interval_seconds = input.poll_interval_seconds;
  }
  return ctx.client.sources.connectLinear(ctx.sandboxId, request);
};
