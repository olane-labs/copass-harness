# Copass Management Tool Spec — `v1`

Single source of truth for the Copass management tool surface. Phase 1 ships the
**read-only subset** (14 tools); write tools land in Phase 2. The backend
Concierge, `@copass/management` (TypeScript), and `copass-management` (Python)
all consume this directory.

## File shape

Every tool has one JSON Schema file at `<tool_name>.json`:

```json
{
  "name":         "<tool_name>",
  "description":  "<LLM-facing prose, redacted of internal vendor names>",
  "inputSchema":  { "...JSON Schema 2020-12..." },
  "outputSchema": { "...JSON Schema 2020-12..." },
  "since":        "v1"
}
```

`name` matches `ToolSpec.name` in
`frame_graph/copass_id/concierge/tools/registry.py`. `inputSchema` mirrors
`ToolSpec.input_schema`. `outputSchema` is authored from the handler's return
shape (the `_project(...)` field lists in `registry.py`).

## Sibling fixtures

For every `<tool>.json` there is a sibling
`examples/<tool>.example.json` of shape:

```json
{
  "input":  { "...sample arguments..." },
  "output": { "...sample response..." }
}
```

Fixtures use realistic-but-synthetic payloads. Real user data, real OAuth
tokens, real internal hostnames, etc. are never permitted. The conformance
test (Phase 1B) loads each fixture and asserts both Zod and Pydantic accept
`input` against `inputSchema` and `output` against `outputSchema`, then diffs
the parsed values for byte-equivalent JSON.

## Versioning

- `v1/` is the current major. Phase 1 entries are tagged `"since": "v1"`.
- A breaking tool change is a `v1` → `v2` bump. That requires a new `v2/`
  directory **and** a backend deploy that supports both versions during a
  bounded deprecation window. SDK packages declare `min_spec_version` and
  `max_spec_version` constants so callers can pin.
- Non-breaking additions (new optional input fields, new optional output
  fields, new tools) stay inside `v1/` and bump the SDK package versions
  only.

The spec version is **independent of the backend Concierge prompt template
version** (today `copass-concierge-v17`). Prompt evolution and tool-shape
evolution have different cadences.

## Redaction policy

`description` and `inputSchema.description` strings published to SDK consumers
must not contain internal vendor names. The wordlist enforced by
`copass-harness/scripts/lint_redaction.py`:

- `Pipedream`
- `Scalekit`
- `vault` (when used as a vendor / store noun)
- `Highway`
- `Olane internal`
- `MotherDuck`

Generic substitutions: "OAuth provider", "tool-source provider", "managed
secret store", "trigger-provider registry", etc. The spec linter rejects PRs
that introduce a forbidden term into a published string.

## Concierge system prompt — backend-only

The full Concierge system prompt is **not published** as part of this spec.
It is loaded by the hosted Copass platform from a private template and is
not part of the SDK contract. SDK consumers register the same tool surface
defined here and supply their own system prompt for their own agents.

## Conformance contract (Phase 1B)

Phase 1B introduces the Zod (TypeScript) + Pydantic (Python) conformance test
that pins both languages to this directory:

1. For every `<tool>.json` in `v1/`, parse `examples/<tool>.example.json`
   `input` against `inputSchema` and `output` against `outputSchema` in both
   Zod and Pydantic.
2. Round-trip the parsed values to JSON, sort keys, and assert byte-equality
   between languages.
3. Run `scripts/lint_redaction.py` against the corpus.

Failing any step blocks the merge.

## Phase 1A scope (this commit)

- Spec files for the 14 read tools.
- Fixtures for the 14 read tools.
- This README and `scripts/lint_redaction.py`.

Out of scope (Phase 1B):

- The TS / Python SDK packages themselves.
- The conformance CI workflow.
- Any write-tool spec files.
