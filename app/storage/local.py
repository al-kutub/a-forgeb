"""Local filesystem avatar storage."""

from __future__ import annotations

from pathlib import Path

from .base import extension_for_content_type

DEFAULT_AVATARS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "avatars"


class LocalAvatarStorage:
    """Store avatars on disk under data/avatars/."""

    def __init__(self, base_dir: Path | None = None) -> None:
        self.base_dir = base_dir or DEFAULT_AVATARS_DIR
        self.base_dir.mkdir(parents=True, exist_ok=True)

    @property
    def backend_name(self) -> str:
        return "local"

    async def upload(self, user_id: str, data: bytes, content_type: str) -> str:
        ext = extension_for_content_type(content_type)
        key = f"{user_id}{ext}"
        self._delete_existing(user_id)
        (self.base_dir / key).write_bytes(data)
        return key

    async def delete(self, user_id: str, *, key: str | None = None) -> None:
        if key is not None:
            path = self.base_dir / key
            if path.is_file():
                path.unlink()
            return
        self._delete_existing(user_id)

    def public_url(self, user_id: str, key: str | None) -> str:
        if key is None:
            return ""
        return f"/users/{user_id}/avatar"

    def path_for_key(self, key: str) -> Path:
        return self.base_dir / key

    def _delete_existing(self, user_id: str) -> None:
        for path in self.base_dir.glob(f"{user_id}.*"):
            if path.is_file():
                path.unlink()
