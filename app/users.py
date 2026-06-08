"""User profiles and profile photo storage."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import BinaryIO

UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
EXTENSION_BY_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


@dataclass
class User:
    id: str
    name: str
    photo_filename: str | None = None

    def to_dict(self, *, base_url: str = "") -> dict:
        photo_url = None
        if self.photo_filename:
            photo_url = f"{base_url}/users/{self.id}/photo"
        return {"id": self.id, "name": self.name, "photo_url": photo_url}


class UserStore:
    """In-memory user registry with on-disk photo files."""

    def __init__(self, uploads_dir: Path = UPLOADS_DIR) -> None:
        self._users: dict[str, User] = {}
        self.uploads_dir = uploads_dir
        self.uploads_dir.mkdir(parents=True, exist_ok=True)

    def create(self, name: str) -> User:
        user = User(id=str(uuid.uuid4()), name=name.strip())
        if not user.name:
            raise ValueError("name is required")
        self._users[user.id] = user
        return user

    def get(self, user_id: str) -> User | None:
        return self._users.get(user_id)

    def save_photo(self, user_id: str, content: BinaryIO, content_type: str) -> User:
        user = self._users.get(user_id)
        if user is None:
            raise KeyError(user_id)
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise ValueError(f"unsupported content type: {content_type}")

        ext = EXTENSION_BY_TYPE[content_type]
        filename = f"{user_id}{ext}"
        path = self.uploads_dir / filename
        path.write_bytes(content.read())
        user.photo_filename = filename
        return user

    def photo_path(self, user_id: str) -> Path | None:
        user = self._users.get(user_id)
        if user is None or user.photo_filename is None:
            return None
        path = self.uploads_dir / user.photo_filename
        return path if path.is_file() else None


store = UserStore()
