"""Shared pytest fixtures."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401
from app.database import Base, get_db
from app.main import app
from app.storage.factory import reset_avatar_storage
from app.storage.local import LocalAvatarStorage


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def auth_client(tmp_path, monkeypatch):
    avatars_dir = tmp_path / "avatars"
    avatars_dir.mkdir()
    reset_avatar_storage()
    monkeypatch.setenv("AVATAR_STORAGE_BACKEND", "local")

    import app.storage.factory as storage_factory

    monkeypatch.setattr(
        storage_factory,
        "get_avatar_storage",
        lambda: LocalAvatarStorage(base_dir=avatars_dir),
    )

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    reset_avatar_storage()
