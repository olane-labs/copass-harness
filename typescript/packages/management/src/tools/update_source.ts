import type {
  DataSourceIngestionMode,
  UpdateDataSourceRequest,
} from '@copass/core';

import type { ToolContext, ToolHandler } from '../registrar.js';

export const updateSource: ToolHandler = async (
  ctx: ToolContext,
  input: Record<string, unknown>,
) => {
  const sourceId = String(input.data_source_id);
  const updates: UpdateDataSourceRequest = {};
  if (typeof input.name === 'string') {
    updates.name = input.name;
  }
  if (typeof input.ingestion_mode === 'string') {
    updates.ingestion_mode = input.ingestion_mode as DataSourceIngestionMode;
  }
  if (typeof input.external_account_id === 'string') {
    updates.external_account_id = input.external_account_id;
  }
  if (typeof input.poll_interval_seconds === 'number') {
    updates.poll_interval_seconds = input.poll_interval_seconds;
  }

  let mergeAdapterConfig = false;
  let adapterConfig: Record<string, unknown> | undefined;
  if (
    typeof input.adapter_config === 'object' &&
    input.adapter_config !== null
  ) {
    adapterConfig = { ...(input.adapter_config as Record<string, unknown>) };
  }
  if (typeof input.ingest_to_graph === 'boolean') {
    adapterConfig = { ...(adapterConfig ?? {}), ingest_to_graph: input.ingest_to_graph };
    mergeAdapterConfig = true;
  }
  if (adapterConfig !== undefined) {
    updates.adapter_config = adapterConfig;
  }

  const source = await ctx.client.sources.update(
    ctx.sandboxId,
    sourceId,
    updates,
    { mergeAdapterConfig },
  );
  return { source };
};
