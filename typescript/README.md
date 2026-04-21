# Copass TypeScript Packages

pnpm workspace monorepo for every `@copass/*` TypeScript package and the `create-copass-agent` scaffolder. Package discovery is driven by `pnpm-workspace.yaml`.

For the product-level "which package do I want?" decision tree, see the [root README](../README.md). This file is the workspace-dev entry point.

## Packages

**Client SDK**
| Package | Purpose |
|---|---|
| [`@copass/core`](./packages/core) | Client SDK — auth, retrieval, Context Window, sandboxes, sources, ingest |

**Agent-framework adapters** (LLM picks between `discover` / `interpret` / `search`)
| Package | Target framework |
|---|---|
| [`@copass/ai-sdk`](./packages/ai-sdk) | Vercel AI SDK |
| [`@copass/langchain`](./packages/langchain) | LangChain / LangGraph |
| [`@copass/mastra`](./packages/mastra) | Mastra |

**Anthropic-managed stack**
| Package | Purpose |
|---|---|
| [`@copass/mcp`](./packages/mcp) | Standalone MCP server — `npx @copass/mcp` for Claude Code / Desktop / Cursor / Agent SDK |

**Scaffolding + drivers**
| Package | Purpose |
|---|---|
| [`create-copass-agent`](./packages/create-copass-agent) | `npx create-copass-agent my-app` — Hono + Claude starter |
| [`@copass/datasource-fs`](./packages/datasource-fs) | Filesystem watcher driver — scans, watches, pushes file events |
| [`@copass/datasource-olane`](./packages/datasource-olane) | Olane OS driver — local OS lifecycle, worlds, address book |

## Development

```bash
pnpm install         # install all workspaces
pnpm run build       # build every package
pnpm run typecheck   # tsc --noEmit across all packages
pnpm run lint        # eslint across all packages
pnpm test            # vitest across all packages
pnpm run format      # prettier write
```

To operate on a single package: `pnpm --filter @copass/<name> <script>`, e.g. `pnpm --filter @copass/ai-sdk test`.

## Adding a new package

1. Create `packages/<name>/` with `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`.
2. Extend `../../tsconfig.base.json` from your package's `tsconfig.json`.
3. For internal links to other workspace packages, use `"workspace:*"` in devDependencies so pnpm uses the local copy (and NOT the npm registry).
4. Run `pnpm install` from the workspace root.
5. Mirror the README shape used by the other packages (positioning line → prereqs → install → quickstart → why-this → related).

## Releasing

Independent versioning via Lerna + Conventional Commits. See [`RELEASING.md`](./RELEASING.md) for the workflow, npm/GitHub credentials setup, commit conventions, and dry-run checklist.
