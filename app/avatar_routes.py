"""Authenticated avatar upload/delete and public avatar serving."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, RedirectResponse, Response
from sqlalchemy.orm import Session

from .auth import get_current_user
from .avatars import PLACEHOLDER_SVG, validate_avatar
from .database import get_db
from .models import User
from .storage.factory import get_avatar_storage
from .storage.local import LocalAvatarStorage

router = APIRouter(tags=["avatars"])


def _avatar_url(user: User) -> str | None:
    if user.avatar_key is None:
        return None
    storage = get_avatar_storage()
    url = storage.public_url(user.id, user.avatar_key)
    return url or None


@router.put("/users/me/avatar")
async def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str | None]:
    data = await file.read()
    try:
        content_type = validate_avatar(data, file.content_type)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    storage = get_avatar_storage()
    key = await storage.upload(current_user.id, data, content_type)
    current_user.avatar_key = key
    current_user.avatar_backend = storage.backend_name
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user.to_dict(avatar_url=_avatar_url(current_user))


@router.delete("/users/me/avatar", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    if current_user.avatar_key is None:
        return None

    storage = get_avatar_storage()
    await storage.delete(current_user.id, key=current_user.avatar_key)
    current_user.avatar_key = None
    current_user.avatar_backend = None
    db.add(current_user)
    db.commit()
    return None


@router.get("/users/{user_id}/avatar")
async def get_user_avatar(user_id: str, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")

    if user.avatar_key is None:
        return Response(content=PLACEHOLDER_SVG, media_type="image/svg+xml")

    storage = get_avatar_storage()
    if user.avatar_backend == "s3" or storage.backend_name == "s3":
        url = storage.public_url(user.id, user.avatar_key)
        return RedirectResponse(url=url, status_code=307)

    if not isinstance(storage, LocalAvatarStorage):
        raise HTTPException(status_code=500, detail="avatar storage misconfigured")

    path = storage.path_for_key(user.avatar_key)
    if not path.is_file():
        return Response(content=PLACEHOLDER_SVG, media_type="image/svg+xml")

    media_type = _media_type_for_key(user.avatar_key)
    return FileResponse(path, media_type=media_type)


def _media_type_for_key(key: str) -> str:
    if key.endswith(".png"):
        return "image/png"
    if key.endswith(".jpg") or key.endswith(".jpeg"):
        return "image/jpeg"
    if key.endswith(".webp"):
        return "image/webp"
    return "application/octet-stream"
