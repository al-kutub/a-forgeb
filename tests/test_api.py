"""Tests for the Quote API."""

from fastapi.testclient import TestClient

from app.main import app
from app.quotes import QUOTES

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["quotes"] == len(QUOTES)


def test_quote_shape():
    resp = client.get("/quote")
    assert resp.status_code == 200
    body = resp.json()
    assert "text" in body and "author" in body
    assert isinstance(body["text"], str) and body["text"]
    assert isinstance(body["author"], str) and body["author"]


def test_quote_is_known():
    resp = client.get("/quote")
    body = resp.json()
    assert body in QUOTES
