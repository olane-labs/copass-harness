import type {
  ConnectionRole,
  CreateSandboxConnectionRequest,
} from '@copass/core';

import type { ToolContext, ToolHandler } from '../registrar.js';

export const grantSandboxConnection: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  const role = String(input.role) as ConnectionRole;
  const request: CreateSandboxConnectionRequest = { role };
  if (typeof input.copass_id === 'string') {
    request.copass_id = input.copass_id;
  }
  if (typeof input.user_id === 'string') {
    request.user_id = input.user_id;
  }
  if (typeof input.project_id === 'string') {
    request.project_id = input.project_id;
  }
  if (typeof input.label === 'string') {
    request.label = input.label;
  }
  if (typeof input.expires_at === 'string') {
    request.expires_at = input.expires_at;
  }
  return ctx.client.sandboxConnections.create(ctx.sandboxId, request);
};
