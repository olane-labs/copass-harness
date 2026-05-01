import type { CreateDataSourceRequest, DataSourceIngestionMode, DataSourceKind } from '@copass/core';

import type { ToolContext, ToolHandler } from '../registrar.js';

export const provisionSource: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  const adapterConfig: Record<string, unknown> =
    typeof input.adapter_config === 'object' && input.adapter_config !== null
      ? { ...(input.adapter_config as Record<string, unknown>) }
      : {};
  if (input.ingest_to_graph === true) {
    adapterConfig.ingest_to_graph = true;
  }

  const request: CreateDataSourceRequest = {
    provider: typeof input.provider === 'string' ? input.provider : 'pipedream',
    name: String(input.name),
  };
  if (typeof input.ingestion_mode === 'string') {
    request.ingestion_mode = input.ingestion_mode as DataSourceIngestionMode;
  }
  if (input.kind === 'durable' || input.kind === 'ephemeral') {
    request.kind = input.kind as DataSourceKind;
  }
  if (typeof input.external_account_id === 'string') {
    request.external_account_id = input.external_account_id;
  }
  if (typeof input.poll_interval_seconds === 'number') {
    request.poll_interval_seconds = input.poll_interval_seconds;
  }
  if (Object.keys(adapterConfig).length > 0) {
    request.adapter_config = adapterConfig;
  }

  const source = await ctx.client.sources.register(ctx.sandboxId, request);
  return { source };
};
