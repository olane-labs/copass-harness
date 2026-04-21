# @copass/langchain

**Copass retrieval as LangChain tools.** The LLM decides whether to `discover`, `interpret`, or `search` — you don't write the tool-calling loop.

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
| `~/.olane/config.json` | `access_token` | `COPASS_API_KEY` |
| `./.olane/refs.json` | `sandbox_id`, `project_id` | `COPASS_SANDBOX_ID`, `COPASS_PROJECT_ID` |

Ingest some content so retrieval has something to return:

```bash
copass ingest path/to/file.md
# or pipe stdin:  echo "some decision or note" | copass ingest -
```

## Install

```bash
npm install @copass/langchain @copass/core @langchain/core @langchain/anthropic @langchain/langgraph zod
```

## Quickstart

```ts
import { CopassClient } from '@copass/core';
import { copassTools } from '@copass/langchain';
import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

const copass = new CopassClient({
  auth: { type: 'bearer', token: process.env.COPASS_API_KEY! },
});
const sandbox_id = process.env.COPASS_SANDBOX_ID!;
const window = await copass.contextWindow.create({ sandbox_id });
const tools = copassTools({ client: copass, sandbox_id, window });

const agent = createReactAgent({
  llm: new ChatAnthropic({ model: 'claude-opus-4-7' }),
  tools: [tools.discover, tools.interpret, tools.search],
});

const result = await agent.invoke({
  messages: [{ role: 'user', content: 'what do we know about checkout retry behavior?' }],
});

console.log(result.messages.at(-1)?.content);
```

If it worked, the last message cites concepts from whatever you ingested. Run it twice with the same `window` — the second call won't re-surface items the agent already used.

## Why this, not the raw API

- **LLM chooses the retrieval shape.** Three tools; the model picks the right one per turn.
- **Window-aware automatically.** Pass a `ContextWindow` once; every retrieval call respects turn history.
- **Standard `StructuredTool` shape.** Works anywhere LangChain tools are accepted — agents, LangGraph nodes, chains.

## Tools

| Tool | When the LLM calls it |
|---|---|
| `discover` | "What's relevant?" — ranked menu of pointers |
| `interpret` | "Tell me about these specific items." — brief pinned to canonical_ids |
| `search` | "Answer this directly." — full synthesized answer |

## Related

- [`@copass/core`](../core) — client SDK
- [`@copass/ai-sdk`](../ai-sdk), [`@copass/mastra`](../mastra), [`copass-pydantic-ai`](../../python/copass-pydantic-ai) — same shape for other frameworks
- [`@copass/mcp`](../mcp) — standalone MCP server for Claude Code / Desktop / Cursor

## License

MIT
