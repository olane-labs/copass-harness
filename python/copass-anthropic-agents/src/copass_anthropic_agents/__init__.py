"""Copass agent SDK for Anthropic Managed Agents.

Primitives:

    Core
        BaseAgent               — identity + prompt + tools + backend
        CopassManagedAgent      — thin convenience subclass
        AgentScope              — tenancy payload
        AgentInvocationContext  — per-call runtime context
        AgentTool               — ABC for a tool an agent can invoke
        AgentToolRegistry       — per-agent collection of tools
        AgentToolResolver       — scope-aware dynamic tool producer
        ToolSpec, ToolCall      — tool catalog shapes
        ToolConflictPolicy      — "error" | "dynamic_wins" | "static_wins"
        ToolConflictError

    Events (emitted by AgentBackend.stream)
        AgentEvent              — tagged union
        AgentTextDelta
        AgentToolCall
        AgentToolResult
        AgentFinish

    Backends
        AgentBackend            — ABC
        AgentRunResult          — reduced run() output
        ManagedAgentBackend     — Anthropic Managed Agents
        DEFAULT_ENVIRONMENT_CONFIG
        SESSION_ID_HANDLE

    Registries (optional lookup-by-name)
        register_agent, get_agent_class, list_agents
        register_agent_tool, get_agent_tool, try_get_agent_tool,
        list_agent_tools
"""

from copass_anthropic_agents.backends import (
    DEFAULT_ENVIRONMENT_CONFIG,
    SESSION_ID_HANDLE,
    AgentBackend,
    AgentRunResult,
    ManagedAgentBackend,
)
from copass_anthropic_agents.base_agent import BaseAgent
from copass_anthropic_agents.base_tool import AgentTool, ToolCall, ToolSpec
from copass_anthropic_agents.events import (
    AgentEvent,
    AgentFinish,
    AgentTextDelta,
    AgentToolCall,
    AgentToolResult,
)
from copass_anthropic_agents.invocation_context import AgentInvocationContext
from copass_anthropic_agents.managed_agent import DEFAULT_MODEL, CopassManagedAgent
from copass_anthropic_agents.registry import (
    get_agent_class,
    get_agent_tool,
    list_agent_tools,
    list_agents,
    register_agent,
    register_agent_tool,
    try_get_agent_tool,
)
from copass_anthropic_agents.scope import AgentScope
from copass_anthropic_agents.tool_registry import AgentToolRegistry
from copass_anthropic_agents.tool_resolver import (
    AgentToolResolver,
    ToolConflictError,
    ToolConflictPolicy,
)

__version__ = "0.1.0"

__all__ = [
    "__version__",
    # Core
    "BaseAgent",
    "CopassManagedAgent",
    "DEFAULT_MODEL",
    "AgentScope",
    "AgentInvocationContext",
    "AgentTool",
    "AgentToolRegistry",
    "AgentToolResolver",
    "ToolSpec",
    "ToolCall",
    "ToolConflictError",
    "ToolConflictPolicy",
    # Events
    "AgentEvent",
    "AgentTextDelta",
    "AgentToolCall",
    "AgentToolResult",
    "AgentFinish",
    # Backends
    "AgentBackend",
    "AgentRunResult",
    "ManagedAgentBackend",
    "DEFAULT_ENVIRONMENT_CONFIG",
    "SESSION_ID_HANDLE",
    # Registries
    "register_agent",
    "get_agent_class",
    "list_agents",
    "register_agent_tool",
    "get_agent_tool",
    "try_get_agent_tool",
    "list_agent_tools",
]
