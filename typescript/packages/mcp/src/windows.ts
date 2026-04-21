import type { ContextWindow } from '@copass/core';

/**
 * In-memory registry of open Context Windows.
 *
 * Tracks a map of `data_source_id → ContextWindow` plus a single "active"
 * window id. Retrieval and add-turn tools use the active window implicitly
 * so the LLM doesn't have to thread an id on every call.
 *
 * For multi-window use cases, callers pass `data_source_id` explicitly and
 * the active id is ignored.
 */
export class WindowRegistry {
  private readonly windows = new Map<string, ContextWindow>();
  private activeId: string | null = null;

  /** Register a new window and make it active. */
  set(window: ContextWindow): void {
    this.windows.set(window.dataSourceId, window);
    this.activeId = window.dataSourceId;
  }

  /** Look up a window by id, or fall back to the active one. */
  resolve(dataSourceId?: string): ContextWindow | undefined {
    const id = dataSourceId ?? this.activeId;
    return id ? this.windows.get(id) : undefined;
  }

  /** Make an existing window the active one. Throws if unknown. */
  activate(dataSourceId: string): ContextWindow {
    const window = this.windows.get(dataSourceId);
    if (!window) {
      throw new Error(
        `No window registered for data_source_id="${dataSourceId}" — call context_window_create or context_window_attach first.`,
      );
    }
    this.activeId = dataSourceId;
    return window;
  }

  /** Drop a window from the registry. Clears active if it matched. */
  drop(dataSourceId: string): void {
    this.windows.delete(dataSourceId);
    if (this.activeId === dataSourceId) this.activeId = null;
  }

  get activeDataSourceId(): string | null {
    return this.activeId;
  }
}
