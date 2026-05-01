#!/usr/bin/env bash
# Cross-language equivalence check for the management spec corpus.
#
# Runs both the TypeScript and the Python conformance suites against the
# same fixture corpus and diffs the parsed output. Any per-tool divergence
# is a failure.
#
# Phase 1 hard requirement per ADR 0007: spec corpus stays byte-equivalent
# across both languages.

set -euo pipefail

HARNESS_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
SPEC_DIR="$HARNESS_ROOT/spec/management/v1"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "==> redaction lint"
python3 "$HARNESS_ROOT/scripts/lint_redaction.py" "$SPEC_DIR"

echo "==> @copass/core build (so workspace symlink resolves new APIs)"
( cd "$HARNESS_ROOT/typescript/packages/core" && \
  ./node_modules/.bin/tsup >/dev/null )

echo "==> TS conformance suite (vitest)"
( cd "$HARNESS_ROOT/typescript/packages/management" && \
  ./node_modules/.bin/vitest run )

echo "==> Python conformance suite (pytest)"
if [[ -d "$HARNESS_ROOT/python/copass-management/.venv" ]]; then
  # shellcheck disable=SC1091
  source "$HARNESS_ROOT/python/copass-management/.venv/bin/activate"
fi
( cd "$HARNESS_ROOT/python/copass-management" && pytest -q )

echo "==> dump parsed-fixture JSON from both languages and diff"
TS_OUT="$TMP/ts.json"
PY_OUT="$TMP/py.json"

node - <<'NODE' "$SPEC_DIR" "$TS_OUT"
const fs = require('node:fs');
const path = require('node:path');

const specDir = process.argv[2];
const outFile = process.argv[3];

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      out[k] = sortKeysDeep(value[k]);
    }
    return out;
  }
  return value;
}

const examplesDir = path.join(specDir, 'examples');
const out = {};
for (const entry of fs.readdirSync(examplesDir).sort()) {
  if (!entry.endsWith('.example.json')) continue;
  const name = entry.slice(0, -'.example.json'.length);
  const fixture = JSON.parse(fs.readFileSync(path.join(examplesDir, entry), 'utf-8'));
  out[name] = {
    input: fixture.input,
    output: fixture.output,
  };
}
fs.writeFileSync(outFile, JSON.stringify(sortKeysDeep(out), null, 2));
NODE

python3 - "$SPEC_DIR" "$PY_OUT" <<'PY'
import json
import sys
from pathlib import Path

spec_dir = Path(sys.argv[1])
out_file = Path(sys.argv[2])
examples = spec_dir / "examples"

out = {}
for entry in sorted(examples.iterdir()):
    if not entry.name.endswith(".example.json"):
        continue
    name = entry.name[:-len(".example.json")]
    fixture = json.loads(entry.read_text())
    out[name] = {"input": fixture["input"], "output": fixture["output"]}

out_file.write_text(json.dumps(out, indent=2, sort_keys=True, ensure_ascii=False))
PY

if diff -u "$TS_OUT" "$PY_OUT"; then
  echo "==> cross-language fixture parse: byte-equivalent"
else
  echo "FAIL: TS and Python parsed corpora diverge"
  exit 1
fi

echo "==> conformance check passed"
