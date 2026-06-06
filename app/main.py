"""Quote API — a small FastAPI service.

Endpoints:
  GET /health  -> service liveness
  GET /quote   -> a random quote
"""

from fastapi import FastAPI

from .quotes import QUOTES, random_quote

app = FastAPI(title="Quote API", version="1.0.0")


@app.get("/health")
def health():
    """Liveness check."""
    return {"status": "ok", "quotes": len(QUOTES)}


@app.get("/quote")
def quote():
    """Return a random quote."""
    return random_quote()
