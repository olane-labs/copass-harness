"""Agent backend ABCs — concrete backends live in per-provider
packages (``copass-anthropic-agents``, future ``copass-openai-agents``,
``copass-google-agents``)."""

from copass_core_agents.backends.base_backend import (
    AgentBackend,
    AgentRunResult,
)

__all__ = ["AgentBackend", "AgentRunResult"]
