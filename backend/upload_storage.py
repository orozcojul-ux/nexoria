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
import re
import uuid
from pathlib import Path
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent.resolve()
UPLOAD_ROOT = Path(os.environ.get("NEXORIA_UPLOAD_DIR", ROOT_DIR / "uploads")).resolve()

PROFILE_UPLOAD_DIR = UPLOAD_ROOT / "profiles"
LEGACY_AVATAR_DIR = UPLOAD_ROOT / "avatars"
CONTENT_UPLOAD_DIR = UPLOAD_ROOT / "content"
MAINTENANCE_UPLOAD_DIR = UPLOAD_ROOT / "maintenance"

PROFILE_PUBLIC_PREFIX = "/uploads/profiles"
LEGACY_AVATAR_PREFIX = "/uploads/avatars"
CONTENT_PUBLIC_PREFIX = "/uploads/content"
MAINTENANCE_PUBLIC_PREFIX = "/uploads/maintenance"
UPLOADS_PATH_MARKER = "/uploads/"

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

_LOCAL_HOST_RE = re.compile(r"^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?", re.I)


def ensure_upload_dirs() -> None:
    for directory in (PROFILE_UPLOAD_DIR, LEGACY_AVATAR_DIR, CONTENT_UPLOAD_DIR, MAINTENANCE_UPLOAD_DIR):
        directory.mkdir(parents=True, exist_ok=True)
    logger.info("Upload root: %s (profiles: %s)", UPLOAD_ROOT, PROFILE_UPLOAD_DIR)


def public_upload_url(relative_path: str) -> str:
    """Build a safe relative public URL under /uploads/."""
    rel = (relative_path or "").strip().replace("\\", "/").lstrip("/")
    if rel.startswith("uploads/"):
        rel = rel[len("uploads/"):]
    rel = rel.split("?", 1)[0]
    if ".." in rel or rel.startswith("/"):
        raise ValueError("Chemin upload invalide")
    return f"/uploads/{rel}"


def normalize_public_media_url(url: str | None) -> str | None:
    """Normalize stored media URLs to a safe public relative form when possible.

    Keeps external HTTPS URLs (Discord CDN, etc.) unchanged.
    Converts localhost, filesystem paths and legacy forms to /uploads/...
    """
    if url is None:
        return None
    if not isinstance(url, str):
        return url
    raw = url.strip()
    if not raw:
        return raw

    normalized = raw.replace("\\", "/")
    lower = normalized.lower()

    # Extract /uploads/... from absolute URLs, VPS paths, or backend-relative paths.
    marker_idx = lower.find(UPLOADS_PATH_MARKER)
    if marker_idx >= 0:
        path = normalized[marker_idx:].split("?", 1)[0]
        return path

    if lower.startswith("uploads/"):
        return f"/{normalized.split('?', 1)[0]}"

    if lower.startswith("http://") or lower.startswith("https://"):
        if _LOCAL_HOST_RE.match(normalized):
            try:
                path = urlparse(normalized).path or ""
                if path.startswith(UPLOADS_PATH_MARKER):
                    return path.split("?", 1)[0]
            except Exception:
                pass
            return raw
        return raw

    if normalized.startswith("/assets/"):
        return normalized.split("?", 1)[0]

    return normalized.split("?", 1)[0]


def resolve_profile_image_type(content_type: str, filename: str | None) -> str | None:
    ct = (content_type or "").lower().split(";")[0].strip()
    if ct in PROFILE_IMAGE_TYPES:
        return ct
    ext = (filename or "").lower().rsplit(".", 1)[-1] if filename and "." in filename else ""
    return _EXT_TO_PROFILE_MIME.get(ext)


def verify_profile_image_bytes(data: bytes, content_type: str) -> None:
    """Reject mismatched or non-image payloads (basic magic-byte check)."""
    if content_type == "image/jpeg" and not data.startswith(b"\xff\xd8"):
        raise ValueError("Fichier JPEG invalide")
    if content_type == "image/png" and not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("Fichier PNG invalide")
    if content_type == "image/webp":
        if len(data) < 12 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
            raise ValueError("Fichier WebP invalide")


def is_managed_profile_url(url: str | None) -> bool:
    if not url or not isinstance(url, str):
        return False
    normalized = normalize_public_media_url(url) or ""
    return (
        normalized.startswith(PROFILE_PUBLIC_PREFIX + "/")
        or normalized.startswith(LEGACY_AVATAR_PREFIX + "/")
    )


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
    normalized = normalize_public_media_url(url) or ""
    filename = normalized.rsplit("/", 1)[-1]
    if normalized.startswith(PROFILE_PUBLIC_PREFIX + "/"):
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
    verify_profile_image_bytes(data, content_type)
    safe_uid = "".join(c for c in user_id if c.isalnum() or c in "-_")[:48] or "user"
    filename = f"{safe_uid}_{uuid.uuid4().hex[:12]}{ext}"
    dest = PROFILE_UPLOAD_DIR / filename
    dest.write_bytes(data)
    public_url = f"{PROFILE_PUBLIC_PREFIX}/{filename}"
    logger.info("Saved profile image for %s → %s (%s bytes)", user_id, public_url, len(data))
    return public_url


def profile_upload_response(public_url: str) -> dict:
    url = normalize_public_media_url(public_url) or public_url
    return {
        "url": url,
        "avatar_url": url,
        "avatarUrl": url,
    }
