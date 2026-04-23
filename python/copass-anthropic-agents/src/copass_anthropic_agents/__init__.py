"""Copass agent SDK for Anthropic Managed Agents.

This package owns the Anthropic-specific backend. All provider-neutral
ABCs (``BaseAgent``, ``AgentTool``, ``AgentBackend``, events, scope,
registries) live in :mod:`copass_core_agents` and are re-exported here
for convenience — dev code can import everything it needs from one
place.

Public surface:

    Anthropic-specific (owned here):
        ManagedAgentBackend
        CopassManagedAgent      — convenience subclass of BaseAgent
        DEFAULT_ENVIRONMENT_CONFIG
        SESSION_ID_HANDLE
        DEFAULT_MODEL

    Provider-neutral (re-exported from copass_core_agents):
        BaseAgent, AgentScope, AgentInvocationContext
        AgentTool, AgentToolRegistry, AgentToolResolver
        ToolSpec, ToolCall, ToolConflictPolicy, ToolConflictError
        AgentEvent, AgentTextDelta, AgentToolCall, AgentToolResult,
        AgentFinish
        AgentBackend, AgentRunResult
        register_agent, get_agent_class, list_agents
        register_agent_tool, get_agent_tool, try_get_agent_tool,
        list_agent_tools
"""

# Re-export core (vendor-neutral) primitives for one-line imports.
from copass_core_agents import (
    AgentBackend,
    AgentEvent,
    AgentFinish,
    AgentInvocationContext,
    AgentRunResult,
    AgentScope,
    AgentTextDelta,
    AgentTool,
    AgentToolCall,
    AgentToolRegistry,
    AgentToolResolver,
    AgentToolResult,
    BaseAgent,
    ToolCall,
    ToolConflictError,
    ToolConflictPolicy,
    ToolSpec,
    get_agent_class,
    get_agent_tool,
    list_agent_tools,
    list_agents,
    register_agent,
    register_agent_tool,
    try_get_agent_tool,
)

# Anthropic-specific (owned here).
from copass_anthropic_agents.backends.managed_agent_backend import (
    DEFAULT_ENVIRONMENT_CONFIG,
    SESSION_ID_HANDLE,
    ManagedAgentBackend,
)
from copass_anthropic_agents.managed_agent import DEFAULT_MODEL, CopassManagedAgent

__version__ = "0.1.0"

__all__ = [
    "__version__",
    # Anthropic-specific
    "CopassManagedAgent",
    "DEFAULT_MODEL",
    "ManagedAgentBackend",
    "DEFAULT_ENVIRONMENT_CONFIG",
    "SESSION_ID_HANDLE",
    # Re-exported from copass_core_agents
    "BaseAgent",
    "AgentScope",
    "AgentInvocationContext",
    "AgentTool",
    "AgentToolRegistry",
    "AgentToolResolver",
    "ToolSpec",
    "ToolCall",
    "ToolConflictError",
    "ToolConflictPolicy",
    "AgentEvent",
    "AgentTextDelta",
    "AgentToolCall",
    "AgentToolResult",
    "AgentFinish",
    "AgentBackend",
    "AgentRunResult",
    "register_agent",
    "get_agent_class",
    "list_agents",
    "register_agent_tool",
    "get_agent_tool",
    "try_get_agent_tool",
    "list_agent_tools",
]
