"""Package-level registries for agent classes and shared tools.

Mirrors the ``register_provider`` pattern used in the Copass backend
repo. Two separate registries:

- **Agent registry** — maps identity string → ``BaseAgent`` subclass.
  Convenience for DI / lookup-by-identity flows.
- **Tool registry** — maps tool-spec name → ``AgentTool`` instance.
  For process-wide reusable tools (no per-user state). Per-user /
  per-scope tools belong on a per-agent ``AgentToolRegistry`` or an
  ``AgentToolResolver``, NOT here.

Neither registry is required for normal use — ``BaseAgent`` subclasses
can be constructed directly. The registries exist for cases where a
dispatcher needs to look up "the agent named X" without importing the
class.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Dict, List, Optional, Type

if TYPE_CHECKING:
    from copass_anthropic_agents.base_agent import BaseAgent
    from copass_anthropic_agents.base_tool import AgentTool


_AGENT_REGISTRY: Dict[str, "Type[BaseAgent]"] = {}
_AGENT_TOOL_REGISTRY: Dict[str, "AgentTool"] = {}


def register_agent(identity: str):
    """Decorator to register a ``BaseAgent`` subclass under an
    identity string.

    Usage:
        >>> @register_agent("support")
        ... class SupportAgent(BaseAgent):
        ...     ...
    """

    def decorator(cls: "Type[BaseAgent]") -> "Type[BaseAgent]":
        _AGENT_REGISTRY[identity] = cls
        return cls

    return decorator


def get_agent_class(identity: str) -> "Type[BaseAgent]":
    """Return the registered agent class for ``identity`` or raise
    ``KeyError``."""
    try:
        return _AGENT_REGISTRY[identity]
    except KeyError:
        available = ", ".join(sorted(_AGENT_REGISTRY)) or "(none)"
        raise KeyError(
            f"No agent registered under {identity!r}. Available: {available}"
        ) from None


def list_agents() -> List[str]:
    """Return all registered agent identities, sorted."""
    return sorted(_AGENT_REGISTRY)


def register_agent_tool(tool: "AgentTool") -> "AgentTool":
    """Register a process-wide reusable tool. Returns the tool for
    chaining."""
    _AGENT_TOOL_REGISTRY[tool.spec.name] = tool
    return tool


def get_agent_tool(name: str) -> "AgentTool":
    """Return the registered tool for ``name`` or raise ``KeyError``."""
    try:
        return _AGENT_TOOL_REGISTRY[name]
    except KeyError:
        available = ", ".join(sorted(_AGENT_TOOL_REGISTRY)) or "(none)"
        raise KeyError(
            f"No agent tool registered under {name!r}. Available: {available}"
        ) from None


def try_get_agent_tool(name: str) -> "Optional[AgentTool]":
    """Return the registered tool or ``None``."""
    return _AGENT_TOOL_REGISTRY.get(name)


def list_agent_tools() -> List[str]:
    """Return all registered tool names, sorted."""
    return sorted(_AGENT_TOOL_REGISTRY)


__all__ = [
    "register_agent",
    "get_agent_class",
    "list_agents",
    "register_agent_tool",
    "get_agent_tool",
    "try_get_agent_tool",
    "list_agent_tools",
]
