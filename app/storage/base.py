"""Avatar storage protocol and shared helpers."""

from __future__ import annotations

from typing import Protocol

EXTENSION_BY_CONTENT_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def extension_for_content_type(content_type: str) -> str:
    ext = EXTENSION_BY_CONTENT_TYPE.get(content_type)
    if ext is None:
        raise ValueError(f"unsupported content type: {content_type}")
    return ext


class AvatarStorage(Protocol):
    """Pluggable avatar storage backend."""

    @property
    def backend_name(self) -> str:
        """Backend identifier stored on the user record."""

    async def upload(self, user_id: str, data: bytes, content_type: str) -> str:
        """Store avatar bytes and return the storage key."""

    async def delete(self, user_id: str, *, key: str | None = None) -> None:
        """Remove the avatar for a user."""

    def public_url(self, user_id: str, key: str | None) -> str:
        """Return the URL clients can use to fetch the avatar."""
