"""AgentToolRegistry — per-agent collection of AgentTool instances.

One registry per ``BaseAgent`` instance. Agents do not share
registries across users or requests when tools carry per-user state
(credentials, session handles) — build a per-invocation registry via
an ``AgentToolResolver`` for the multi-tenant case.
"""

from __future__ import annotations

import logging
from typing import Dict, Iterator, List, Optional

from copass_anthropic_agents.base_tool import AgentTool, ToolSpec

logger = logging.getLogger(__name__)


class AgentToolRegistry:
    """Per-agent registry of ``AgentTool`` instances.

    API is intentionally a plain map: ``add`` / ``get`` / ``list_specs``.
    No provider or capability-taxonomy layer — the backend enumerates
    all registered tools via ``list_specs()`` when building the model's
    tool-use catalog.
    """

    def __init__(self) -> None:
        self._tools: Dict[str, AgentTool] = {}

    def add(self, tool: AgentTool) -> None:
        """Register a tool. Overwrites on duplicate name with a
        warning.

        Duplicate names would be a configuration bug — the
        ``<provider>.<verb>`` convention (e.g. ``pd.slack.list-channels``)
        should prevent collisions in practice.
        """
        name = tool.spec.name
        if name in self._tools:
            logger.warning(
                "AgentToolRegistry: overwriting existing tool",
                extra={"tool_name": name},
            )
        self._tools[name] = tool

    def extend(self, tools: List[AgentTool]) -> None:
        """Register many tools in one call."""
        for tool in tools:
            self.add(tool)

    def get(self, name: str) -> AgentTool:
        """Return the tool for ``name`` or raise ``KeyError``."""
        try:
            return self._tools[name]
        except KeyError:
            available = ", ".join(sorted(self._tools)) or "(none)"
            raise KeyError(
                f"No tool registered under {name!r}. Available: {available}"
            ) from None

    def try_get(self, name: str) -> Optional[AgentTool]:
        """Return the tool or ``None`` — for callers that treat a
        missing tool as a soft condition rather than an error."""
        return self._tools.get(name)

    def list_specs(self) -> List[ToolSpec]:
        """Return all registered tool specs, sorted by name. This is
        the surface a backend consumes when building the model's
        tool-use catalog for a turn."""
        return [self._tools[k].spec for k in sorted(self._tools)]

    def __len__(self) -> int:
        return len(self._tools)

    def __contains__(self, name: str) -> bool:
        return name in self._tools

    def __iter__(self) -> Iterator[AgentTool]:
        for name in sorted(self._tools):
            yield self._tools[name]


__all__ = ["AgentToolRegistry"]
