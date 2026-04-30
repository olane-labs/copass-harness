"""Sandbox Connections resource — cross-user sandbox grants.

Port of ``typescript/packages/core/src/resources/sandbox-connections.ts``.

Phase 1A scope (read-only): ``list`` (backs the
``list_sandbox_connections`` management tool). Write methods
(``create``, ``revoke``, ``spawn_api_key``) are included for parity
with the TS surface — they're thin wrappers over existing endpoints.
Spec-driven write tools land in Phase 2.

Grants a non-owner (the *grantee*) ``viewer`` or ``editor`` access to
a sandbox the caller owns. Backed by ``sandbox_connections`` and
``copass_api_keys`` (migration 058).

Identity resolution: :meth:`create` accepts ``copass_id``, ``user_id``,
or ``email`` — exactly one. ``copass_id`` is resolved server-side to
the grantee's UUID; only the resolved UUID is persisted, so the grant
survives the grantee renaming or releasing their handle.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from copass_core.resources.base import BaseResource


_BASE = "/api/v1/storage/sandboxes"


class SandboxConnectionsResource(BaseResource):
    """``/api/v1/storage/sandboxes/{id}/connections``."""

    async def create(
        self,
        sandbox_id: str,
        *,
        role: str,
        copass_id: Optional[str] = None,
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        project_id: Optional[str] = None,
        label: Optional[str] = None,
        expires_at: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Grant a connection on a sandbox you own. Owner-only."""
        body: Dict[str, Any] = {"role": role}
        if copass_id is not None:
            body["copass_id"] = copass_id
        if user_id is not None:
            body["user_id"] = user_id
        if email is not None:
            body["email"] = email
        if project_id is not None:
            body["project_id"] = project_id
        if label is not None:
            body["label"] = label
        if expires_at is not None:
            body["expires_at"] = expires_at
        return await self._post(f"{_BASE}/{sandbox_id}/connections", body)

    async def list(
        self,
        sandbox_id: str,
        *,
        include_revoked: bool = False,
    ) -> List[Dict[str, Any]]:
        """List all grants on a sandbox you own. Owner-only.

        Pass ``include_revoked=True`` to surface previously-revoked or
        expired grants too.
        """
        query: Dict[str, Any] = {}
        if include_revoked:
            query["include_revoked"] = "true"
        return await self._get(
            f"{_BASE}/{sandbox_id}/connections",
            query=query or None,
        )

    async def revoke(
        self,
        sandbox_id: str,
        connection_id: str,
    ) -> Dict[str, Any]:
        """Soft-delete a grant.

        Cascades to API keys bound to this connection so no key
        outlives its grant.
        """
        return await self._delete(
            f"{_BASE}/{sandbox_id}/connections/{connection_id}"
        )

    async def spawn_api_key(
        self,
        sandbox_id: str,
        connection_id: str,
    ) -> Dict[str, Any]:
        """Spawn a connection-scoped API key for an existing grant.

        The plaintext key is returned **exactly once** — persist it
        immediately or rotate.
        """
        return await self._post(
            f"{_BASE}/{sandbox_id}/connections/{connection_id}/api-keys"
        )


__all__ = ["SandboxConnectionsResource"]
