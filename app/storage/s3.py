"""S3-backed avatar storage with CDN public URLs."""

from __future__ import annotations

import os

import boto3

from .base import extension_for_content_type


class S3AvatarStorage:
    """Upload avatars to S3 and expose them via a CDN base URL."""

    def __init__(
        self,
        *,
        bucket: str | None = None,
        region: str | None = None,
        cdn_base_url: str | None = None,
        client=None,
    ) -> None:
        self.bucket = bucket or os.environ["S3_BUCKET"]
        self.region = region or os.getenv("S3_REGION", "us-east-1")
        self.cdn_base_url = (cdn_base_url or os.environ["CDN_BASE_URL"]).rstrip("/")
        self._client = client

    @property
    def client(self):
        if self._client is None:
            self._client = boto3.client("s3", region_name=self.region)
        return self._client

    @property
    def backend_name(self) -> str:
        return "s3"

    async def upload(self, user_id: str, data: bytes, content_type: str) -> str:
        ext = extension_for_content_type(content_type)
        key = f"avatars/{user_id}{ext}"
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        return key

    async def delete(self, user_id: str, *, key: str | None = None) -> None:
        if key is None:
            for ext in (".jpg", ".png", ".webp"):
                candidate = f"avatars/{user_id}{ext}"
                self.client.delete_object(Bucket=self.bucket, Key=candidate)
            return
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def public_url(self, user_id: str, key: str | None) -> str:
        if key is None:
            return ""
        filename = key.split("/")[-1]
        return f"{self.cdn_base_url}/avatars/{filename}"
