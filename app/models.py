"""SQLAlchemy models."""

from __future__ import annotations

import uuid

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(100))
    avatar_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_backend: Mapped[str | None] = mapped_column(String(32), nullable=True)

    def to_dict(self, *, avatar_url: str | None = None) -> dict[str, str | None]:
        return {
            "id": self.id,
            "email": self.email,
            "display_name": self.display_name,
            "avatar_url": avatar_url,
        }
