import { BaseResource } from './base.js';
import type {
  IngestTextRequest,
  IngestJobResponse,
  IngestJobStatus,
} from '../types/ingest.js';

const SHORTHAND = '/api/v1/storage/ingest';
const explicitBase = (sandboxId: string) =>
  `/api/v1/storage/sandboxes/${sandboxId}/ingest`;

/**
 * Ingest resource — low-level handle to the chunking + ontology ingestion
 * pipeline. Prefer {@link SourcesResource.ingest} for normal use: the harness
 * is **data-source driven**, so every production event should be attributed
 * to a registered data source.
 *
 * Use this resource directly only for:
 *  - Quick-start / REPL experiments via {@link text}
 *  - Polling or retrieving job status via {@link getJob} / {@link getSandboxJob}
 *
 * All ingestion flows through the copass-id storage layer, which resolves a
 * sandbox, dispatches a chunking job, and passes the DEK through the queue
 * ephemerally when encryption is active. The deprecated `/api/v1/extract/*`
 * endpoints are no longer supported.
 *
 * Two entry points:
 *  - {@link text}: shorthand that auto-resolves the caller's primary sandbox
 *    and default project. Untagged — no data source attribution.
 *  - {@link textInSandbox}: explicit sandbox_id. Pass `data_source_id` to
 *    attribute the event, or prefer `client.sources.ingest(...)` which wires
 *    it for you.
 */
export class IngestResource extends BaseResource {
  /**
   * Submit text to the caller's primary sandbox.
   *
   * Returns 202 with a `job_id`; poll with {@link getJob}.
   */
  async text(request: IngestTextRequest): Promise<IngestJobResponse> {
    return this.post<IngestJobResponse>(SHORTHAND, request);
  }

  /** Poll job status for a shorthand-submitted ingestion. */
  async getJob(jobId: string): Promise<IngestJobStatus> {
    return this.get<IngestJobStatus>(`${SHORTHAND}/${jobId}`);
  }

  /**
   * Submit text to a specific sandbox. Use when the caller manages multiple
   * sandboxes; otherwise prefer {@link text}.
   */
  async textInSandbox(
    sandboxId: string,
    request: IngestTextRequest,
  ): Promise<IngestJobResponse> {
    return this.post<IngestJobResponse>(explicitBase(sandboxId), request);
  }

  /** Poll job status for an explicit-sandbox ingestion. */
  async getSandboxJob(sandboxId: string, jobId: string): Promise<IngestJobStatus> {
    return this.get<IngestJobStatus>(`${explicitBase(sandboxId)}/${jobId}`);
  }
}
