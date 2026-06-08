"""Pluggable avatar storage backends."""

from .factory import get_avatar_storage
from .base import AvatarStorage

__all__ = ["AvatarStorage", "get_avatar_storage"]
