"""Anthropic agent backends.

Re-exports the core ``AgentBackend`` / ``AgentRunResult`` ABCs
(implemented in ``copass-core-agents``) alongside this package's
Anthropic-specific ``ManagedAgentBackend``.
"""

from copass_anthropic_agents.backends.managed_agent_backend import (
    DEFAULT_ENVIRONMENT_CONFIG,
    SESSION_ID_HANDLE,
    ManagedAgentBackend,
)
from copass_core_agents.backends import AgentBackend, AgentRunResult

__all__ = [
    "AgentBackend",
    "AgentRunResult",
    "ManagedAgentBackend",
    "DEFAULT_ENVIRONMENT_CONFIG",
    "SESSION_ID_HANDLE",
]
