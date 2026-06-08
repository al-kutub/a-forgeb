"""Tests for the Quote API."""

from app.quotes import QUOTES


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["quotes"] == len(QUOTES)


def test_quote_shape(client):
    resp = client.get("/quote")
    assert resp.status_code == 200
    body = resp.json()
    assert "text" in body and "author" in body
    assert isinstance(body["text"], str) and body["text"]
    assert isinstance(body["author"], str) and body["author"]


def test_quote_is_known(client):
    resp = client.get("/quote")
    body = resp.json()
    assert body in QUOTES
