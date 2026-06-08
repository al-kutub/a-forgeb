"""SQLAlchemy database setup."""

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DB_PATH = Path(__file__).resolve().parent.parent / "users.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_avatar_columns()


def _ensure_avatar_columns() -> None:
    """Add avatar columns when upgrading an existing users.db."""
    with engine.begin() as conn:
        rows = conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()
        if not rows:
            return
        columns = {row[1] for row in rows}
        if "avatar_key" not in columns:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN avatar_key VARCHAR(255)")
        if "avatar_backend" not in columns:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN avatar_backend VARCHAR(32)")
