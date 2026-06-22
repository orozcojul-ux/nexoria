"""Stockage persistant des fichiers uploadés (avatars profil, etc.).

Production (VPS) — recommandé :
  NEXORIA_UPLOAD_DIR=/var/www/nexoria/uploads

Développement local (défaut) :
  backend/uploads/

URLs publiques stockées en base (relatives, même origine que le site) :
  /uploads/profiles/<user_id>_<uuid>.jpg
"""
from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent.resolve()
UPLOAD_ROOT = Path(os.environ.get("NEXORIA_UPLOAD_DIR", ROOT_DIR / "uploads")).resolve()

PROFILE_UPLOAD_DIR = UPLOAD_ROOT / "profiles"
LEGACY_AVATAR_DIR = UPLOAD_ROOT / "avatars"
CONTENT_UPLOAD_DIR = UPLOAD_ROOT / "content"
MAINTENANCE_UPLOAD_DIR = UPLOAD_ROOT / "maintenance"

PROFILE_PUBLIC_PREFIX = "/uploads/profiles"
LEGACY_AVATAR_PREFIX = "/uploads/avatars"
PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024

PROFILE_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/pjpeg": ".jpg",
    "image/x-png": ".png",
}

_EXT_TO_PROFILE_MIME = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}


def ensure_upload_dirs() -> None:
    for directory in (PROFILE_UPLOAD_DIR, LEGACY_AVATAR_DIR, CONTENT_UPLOAD_DIR, MAINTENANCE_UPLOAD_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def resolve_profile_image_type(content_type: str, filename: str | None) -> str | None:
    ct = (content_type or "").lower().split(";")[0].strip()
    if ct in PROFILE_IMAGE_TYPES:
        return ct
    ext = (filename or "").lower().rsplit(".", 1)[-1] if filename and "." in filename else ""
    return _EXT_TO_PROFILE_MIME.get(ext)


def is_managed_profile_url(url: str | None) -> bool:
    if not url or not isinstance(url, str):
        return False
    return url.startswith(PROFILE_PUBLIC_PREFIX + "/") or url.startswith(LEGACY_AVATAR_PREFIX + "/")


def _safe_file_in_dir(directory: Path, filename: str) -> Path | None:
    if not filename or ".." in filename or "/" in filename or "\\" in filename:
        return None
    try:
        resolved = (directory / filename).resolve()
        if not str(resolved).startswith(str(directory.resolve())):
            return None
        return resolved
    except Exception:
        return None


def delete_managed_profile_file(url: str | None) -> None:
    """Supprime un ancien avatar local (profiles/ ou legacy avatars/)."""
    if not is_managed_profile_url(url):
        return
    filename = url.rsplit("/", 1)[-1]
    if url.startswith(PROFILE_PUBLIC_PREFIX + "/"):
        path = _safe_file_in_dir(PROFILE_UPLOAD_DIR, filename)
    else:
        path = _safe_file_in_dir(LEGACY_AVATAR_DIR, filename)
    if not path or not path.is_file():
        return
    try:
        path.unlink()
    except OSError as exc:
        logger.warning("Could not delete old profile image %s: %s", path, exc)


def save_profile_image(data: bytes, content_type: str, user_id: str) -> str:
    """Écrit l'image sur disque et retourne l'URL publique relative."""
    if len(data) > PROFILE_IMAGE_MAX_BYTES:
        raise ValueError("Image trop lourde (max 5 Mo)")
    ext = PROFILE_IMAGE_TYPES.get(content_type)
    if not ext:
        raise ValueError("Format non supporté (JPG, PNG, WebP)")
    safe_uid = "".join(c for c in user_id if c.isalnum() or c in "-_")[:48] or "user"
    filename = f"{safe_uid}_{uuid.uuid4().hex[:12]}{ext}"
    dest = PROFILE_UPLOAD_DIR / filename
    dest.write_bytes(data)
    return f"{PROFILE_PUBLIC_PREFIX}/{filename}"


def profile_upload_response(public_url: str) -> dict:
    return {
        "url": public_url,
        "avatar_url": public_url,
        "avatarUrl": public_url,
    }
