# copass-pydantic-ai

**Copass retrieval as Pydantic AI tools.** The LLM decides whether to `discover`, `interpret`, or `search` — you don't write the tool-calling loop.

## Prerequisites

Install the Copass CLI and bootstrap your account:

```bash
npm install -g @copass/cli
copass login       # email OTP
copass setup       # creates a sandbox, writes .olane/refs.json
```

Your credentials land in two files:

| File | Contains | Use as |
|---|---|---|
| `~/.olane/config.json` | `access_token` | pass as `api_key` to `CopassRetrievalClient` |
| `./.olane/refs.json` | `sandbox_id` | pass as `sandbox_id` to `copass_tools` |

Ingest some content so retrieval has something to return:

```bash
copass ingest path/to/file.md
```

## Install

```bash
pip install copass-pydantic-ai pydantic-ai
```

Requires Python 3.10+.

## Quickstart

```python
import json
import os
from pathlib import Path
from pydantic_ai import Agent
from copass_pydantic_ai import CopassRetrievalClient, copass_tools

cli_config = json.loads((Path.home() / ".olane" / "config.json").read_text())
project_refs = json.loads(Path(".olane/refs.json").read_text())

client = CopassRetrievalClient(
    api_url=cli_config.get("api_url") or "https://ai.copass.id",
    api_key=cli_config["access_token"],
)
discover, interpret, search = copass_tools(
    client=client,
    sandbox_id=project_refs["sandbox_id"],
)

agent = Agent(
    "anthropic:claude-opus-4-7",
    tools=[discover, interpret, search],
)
result = await agent.run("what do we know about checkout retry behavior?")
print(result.output)
```

If it worked, the answer cites concepts from whatever you ingested. Run twice with a shared window (see below) — the second call won't re-surface items the agent already used.

## Why this, not the raw API

- **LLM chooses the retrieval shape.** Three tools; the model picks the right one per turn.
- **Pydantic AI-native.** Type hints become the schema; docstrings become descriptions. No decorator dance.
- **Trimmed responses.** Tools return only what the model needs — no sandbox/query echoes.

## Tools

| Tool | When the LLM calls it |
|---|---|
| `discover` | "What's relevant?" — ranked menu of pointers |
| `interpret` | "Tell me about these specific items." — brief pinned to canonical_ids |
| `search` | "Answer this directly." — full synthesized answer |

## Window-aware retrieval

Pass any object with a `get_turns()` method:

```python
class MyWindow:
    def __init__(self):
        self.turns: list[dict[str, str]] = []
    def get_turns(self) -> list[dict[str, str]]:
        return self.turns

window = MyWindow()
discover, interpret, search = copass_tools(
    client=client,
    sandbox_id=project_refs["sandbox_id"],
    window=window,
)
```

Every retrieval call forwards `window.get_turns()` as `history` so the server excludes already-seen content.

## Low-level client

If you don't want the Pydantic AI wrapping, `CopassRetrievalClient` is a minimal async httpx client you can use directly:

```python
menu = await client.discover("sb_...", query="...")
brief = await client.interpret("sb_...", query="...", items=[["cid1", "cid2"]])
answer = await client.search("sb_...", query="...")
```

## Related

- [`@copass/ai-sdk`](https://www.npmjs.com/package/@copass/ai-sdk), [`@copass/langchain`](https://www.npmjs.com/package/@copass/langchain), [`@copass/mastra`](https://www.npmjs.com/package/@copass/mastra) — same shape for TypeScript frameworks
- [`@copass/mcp`](https://www.npmjs.com/package/@copass/mcp) — standalone MCP server for Claude Code / Desktop / Cursor

## License

MIT
