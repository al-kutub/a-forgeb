"""Smoke tests for static frontend pages and auth flow via API."""

PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
    b"\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


def test_static_pages_served(client):
    for path in ("/", "/login.html", "/register.html", "/profile.html", "/app.js", "/styles.css"):
        resp = client.get(path)
        assert resp.status_code == 200, path
        assert resp.content, path


def test_api_routes_take_precedence_over_static(client):
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    quote = client.get("/quote")
    assert quote.status_code == 200
    assert "text" in quote.json()


def test_auth_flow_smoke(auth_client):
    register = auth_client.post(
        "/auth/register",
        json={
            "email": "ui-smoke@example.com",
            "password": "securepass",
            "display_name": "UI Smoke",
        },
    )
    assert register.status_code == 201
    token = register.json()["access_token"]
    user_id = register.json()["user"]["id"]

    me = auth_client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["display_name"] == "UI Smoke"

    upload = auth_client.put(
        "/users/me/avatar",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("avatar.png", PNG_1X1, "image/png")},
    )
    assert upload.status_code == 200
    assert upload.json()["avatar_url"] == f"/users/{user_id}/avatar"

    avatar = auth_client.get(f"/users/{user_id}/avatar")
    assert avatar.status_code == 200
    assert avatar.content == PNG_1X1

    delete = auth_client.delete(
        "/users/me/avatar",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert delete.status_code == 204

    placeholder = auth_client.get(f"/users/{user_id}/avatar")
    assert placeholder.status_code == 200
    assert b"<svg" in placeholder.content
