"""Canonical tool descriptions, parameter descriptions, and system prompts.

**These must match the TypeScript ``@copass/config`` package verbatim.**
See ``typescript/packages/config/src/`` in the copass monorepo for
the source of truth. Python can't consume the npm package directly, so
this module mirrors the strings. Update both sides together on any copy
change; run the drift check described in the package README.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Tool descriptions
# ---------------------------------------------------------------------------

DISCOVER_DESCRIPTION = "\n".join([
    "Return a ranked menu of context items relevant to a query. Each item is a",
    "pointer (canonical_ids + short summary), not prose.",
    "",
    "Window-aware by construction: results automatically exclude items already",
    "surfaced earlier in this conversation, so every call returns genuinely NEW",
    "signal — never duplicates. This makes `discover` the primary context-",
    "engineering primitive: call it freely whenever you need more context. Repeated",
    "calls progressively map the relevant slice of the knowledge graph, and because",
    "results skip what's already been seen, you never waste tokens re-consuming",
    "known material.",
    "",
    "After calling, pass an item's canonical_ids tuple to `interpret` for a deeper",
    "brief, or call `discover` again for more items.",
])

INTERPRET_DESCRIPTION = "\n".join([
    "Return a 1–2 paragraph synthesized brief pinned to specific items picked from",
    "`discover`. Pass one or more canonical_ids tuples (one per item you want to",
    "include). Use this AFTER `discover` when you know which items matter.",
])

SEARCH_DESCRIPTION = "\n".join([
    "Return a full synthesized natural-language answer in one call. Use for",
    "self-contained questions that do NOT benefit from a staged discover→interpret flow.",
    "Heaviest of the three tools.",
])

# ---------------------------------------------------------------------------
# Parameter descriptions
# ---------------------------------------------------------------------------

DISCOVER_QUERY_PARAM = "Natural-language query to surface relevant context for."
INTERPRET_QUERY_PARAM = "The question the brief should answer."
SEARCH_QUERY_PARAM = "The question to answer."
INTERPRET_ITEMS_PARAM = (
    "List of canonical_ids tuples — each tuple is the `canonical_ids` field "
    "from one discover item. Pass several to synthesize across items."
)
PROJECT_ID_PARAM = "Override the server default project_id."
PRESET_PARAM = "Override the server default preset."
