"""Figure storage abstraction - local filesystem or Cloudflare R2."""

import os
from pathlib import Path
from typing import Protocol
import json

import boto3
from botocore.config import Config


class StorageBackend(Protocol):
    """Protocol for storage backends."""

    def save_file(self, key: str, data: bytes) -> str:
        """Save a file and return its URL."""
        ...

    def get_file(self, key: str) -> bytes | None:
        """Get a file by key."""
        ...

    def file_exists(self, key: str) -> bool:
        """Check if a file exists."""
        ...

    def save_metadata(self, arxiv_id: str, metadata: list[dict]) -> None:
        """Save figure metadata for a paper."""
        ...

    def get_metadata(self, arxiv_id: str) -> list[dict] | None:
        """Get figure metadata for a paper."""
        ...

    def get_file_url(self, key: str) -> str:
        """Get the URL for a file."""
        ...


class LocalStorage:
    """Local filesystem storage."""

    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save_file(self, key: str, data: bytes) -> str:
        path = self.base_dir / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return f"/figures/{key}"

    def get_file(self, key: str) -> bytes | None:
        path = self.base_dir / key
        if path.exists():
            return path.read_bytes()
        return None

    def file_exists(self, key: str) -> bool:
        return (self.base_dir / key).exists()

    def save_metadata(self, arxiv_id: str, metadata: list[dict]) -> None:
        path = self.base_dir / arxiv_id / "metadata.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(metadata))

    def get_metadata(self, arxiv_id: str) -> list[dict] | None:
        path = self.base_dir / arxiv_id / "metadata.json"
        if path.exists():
            return json.loads(path.read_text())
        return None

    def get_file_url(self, key: str) -> str:
        return f"/figures/{key}"

    def get_paper_dir(self, arxiv_id: str) -> Path:
        """Get the directory for a paper's figures."""
        path = self.base_dir / arxiv_id
        path.mkdir(parents=True, exist_ok=True)
        return path


class R2Storage:
    """Cloudflare R2 storage."""

    def __init__(
        self,
        bucket: str,
        account_id: str,
        access_key_id: str,
        secret_access_key: str,
        public_url: str,
    ):
        self.bucket = bucket
        self.public_url = public_url.rstrip("/")

        self.s3 = boto3.client(
            "s3",
            endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            config=Config(signature_version="s3v4"),
        )

    def save_file(self, key: str, data: bytes) -> str:
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=data)
        return f"{self.public_url}/{key}"

    def get_file(self, key: str) -> bytes | None:
        try:
            response = self.s3.get_object(Bucket=self.bucket, Key=key)
            return response["Body"].read()
        except self.s3.exceptions.NoSuchKey:
            return None
        except Exception:
            return None

    def file_exists(self, key: str) -> bool:
        try:
            self.s3.head_object(Bucket=self.bucket, Key=key)
            return True
        except Exception:
            return False

    def save_metadata(self, arxiv_id: str, metadata: list[dict]) -> None:
        key = f"{arxiv_id}/metadata.json"
        self.s3.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=json.dumps(metadata).encode(),
            ContentType="application/json",
        )

    def get_metadata(self, arxiv_id: str) -> list[dict] | None:
        key = f"{arxiv_id}/metadata.json"
        try:
            response = self.s3.get_object(Bucket=self.bucket, Key=key)
            return json.loads(response["Body"].read().decode())
        except Exception:
            return None

    def get_file_url(self, key: str) -> str:
        return f"{self.public_url}/{key}"


def get_storage() -> LocalStorage | R2Storage:
    """Get the configured storage backend."""
    r2_bucket = os.environ.get("R2_BUCKET")

    if r2_bucket:
        return R2Storage(
            bucket=r2_bucket,
            account_id=os.environ["R2_ACCOUNT_ID"],
            access_key_id=os.environ["R2_ACCESS_KEY_ID"],
            secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            public_url=os.environ["R2_PUBLIC_URL"],
        )
    else:
        # Local storage
        base_dir = Path(os.environ.get("FIGURES_DIR", str(Path.home() / ".papers" / "figures")))
        return LocalStorage(base_dir)
