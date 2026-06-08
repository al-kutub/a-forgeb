"""Tests for JWT auth and the SQLAlchemy user model."""


def test_register(auth_client):
    resp = auth_client.post(
        "/auth/register",
        json={
            "email": "ada@example.com",
            "password": "securepass",
            "display_name": "Ada Lovelace",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "ada@example.com"
    assert body["user"]["display_name"] == "Ada Lovelace"
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]


def test_login(auth_client):
    auth_client.post(
        "/auth/register",
        json={
            "email": "grace@example.com",
            "password": "securepass",
            "display_name": "Grace Hopper",
        },
    )

    resp = auth_client.post(
        "/auth/login",
        json={"email": "grace@example.com", "password": "securepass"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"]
    assert body["user"]["email"] == "grace@example.com"


def test_invalid_credentials(auth_client):
    auth_client.post(
        "/auth/register",
        json={
            "email": "alan@example.com",
            "password": "securepass",
            "display_name": "Alan Turing",
        },
    )

    resp = auth_client.post(
        "/auth/login",
        json={"email": "alan@example.com", "password": "wrong-password"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "invalid credentials"


def test_me_with_token(auth_client):
    register = auth_client.post(
        "/auth/register",
        json={
            "email": "me@example.com",
            "password": "securepass",
            "display_name": "Current User",
        },
    )
    token = register.json()["access_token"]

    resp = auth_client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@example.com"
    assert resp.json()["display_name"] == "Current User"


def test_me_without_token(auth_client):
    resp = auth_client.get("/auth/me")
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Not authenticated"
