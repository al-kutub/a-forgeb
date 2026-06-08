"""Tests for authenticated avatar upload, delete, and public GET."""

PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
    b"\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)

WEBP_MINIMAL = (
    b"RIFF$\x00\x00\x00WEBPVP8 \x18\x00\x00\x00\x10\x01\x00\x9d\x01*"
    b"\x01\x00\x01\x00\x03\x00\x00\x00\x00\x00\x00\x00\x00\x00"
)


def _register(auth_client, email="avatar@example.com"):
    resp = auth_client.post(
        "/auth/register",
        json={
            "email": email,
            "password": "securepass",
            "display_name": "Avatar User",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    return body["access_token"], body["user"]["id"]


def test_upload_and_get_avatar(auth_client):
    token, user_id = _register(auth_client)

    upload = auth_client.put(
        "/users/me/avatar",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("avatar.png", PNG_1X1, "image/png")},
    )
    assert upload.status_code == 200
    body = upload.json()
    assert body["avatar_url"] == f"/users/{user_id}/avatar"

    avatar = auth_client.get(f"/users/{user_id}/avatar")
    assert avatar.status_code == 200
    assert avatar.content == PNG_1X1
    assert avatar.headers["content-type"].startswith("image/png")


def test_public_get_without_auth(auth_client):
    token, user_id = _register(auth_client)
    auth_client.put(
        "/users/me/avatar",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("avatar.png", PNG_1X1, "image/png")},
    )

    avatar = auth_client.get(f"/users/{user_id}/avatar")
    assert avatar.status_code == 200
    assert avatar.content == PNG_1X1


def test_placeholder_when_no_avatar(auth_client):
    _, user_id = _register(auth_client)

    avatar = auth_client.get(f"/users/{user_id}/avatar")
    assert avatar.status_code == 200
    assert avatar.headers["content-type"] == "image/svg+xml"
    assert b"<svg" in avatar.content


def test_delete_avatar(auth_client):
    token, user_id = _register(auth_client)
    auth_client.put(
        "/users/me/avatar",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("avatar.png", PNG_1X1, "image/png")},
    )

    delete = auth_client.delete(
        "/users/me/avatar",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert delete.status_code == 204

    avatar = auth_client.get(f"/users/{user_id}/avatar")
    assert avatar.headers["content-type"] == "image/svg+xml"


def test_upload_requires_auth(auth_client):
    resp = auth_client.put(
        "/users/me/avatar",
        files={"file": ("avatar.png", PNG_1X1, "image/png")},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Not authenticated"


def test_delete_requires_auth(auth_client):
    resp = auth_client.delete("/users/me/avatar")
    assert resp.status_code == 401


def test_rejects_oversized_file(auth_client):
    token, _ = _register(auth_client, email="big@example.com")
    oversized = PNG_1X1 + (b"\x00" * (2 * 1024 * 1024))

    resp = auth_client.put(
        "/users/me/avatar",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("avatar.png", oversized, "image/png")},
    )
    assert resp.status_code == 422
    assert "2 MB" in resp.json()["detail"]


def test_rejects_mismatched_content_type(auth_client):
    token, _ = _register(auth_client, email="mismatch@example.com")

    resp = auth_client.put(
        "/users/me/avatar",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("avatar.jpg", PNG_1X1, "image/jpeg")},
    )
    assert resp.status_code == 422
    assert "does not match" in resp.json()["detail"]


def test_rejects_unsupported_format(auth_client):
    token, _ = _register(auth_client, email="gif@example.com")
    gif_bytes = b"GIF89a" + b"\x00" * 32

    resp = auth_client.put(
        "/users/me/avatar",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("avatar.gif", gif_bytes, "image/gif")},
    )
    assert resp.status_code == 422


def test_accepts_webp(auth_client):
    token, user_id = _register(auth_client, email="webp@example.com")

    upload = auth_client.put(
        "/users/me/avatar",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("avatar.webp", WEBP_MINIMAL, "image/webp")},
    )
    assert upload.status_code == 200

    avatar = auth_client.get(f"/users/{user_id}/avatar")
    assert avatar.status_code == 200
    assert avatar.content == WEBP_MINIMAL


def test_me_includes_avatar_url(auth_client):
    token, user_id = _register(auth_client, email="me-avatar@example.com")
    auth_client.put(
        "/users/me/avatar",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("avatar.png", PNG_1X1, "image/png")},
    )

    me = auth_client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me.status_code == 200
    assert me.json()["avatar_url"] == f"/users/{user_id}/avatar"


def test_missing_user_avatar_returns_404(auth_client):
    resp = auth_client.get("/users/does-not-exist/avatar")
    assert resp.status_code == 404
