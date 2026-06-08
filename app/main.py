"""Forge API — FastAPI service with quotes and user profile photos."""

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .quotes import QUOTES, random_quote
from .users import store

app = FastAPI(title="Forge API", version="1.1.0")


class CreateUserRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


@app.get("/health")
def health():
    """Liveness check."""
    return {"status": "ok", "quotes": len(QUOTES), "users": len(store._users)}


@app.get("/quote")
def quote():
    """Return a random quote."""
    return random_quote()


@app.post("/users", status_code=201)
def create_user(body: CreateUserRequest):
    """Create a user profile."""
    try:
        user = store.create(body.name)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return user.to_dict()


@app.get("/users/{user_id}")
def get_user(user_id: str):
    """Return a user profile including photo URL when set."""
    user = store.get(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    return user.to_dict()


@app.post("/users/{user_id}/photo")
async def upload_profile_photo(user_id: str, file: UploadFile = File(...)):
    """Upload or replace a user's profile photo."""
    if store.get(user_id) is None:
        raise HTTPException(status_code=404, detail="user not found")
    if not file.content_type:
        raise HTTPException(status_code=422, detail="content type is required")

    try:
        user = store.save_photo(user_id, file.file, file.content_type)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return user.to_dict()


@app.get("/users/{user_id}/photo")
def get_profile_photo(user_id: str):
    """Serve the stored profile photo for a user."""
    path = store.photo_path(user_id)
    if path is None:
        raise HTTPException(status_code=404, detail="profile photo not found")
    return FileResponse(path)
