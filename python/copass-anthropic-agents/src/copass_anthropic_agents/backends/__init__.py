"""Agent backends — runtime adapters between agents and provider SDKs."""

from copass_anthropic_agents.backends.base_backend import (
    AgentBackend,
    AgentRunResult,
)
from copass_anthropic_agents.backends.managed_agent_backend import (
    DEFAULT_ENVIRONMENT_CONFIG,
    SESSION_ID_HANDLE,
    ManagedAgentBackend,
)

__all__ = [
    "AgentBackend",
    "AgentRunResult",
    "ManagedAgentBackend",
    "DEFAULT_ENVIRONMENT_CONFIG",
    "SESSION_ID_HANDLE",
]
