"""Forge API — FastAPI service with quotes and user profile photos."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .auth_routes import router as auth_router
from .avatar_routes import router as avatar_router
from .database import get_db, init_db
from .models import User
from .quotes import QUOTES, random_quote

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Forge API", version="2.0.0", lifespan=lifespan)
app.include_router(auth_router)
app.include_router(avatar_router)


@app.get("/health")
def health(db: Session = Depends(get_db)):
    """Liveness check."""
    return {
        "status": "ok",
        "quotes": len(QUOTES),
        "users": db.query(User).count(),
    }


@app.get("/quote")
def quote():
    """Return a random quote."""
    return random_quote()


app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
