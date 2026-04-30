#!/usr/bin/env python3
"""Walk the management spec corpus and reject internal vendor names.

Published spec files (`description` and any `inputSchema.description`
strings) must not leak internal vendor branding to SDK consumers. The
backend reproducibility copy under `prompts/` is exempt and skipped.

Usage::

    python copass-harness/scripts/lint_redaction.py [SPEC_ROOT]

`SPEC_ROOT` defaults to the canonical location
`copass-harness/spec/management/v1/` resolved relative to this file.

Exit codes:
    0 — clean
    1 — at least one violation
    2 — invocation / IO error (bad path, malformed JSON, etc.)
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Sequence

REDACTION_WORDLIST: Sequence[str] = (
    "Pipedream",
    "Scalekit",
    "Highway",
    "Olane internal",
    "vault",
)
"""Substrings rejected (case-insensitive) inside published spec strings.

`vault` is included because the backend uses it as a managed-secret-store
noun. Generic alternatives ("managed secret store", "stored token") are
acceptable.
"""

EXEMPT_DIRECTORY_NAMES: frozenset[str] = frozenset({"prompts"})
"""Subdirectory names whose contents are not scanned. The Concierge prompt
copy lives under `prompts/` and intentionally retains vendor names."""


@dataclass(frozen=True)
class Violation:
    file: Path
    json_path: str
    term: str
    snippet: str

    def render(self) -> str:
        return (
            f"{self.file}: {self.json_path}: contains forbidden term "
            f"{self.term!r}\n    {self.snippet}"
        )


def _iter_strings(node: object, path: str) -> Iterable[tuple[str, str]]:
    """Yield `(json_path, value)` for every string in a JSON tree."""
    if isinstance(node, str):
        yield path, node
        return
    if isinstance(node, dict):
        for key, value in node.items():
            yield from _iter_strings(value, f"{path}.{key}" if path else str(key))
        return
    if isinstance(node, list):
        for idx, value in enumerate(node):
            yield from _iter_strings(value, f"{path}[{idx}]")


def _scan_file(spec_file: Path) -> List[Violation]:
    try:
        document = json.loads(spec_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(
            f"lint_redaction: failed to parse {spec_file}: {exc}"
        ) from exc

    violations: List[Violation] = []
    for json_path, value in _iter_strings(document, ""):
        haystack = value.lower()
        for term in REDACTION_WORDLIST:
            if term.lower() in haystack:
                snippet = value if len(value) <= 160 else value[:157] + "..."
                violations.append(
                    Violation(
                        file=spec_file,
                        json_path=json_path or "<root>",
                        term=term,
                        snippet=snippet,
                    )
                )
    return violations


def _walk_specs(root: Path) -> Iterable[Path]:
    if not root.exists():
        raise SystemExit(f"lint_redaction: spec root does not exist: {root}")
    if not root.is_dir():
        raise SystemExit(f"lint_redaction: spec root is not a directory: {root}")
    for path in sorted(root.rglob("*.json")):
        relative_parts = path.relative_to(root).parts
        if any(part in EXEMPT_DIRECTORY_NAMES for part in relative_parts):
            continue
        yield path


def lint(root: Path) -> List[Violation]:
    violations: List[Violation] = []
    for spec_file in _walk_specs(root):
        violations.extend(_scan_file(spec_file))
    return violations


def _default_root() -> Path:
    here = Path(__file__).resolve().parent
    return here.parent / "spec" / "management" / "v1"


def main(argv: Sequence[str]) -> int:
    if len(argv) > 2:
        print("usage: lint_redaction.py [SPEC_ROOT]", file=sys.stderr)
        return 2
    root = Path(argv[1]).resolve() if len(argv) == 2 else _default_root()
    violations = lint(root)
    if not violations:
        print(f"lint_redaction: clean ({root})")
        return 0
    print(f"lint_redaction: {len(violations)} violation(s) in {root}", file=sys.stderr)
    for v in violations:
        print(v.render(), file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
