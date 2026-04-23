# copass-core-agents

Provider-neutral agent primitives shared by every Copass agent SDK.

This package owns the ABCs, value types, and registries that each
provider-specific SDK (`copass-anthropic-agents`, future
`copass-openai-agents`, `copass-google-agents`, etc.) implements
against. It carries zero vendor dependencies.

## What's in here

- `BaseAgent` — identity + prompt + tool surface + backend
- `AgentScope`, `AgentInvocationContext` — tenancy + per-call context
- `AgentTool`, `AgentToolRegistry`, `AgentToolResolver`, `ToolSpec`,
  `ToolCall` — tool abstractions
- `AgentEvent` (plus `AgentTextDelta`, `AgentToolCall`,
  `AgentToolResult`, `AgentFinish`) — streaming event union
- `AgentBackend` ABC + `AgentRunResult`
- `register_agent` / `register_agent_tool` registries

## Which package should I install?

| I want to… | Install |
|---|---|
| Run a Claude Managed Agent (Anthropic) | `copass-anthropic-agents` (pulls this in transitively) |
| Build my own backend / extend the ABCs | `copass-core-agents` directly |

If you're end-user code invoking an agent, you almost never install
this package directly — you install a provider SDK and it re-exports
what you need.

## Dependencies

Zero runtime dependencies. Python ≥ 3.10.

## License

MIT.
