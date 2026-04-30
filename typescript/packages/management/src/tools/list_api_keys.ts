import type { ToolContext, ToolHandler } from '../registrar.js';

export const listApiKeys: ToolHandler = async (ctx: ToolContext) => {
  // The core resource returns a flat list — wrap into the shape the spec
  // declares (`{ keys, count }`). Filtering by `kinds` / `include_revoked`
  // is server-side once the API exposes those query params; today we
  // surface the inventory and let the caller filter post-hoc.
  const keys = await ctx.client.apiKeys.list();
  return { keys, count: Array.isArray(keys) ? keys.length : 0 };
};
