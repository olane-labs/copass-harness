export type DataSourceProvider =
  | 'slack'
  | 'github'
  | 'linear'
  | 'gmail'
  | 'jira'
  | 'notion'
  | 'custom'
  | 'pipedream'
  | 'user_mcp'
  | 'bigquery'
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
  /**
   * TRANSIENT — populated ONLY in the response from `register()` (when
   * the source's provider has a registered ingestor and `ingestion_mode`
   * is `'realtime'`) and from `rotateWebhookSecret()`. NEVER present on
   * `retrieve()` or `list()` responses. Plaintext signing secret the
   * caller pastes into their provider's HTTP step's
   * `Authorization: Bearer <secret>` header. After the response the
   * server only stores the sha256 hash — losing the plaintext means
   * rotating.
   */
  webhook_signing_secret?: string | null;
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

/**
 * Tenant-supplied MCP server registration payload.
 *
 * Backed by `POST /api/v1/storage/sandboxes/{sandboxId}/sources/user-mcp`.
 * The `token` is vault-put server-side under `user_mcp/<id>/auth`; only
 * the vault key reference lives on the row.
 */
export interface CreateUserMcpSourceRequest {
  name: string;
  /** User's MCP server URL. https only — http rejected except localhost. */
  base_url: string;
  /** `bearer` | `header_token` | `none`. */
  auth_kind: 'bearer' | 'header_token' | 'none';
  /** Required iff `auth_kind != 'none'`. Stored in vault, never echoed. */
  token?: string;
  /** Required iff `auth_kind === 'header_token'`. */
  auth_header?: string;
  /** Tool-name prefix (≤64 chars). Defaults to `data_source_id`. */
  app_namespace?: string;
  /** Per-source allowlist on top of the agent-level one. */
  allowed_tools?: string[];
  /** Tool calls to run on every pull. Empty = live-tools-only. */
  ingest_tool_calls?: Array<Record<string, unknown>>;
  /** Per-source tool-call rate cap. Default 60, max 600. */
  rate_cap_per_minute?: number;
  /** Per-source webhook firehose rate cap. Default 600, max 6000. */
  webhook_rate_cap_per_minute?: number;
}

/**
 * Result of a user_mcp lifecycle call.
 *
 * On success, `data_source_id` and `status` are populated. On
 * health-check failure, `status === 'error'` and `health_error` carries
 * a short reason. On validation failure (400), `error` and optional
 * `detail` are populated and the HTTP layer raises before reaching
 * here.
 */
export interface UserMcpSourceResult {
  data_source_id?: string;
  status?: DataSourceStatus;
  name?: string;
  ingestion_mode?: DataSourceIngestionMode;
  health_error?: string;
  error?: string;
  detail?: string;
}
