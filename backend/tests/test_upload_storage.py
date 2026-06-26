"""Unit tests for upload URL normalization and profile image validation."""
import pytest

from upload_storage import (
    normalize_public_media_url,
    public_upload_url,
    save_profile_image,
    verify_profile_image_bytes,
    PROFILE_IMAGE_MAX_BYTES,
)


class TestNormalizePublicMediaUrl:
    def test_relative_profile_path_unchanged(self):
        url = "/uploads/profiles/user_abc123def456.jpg"
        assert normalize_public_media_url(url) == url

    def test_missing_leading_slash(self):
        assert normalize_public_media_url("uploads/profiles/foo.webp") == "/uploads/profiles/foo.webp"

    def test_vps_absolute_path(self):
        raw = "/var/www/nexoria/uploads/profiles/user_abc.webp"
        assert normalize_public_media_url(raw) == "/uploads/profiles/user_abc.webp"

    def test_backend_relative_path(self):
        raw = "backend/uploads/profiles/user_abc.png"
        assert normalize_public_media_url(raw) == "/uploads/profiles/user_abc.png"

    def test_localhost_absolute(self):
        raw = "http://localhost:8000/uploads/profiles/user_abc.jpg"
        assert normalize_public_media_url(raw) == "/uploads/profiles/user_abc.jpg"

    def test_legacy_avatars(self):
        raw = "/uploads/avatars/user_old.png"
        assert normalize_public_media_url(raw) == raw

    def test_discord_cdn_unchanged(self):
        raw = "https://cdn.discordapp.com/avatars/123/abc.png"
        assert normalize_public_media_url(raw) == raw

    def test_assets_unchanged(self):
        raw = "/assets/classes/explorateur.png"
        assert normalize_public_media_url(raw) == raw

    def test_none(self):
        assert normalize_public_media_url(None) is None


class TestPublicUploadUrl:
    def test_content(self):
        assert public_upload_url("content/abc.png") == "/uploads/content/abc.png"


class TestSaveProfileImage:
    def test_rejects_oversized(self, tmp_path, monkeypatch):
        monkeypatch.setattr("upload_storage.PROFILE_UPLOAD_DIR", tmp_path)
        data = b"\xff\xd8" + b"x" * (PROFILE_IMAGE_MAX_BYTES + 1)
        with pytest.raises(ValueError, match="trop lourde"):
            save_profile_image(data, "image/jpeg", "user_test")

    def test_saves_jpeg(self, tmp_path, monkeypatch):
        monkeypatch.setattr("upload_storage.PROFILE_UPLOAD_DIR", tmp_path)
        data = b"\xff\xd8\xff\xe0" + b"\x00" * 64
        url = save_profile_image(data, "image/jpeg", "user_test")
        assert url.startswith("/uploads/profiles/user_test_")
        assert url.endswith(".jpg")
        assert (tmp_path / url.rsplit("/", 1)[-1]).is_file()


class TestVerifyProfileImageBytes:
    def test_invalid_png(self):
        with pytest.raises(ValueError, match="PNG"):
            verify_profile_image_bytes(b"not-a-png", "image/png")
