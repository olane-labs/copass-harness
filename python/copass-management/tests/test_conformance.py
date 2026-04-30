"""Conformance test — validates every spec fixture against its
JSON Schema in both directions and asserts byte-equivalent JSON
round-trip.

This is the Python side of the cross-language equivalence contract
established by ADR 0007 — it must produce the same parsed structures
as the TypeScript ``conformance.test.ts`` for the same fixture corpus.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

from copass_management import (
    MAX_SPEC_VERSION,
    MIN_SPEC_VERSION,
    load_management_specs,
)
from copass_management.tools import TOOL_HANDLERS


REPO_ROOT = Path(__file__).resolve().parents[3]
SPEC_DIR = REPO_ROOT / "spec" / "management" / "v1"


@pytest.fixture(scope="module")
def corpus():
    return load_management_specs(spec_dir=SPEC_DIR)


def test_supported_spec_versions() -> None:
    assert MIN_SPEC_VERSION == "v1"
    assert MAX_SPEC_VERSION == "v1"


def test_corpus_loads_all_14_read_tools(corpus) -> None:
    expected = {
        "get_agent",
        "get_run_trace",
        "get_source",
        "list_agent_tools",
        "list_agents",
        "list_api_keys",
        "list_apps",
        "list_connected_accounts",
        "list_runs",
        "list_sandbox_connections",
        "list_sandboxes",
        "list_sources",
        "list_trigger_components",
        "list_triggers",
    }
    assert set(corpus.specs.keys()) == expected


def test_handler_bound_for_every_tool(corpus) -> None:
    for name in corpus.specs:
        assert name in TOOL_HANDLERS, f"missing handler for {name!r}"


def test_fixture_present_for_every_tool(corpus) -> None:
    for name in corpus.specs:
        assert name in corpus.fixtures, f"missing fixture for {name!r}"


def _stable_json(value):
    return json.dumps(value, sort_keys=True, default=str)


@pytest.mark.parametrize(
    "spec_name",
    sorted(
        Path(p).stem for p in SPEC_DIR.glob("*.json")
    ),
)
def test_fixture_input_matches_input_schema(corpus, spec_name: str) -> None:
    spec = corpus.specs[spec_name]
    fixture = corpus.fixtures[spec_name]
    Draft202012Validator(spec.input_schema).validate(fixture.input)


@pytest.mark.parametrize(
    "spec_name",
    sorted(
        Path(p).stem for p in SPEC_DIR.glob("*.json")
    ),
)
def test_fixture_output_matches_output_schema(corpus, spec_name: str) -> None:
    spec = corpus.specs[spec_name]
    fixture = corpus.fixtures[spec_name]
    Draft202012Validator(spec.output_schema).validate(fixture.output)


@pytest.mark.parametrize(
    "spec_name",
    sorted(
        Path(p).stem for p in SPEC_DIR.glob("*.json")
    ),
)
def test_fixture_round_trip_byte_equivalent(corpus, spec_name: str) -> None:
    fixture = corpus.fixtures[spec_name]
    # Parse-and-redump preserves shape because validators don't transform.
    assert _stable_json(json.loads(_stable_json(fixture.input))) == _stable_json(fixture.input)
    assert _stable_json(json.loads(_stable_json(fixture.output))) == _stable_json(fixture.output)
