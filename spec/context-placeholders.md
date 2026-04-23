# Context placeholders — cross-language convention

Reserved token strings used by Copass SDK wrappers to mark where
knowledge-graph context should be substituted into a dev-supplied
system prompt. Locked here so every language adapter uses the same
token — drift between Python and TypeScript adapters causes silent
prompt divergence that's painful to debug.

## Reserved tokens

| Token | Purpose |
|---|---|
| `{{copass_context}}` | Substitution site for a rendered Copass Context Window. When present in a system prompt passed to a wrapper SDK (`copass-anthropic-agents`, future `@copass/anthropic-agents`, etc.), the wrapper — when Context Window injection is enabled — replaces this token with the rendered context blob before dispatching the agent turn. |

## Syntax rules

- **Double-brace.** Matches Jinja / Mustache / Handlebars muscle
  memory and is unambiguously a template placeholder. A single-brace
  token collides with Python `str.format()` and f-strings.
- **`snake_case`.** Matches Python naming conventions, lowercased to
  avoid shouting inside prompts.
- **ASCII-only, byte-exact, case-sensitive.** No Unicode, no hidden
  whitespace, no zero-width characters. Comparisons are exact byte
  match — ``{{Copass_Context}}`` and ``{{copass_context}}`` are
  different tokens, and only the latter is reserved. SDK
  implementations MUST NOT case-fold before matching.

## Substitution semantics

- **Zero occurrences → no-op.** A prompt without the token gets no
  injected context. The SDK does not auto-prepend.
- **One or more occurrences → each gets substituted.** Every literal
  occurrence of `{{copass_context}}` in the input is replaced with
  the same rendered context blob. Devs who want to emphasize context
  can reference it multiple times.
- **Missing context or disabled injection → empty string.** If the
  dev didn't configure Context Window credentials, the token is
  replaced with the empty string — the prompt is still valid, just
  without the injected block.
- **Escape hatch.** No escape syntax is defined. If a prompt needs to
  print the literal string `{{copass_context}}` (to explain it to the
  model, etc.), compose it at runtime from parts. The collision risk
  is considered acceptable given how unlikely the literal is.

## Status

This document is the **source of truth** for the token shape. Do not
introduce a new placeholder token in any wrapper SDK without updating
this file first.

Current SDK status:

| SDK | Token support |
|---|---|
| `copass-anthropic-agents` (Python) | Reserved in docs + API shape; substitution is deferred to a forthcoming release. |
| `@copass/anthropic-agents` (TypeScript) | Not yet shipped. Must adopt this token when it lands. |
| Future `copass-openai-agents`, `copass-google-agents` | Same. |

## History

- 2026-04-23 — Initial draft alongside `copass-anthropic-agents` 0.1.0.
