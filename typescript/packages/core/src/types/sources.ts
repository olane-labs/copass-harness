export type DataSourceProvider =
  | 'slack'
  | 'github'
  | 'linear'
  | 'gmail'
  | 'jira'
  | 'notion'
  | 'custom'
  | string;

export type DataSourceIngestionMode = 'realtime' | 'polling' | 'batch' | 'manual';
export type DataSourceStatus =
  | 'active'
  | 'paused'
  | 'disconnected'
  | 'error'
  | 'archived'
  | string;

/**
 * Lifecycle category for a data source.
 *
 * - `durable` (default) — lives until explicitly deleted.
 * - `ephemeral` — auto-archived after a period of inactivity. Data (chunks
 *   + graph events) is preserved on archive; only the source record flips
 *   to inactive. Used by the SDK's Context Window primitive.
 */
export type DataSourceKind = 'durable' | 'ephemeral';

export interface DataSource {
  data_source_id: string;
  user_id: string;
  sandbox_id: string;
  provider: DataSourceProvider;
  name: string;
  ingestion_mode: DataSourceIngestionMode;
  status: DataSourceStatus;
  kind?: DataSourceKind;
  external_account_id?: string;
  adapter_config: Record<string, unknown>;
  poll_interval_seconds?: number;
  webhook_url?: string;
  last_sync_at?: string;
  created_at?: string;
}

export interface CreateDataSourceRequest {
  provider: DataSourceProvider;
  name: string;
  ingestion_mode?: DataSourceIngestionMode;
  /**
   * Lifecycle category. Defaults to `durable` when omitted. Set to
   * `ephemeral` for time-bound sources like agent conversation threads.
   */
  kind?: DataSourceKind;
  external_account_id?: string;
  adapter_config?: Record<string, unknown>;
  /** Minimum 60 seconds enforced server-side. Only meaningful for `polling` mode. */
  poll_interval_seconds?: number;
}

export interface UpdateDataSourceRequest {
  name?: string;
  ingestion_mode?: DataSourceIngestionMode;
  external_account_id?: string;
  adapter_config?: Record<string, unknown>;
  /** Minimum 60 seconds enforced server-side. */
  poll_interval_seconds?: number;
}

export interface ListDataSourcesOptions {
  provider?: DataSourceProvider;
  status?: DataSourceStatus;
}

export interface DataSourceListResponse {
  sources: DataSource[];
  count: number;
}
