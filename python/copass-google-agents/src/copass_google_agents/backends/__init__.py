"""Google agent backends.

Re-exports the core ``AgentBackend`` / ``AgentRunResult`` ABCs
(implemented in ``copass-core-agents``) alongside this package's
Google-specific ``GoogleAgentBackend``.
"""

from copass_core_agents.backends import AgentBackend, AgentRunResult
from copass_google_agents.backends.google_agent_backend import (
    DEFAULT_LOCATION,
    DISPATCH_TOOL_NAME,
    SESSION_ID_HANDLE,
    GoogleAgentBackend,
)

__all__ = [
    "AgentBackend",
    "AgentRunResult",
    "GoogleAgentBackend",
    "DEFAULT_LOCATION",
    "DISPATCH_TOOL_NAME",
    "SESSION_ID_HANDLE",
]
