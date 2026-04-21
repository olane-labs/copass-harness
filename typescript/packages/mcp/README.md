# @copass/mcp

**Standalone MCP server for [Copass](https://copass.id).** Exposes retrieval + Context Window as MCP tools for any client — Claude Code, Claude Desktop, Cursor, Claude Agent SDK, or your own.

## Prerequisites

Install the Copass CLI and bootstrap your account:

```bash
npm install -g @copass/cli
copass login       # email OTP
copass setup       # creates a sandbox, writes .olane/refs.json
```

Pull the two values your MCP client needs into scope:

| File | Contains | Use as |
|---|---|---|
| `~/.olane/config.json` | `access_token` | `COPASS_API_KEY` |
| `./.olane/refs.json` | `sandbox_id` | `COPASS_SANDBOX_ID` |

Ingest some content so the tools have something to return:

```bash
copass ingest path/to/file.md
```

## Connect your MCP client

Drop this into your client's MCP config. Paste `access_token` and `sandbox_id` from the two files above:

```json
{
  "mcpServers": {
    "copass": {
      "command": "npx",
      "args": ["-y", "@copass/mcp"],
      "env": {
        "COPASS_API_KEY": "<access_token from ~/.olane/config.json>",
        "COPASS_SANDBOX_ID": "<sandbox_id from .olane/refs.json>"
      }
    }
  }
}
```

Config locations:

| Client | Config file |
|---|---|
| Claude Code | `~/.claude.json` (per-user) or `./.mcp.json` (per-project) |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) |
| Cursor | `~/.cursor/mcp.json` |
| Claude Agent SDK | Whatever your SDK app loads |

Restart the client after editing. If you see `copass` in the tool picker, you're live.

## Verify

Ask Claude "what tools do you have from copass?" — it should list `discover`, `interpret`, `search`, `context_window_create`, `context_window_add_turn`, `context_window_attach`, `context_window_close`, `ingest`.

Then try: *"Use `context_window_create` and then discover anything about checkout retry behavior."* If retrieval returns something, you're end-to-end.

## Tools

**Retrieval:**
- `discover` — ranked menu of relevant context
- `interpret` — brief pinned to picked items
- `search` — full synthesized answer

**Context Window** — persistent, window-aware memory across turns:
- `context_window_create` — open a new window (returns `data_source_id`)
- `context_window_add_turn` — log a user / assistant / system turn
- `context_window_attach` — resume an archived window by id
- `context_window_close` — close the active window

**Writeback:**
- `ingest` — push durable content into the graph

All retrieval tools are **automatically window-aware** when a window has been created in the session — no id threading needed from the LLM. The server holds one "active" window and uses it implicitly; multi-window callers pass `data_source_id` explicitly.

## Why this, not the direct SDK adapters

- **Zero code.** Config-only integration with every MCP-speaking client.
- **Works with Anthropic's managed stack.** Claude Code, Desktop, Cursor, and Agent SDK all speak MCP natively.
- **Persistent server process.** Unlike the shell-out pattern, `@copass/mcp` holds windows, clients, and sessions in memory across tool calls.

## Environment

| Variable | Required | Default |
|---|---|---|
| `COPASS_API_KEY` | ✅ | — |
| `COPASS_SANDBOX_ID` | ✅ | — |
| `COPASS_API_URL` | — | `https://ai.copass.id` |
| `COPASS_PROJECT_ID` | — | (none) |
| `COPASS_PRESET` | — | `fast` |
| `COPASS_INGEST_DATA_SOURCE_ID` | — | (none — required for `ingest` unless passed per call) |

## Programmatic use

Embedding in your own server? Use the building blocks directly:

```ts
import { buildServer, loadConfig } from '@copass/mcp';
import { CopassClient } from '@copass/core';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const config = loadConfig();
const client = new CopassClient({ auth: { type: 'bearer', token: config.api_key } });
const server = buildServer({ client, config });
await server.connect(new StdioServerTransport());
```

## Related

- [`@copass/core`](../core) — the client SDK powering this server
- [`@copass/ai-sdk`](../ai-sdk), [`@copass/langchain`](../langchain), [`@copass/mastra`](../mastra), [`copass-pydantic-ai`](../../python/copass-pydantic-ai) — direct-SDK adapters for non-MCP consumers

## License

MIT
