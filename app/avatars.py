"""Avatar validation and placeholder generation."""

from __future__ import annotations

MAX_AVATAR_BYTES = 2 * 1024 * 1024
ALLOWED_CONTENT_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})

PLACEHOLDER_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Default avatar">
  <rect width="128" height="128" fill="#e2e8f0"/>
  <circle cx="64" cy="52" r="24" fill="#94a3b8"/>
  <path d="M24 112c8-22 28-34 40-34s32 12 40 34" fill="#94a3b8"/>
</svg>"""


def detect_content_type(data: bytes) -> str | None:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def validate_avatar(data: bytes, declared_type: str | None) -> str:
    if not data:
        raise ValueError("empty file")
    if len(data) > MAX_AVATAR_BYTES:
        raise ValueError("file exceeds 2 MB limit")

    detected = detect_content_type(data)
    if detected is None:
        raise ValueError("unsupported image format")
    if declared_type and declared_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"unsupported content type: {declared_type}")
    if declared_type and declared_type != detected:
        raise ValueError("content type does not match file contents")
    return detected
