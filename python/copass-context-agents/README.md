# copass-context-agents

Copass context-engineering primitives for `copass-core-agents`.

Three provider-neutral pieces every Copass-aware agent uses:

- **`copass_retrieval_tools(...)`** — returns `discover` / `interpret` / `search` as `AgentTool` instances, window-aware when a `ContextWindow` is passed.
- **`copass_ingest_tool(...)`** — returns `ingest` as an `AgentTool` so agents can promote content into durable sandbox storage.
- **`CopassTurnRecorder`** — mirrors user / assistant turns into a `ContextWindow` with fire-and-forget pushes and author-prefix provenance.

These are the primitives the provider adapter packages — `copass-anthropic-agents`, `copass-google-agents` — compose into their `run()` / `stream()` loops. The descriptions come from `copass_config` so every Copass surface (TS adapters, MCP server, CLI) shows the LLM identical tool semantics.

## Install

```bash
pip install copass-context-agents
```

Usually a transitive dep — `pip install copass-anthropic-agents` / `copass-google-agents` pulls it in.

## Usage

```python
from copass_core import CopassClient
from copass_context_agents import (
    copass_retrieval_tools,
    copass_ingest_tool,
    CopassTurnRecorder,
)

client = CopassClient(...)
window = await client.context_window.create(sandbox_id=sandbox_id)

tools = [
    *copass_retrieval_tools(client=client, sandbox_id=sandbox_id, window=window),
    copass_ingest_tool(
        client=client,
        sandbox_id=sandbox_id,
        data_source_id=my_source_id,
        default_source_type="decision",
        author="agent:support-bot",
    ),
]

recorder = CopassTurnRecorder(window=window, author="agent:support-bot", include_author_prefix=True)
# ...wire into your provider's stream loop; see copass-anthropic-agents or
# copass-google-agents for the full wiring.
```

See the provider adapter packages for the full `CopassManagedAgent` / `CopassGoogleAgent` integrations that wire these primitives into discover-as-step-1 + auto-record flows.
