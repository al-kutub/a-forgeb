"""Avatar storage backend selection."""

from __future__ import annotations

import os

from .base import AvatarStorage
from .local import LocalAvatarStorage
from .s3 import S3AvatarStorage

_storage: AvatarStorage | None = None


def get_avatar_storage() -> AvatarStorage:
    """Return the configured avatar storage backend (singleton)."""
    global _storage
    if _storage is not None:
        return _storage

    backend = os.getenv("AVATAR_STORAGE_BACKEND", "local").lower()
    if backend == "local":
        _storage = LocalAvatarStorage()
    elif backend == "s3":
        _storage = S3AvatarStorage()
    else:
        raise ValueError(
            f"unsupported AVATAR_STORAGE_BACKEND: {backend!r} (expected 'local' or 's3')"
        )
    return _storage


def reset_avatar_storage() -> None:
    """Clear the cached storage instance (for tests)."""
    global _storage
    _storage = None
