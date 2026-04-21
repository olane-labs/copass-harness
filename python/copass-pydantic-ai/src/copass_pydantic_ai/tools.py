"""Pydantic AI tool adapters for Copass retrieval.

``copass_tools(...)`` returns a tuple of three async callables — drop them
straight into ``Agent(tools=[...])``. Each function has a type-hinted
signature and a docstring, which Pydantic AI uses to generate the tool
schema + description automatically.
"""

from __future__ import annotations

from typing import Any, Callable, Optional

from .client import CopassRetrievalClient
from .types import SearchPreset, WindowLike


def copass_tools(
    *,
    client: CopassRetrievalClient,
    sandbox_id: str,
    project_id: Optional[str] = None,
    window: Optional[WindowLike] = None,
    preset: SearchPreset = "fast",
) -> tuple[Callable[..., Any], Callable[..., Any], Callable[..., Any]]:
    """Return Copass retrieval as three Pydantic AI-compatible tool callables.

    Args:
        client: A :class:`CopassRetrievalClient` for the target sandbox.
        sandbox_id: Sandbox all retrieval runs against.
        project_id: Optional project scoping.
        window: Optional :class:`WindowLike` (e.g. a Context Window handle).
            When provided, every retrieval call is window-aware.
        preset: Preset for ``interpret`` / ``search``. Defaults to ``"fast"``.

    Returns:
        ``(discover, interpret, search)`` — three async callables, ready to
        pass directly to ``pydantic_ai.Agent(tools=[...])``.

    Example::

        from pydantic_ai import Agent
        from copass_pydantic_ai import CopassRetrievalClient, copass_tools

        client = CopassRetrievalClient(api_url="...", api_key="olk_...")
        discover, interpret, search = copass_tools(
            client=client,
            sandbox_id="sandbox_abc",
        )

        agent = Agent("anthropic:claude-opus-4-7", tools=[discover, interpret, search])
        result = await agent.run("why is checkout flaky?")
    """

    async def discover(query: str) -> dict[str, Any]:
        """Return a ranked menu of context items relevant to a query.

        Each item is a pointer (canonical_ids + short summary), not prose.
        Cheap and fast — use it FIRST to see what the knowledge graph has
        before committing to a heavier call. Pass an item's canonical_ids
        tuple to `interpret` to drill in.
        """
        response = await client.discover(
            sandbox_id, query=query, project_id=project_id, window=window
        )
        return {
            "header": response.get("header"),
            "items": [
                {
                    "score": item.get("score"),
                    "summary": item.get("summary"),
                    "canonical_ids": item.get("canonical_ids", []),
                }
                for item in response.get("items", [])
            ],
            "next_steps": response.get("next_steps"),
        }

    async def interpret(query: str, items: list[list[str]]) -> dict[str, Any]:
        """Return a 1-2 paragraph synthesized brief pinned to specific items.

        Pass one or more canonical_ids tuples (one per item you want to
        include, taken from `discover` results). Use this AFTER `discover`
        when you know which items matter.
        """
        response = await client.interpret(
            sandbox_id,
            query=query,
            items=items,
            project_id=project_id,
            window=window,
            preset=preset,
        )
        return {"brief": response.get("brief")}

    async def search(query: str) -> dict[str, Any]:
        """Return a full synthesized natural-language answer in one call.

        Use for self-contained questions that do NOT benefit from a staged
        discover-to-interpret flow. Heaviest of the three tools.
        """
        response = await client.search(
            sandbox_id,
            query=query,
            project_id=project_id,
            window=window,
            preset=preset,
        )
        return {"answer": response.get("answer")}

    return discover, interpret, search
