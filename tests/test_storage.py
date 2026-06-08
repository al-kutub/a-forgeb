"""Unit tests for pluggable avatar storage backends."""

from __future__ import annotations

import asyncio
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from app.storage.factory import get_avatar_storage, reset_avatar_storage
from app.storage.local import LocalAvatarStorage
from app.storage.s3 import S3AvatarStorage

PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
    b"\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)

JPEG_MINIMAL = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01"
    b"\x00\x01\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06"
    b"\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b"
    b"\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c"
    b"\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0"
    b"\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4"
    b"\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00"
    b"\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05"
    b"\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00"
    b"?\x00\xaa\xff\xd9"
)


def run(coro):
    return asyncio.run(coro)


@pytest.fixture(autouse=True)
def clear_storage_singleton():
    reset_avatar_storage()
    yield
    reset_avatar_storage()


def test_local_upload_delete_and_public_url(tmp_path: Path):
    storage = LocalAvatarStorage(base_dir=tmp_path)
    user_id = "550e8400-e29b-41d4-a716-446655440000"

    key = run(storage.upload(user_id, PNG_1X1, "image/png"))
    assert key == f"{user_id}.png"
    assert (tmp_path / key).read_bytes() == PNG_1X1
    assert storage.public_url(user_id, key) == f"/users/{user_id}/avatar"

    run(storage.delete(user_id))
    assert not (tmp_path / key).exists()
    assert storage.public_url(user_id, None) == ""


def test_local_replaces_existing_extension(tmp_path: Path):
    storage = LocalAvatarStorage(base_dir=tmp_path)
    user_id = "user-42"

    png_key = run(storage.upload(user_id, PNG_1X1, "image/png"))
    jpeg_key = run(storage.upload(user_id, JPEG_MINIMAL, "image/jpeg"))

    assert png_key == f"{user_id}.png"
    assert jpeg_key == f"{user_id}.jpg"
    assert not (tmp_path / png_key).exists()
    assert (tmp_path / jpeg_key).read_bytes() == JPEG_MINIMAL


def test_local_delete_by_key(tmp_path: Path):
    storage = LocalAvatarStorage(base_dir=tmp_path)
    user_id = "user-99"
    key = run(storage.upload(user_id, PNG_1X1, "image/png"))

    run(storage.delete(user_id, key=key))
    assert not (tmp_path / key).exists()


def test_s3_upload_delete_and_public_url():
    mock_client = MagicMock()
    storage = S3AvatarStorage(
        bucket="forge-avatars",
        region="us-east-1",
        cdn_base_url="https://cdn.example.com",
        client=mock_client,
    )
    user_id = "550e8400-e29b-41d4-a716-446655440000"

    key = run(storage.upload(user_id, PNG_1X1, "image/png"))
    assert key == f"avatars/{user_id}.png"
    mock_client.put_object.assert_called_once_with(
        Bucket="forge-avatars",
        Key=key,
        Body=PNG_1X1,
        ContentType="image/png",
    )
    assert (
        storage.public_url(user_id, key)
        == f"https://cdn.example.com/avatars/{user_id}.png"
    )

    run(storage.delete(user_id, key=key))
    mock_client.delete_object.assert_called_once_with(
        Bucket="forge-avatars",
        Key=key,
    )


def test_factory_defaults_to_local(monkeypatch):
    monkeypatch.delenv("AVATAR_STORAGE_BACKEND", raising=False)
    storage = get_avatar_storage()
    assert storage.backend_name == "local"


def test_factory_selects_s3(monkeypatch):
    monkeypatch.setenv("AVATAR_STORAGE_BACKEND", "s3")
    monkeypatch.setenv("S3_BUCKET", "test-bucket")
    monkeypatch.setenv("CDN_BASE_URL", "https://cdn.test")

    storage = get_avatar_storage()
    assert storage.backend_name == "s3"
    assert isinstance(storage, S3AvatarStorage)


def test_factory_rejects_unknown_backend(monkeypatch):
    monkeypatch.setenv("AVATAR_STORAGE_BACKEND", "gcs")
    with pytest.raises(ValueError, match="unsupported AVATAR_STORAGE_BACKEND"):
        get_avatar_storage()
