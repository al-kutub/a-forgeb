"""Tests for user profiles and profile photos."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
    b"\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


def test_create_and_get_user():
    create = client.post("/users", json={"name": "Ada Lovelace"})
    assert create.status_code == 201
    body = create.json()
    assert body["name"] == "Ada Lovelace"
    assert body["photo_url"] is None
    user_id = body["id"]

    fetched = client.get(f"/users/{user_id}")
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Ada Lovelace"


def test_upload_and_fetch_profile_photo():
    create = client.post("/users", json={"name": "Grace Hopper"})
    user_id = create.json()["id"]

    upload = client.post(
        f"/users/{user_id}/photo",
        files={"file": ("avatar.png", PNG_1X1, "image/png")},
    )
    assert upload.status_code == 200
    assert upload.json()["photo_url"] == f"/users/{user_id}/photo"

    photo = client.get(f"/users/{user_id}/photo")
    assert photo.status_code == 200
    assert photo.content == PNG_1X1


def test_missing_user_returns_404():
    resp = client.get("/users/does-not-exist")
    assert resp.status_code == 404
