import api, { formatApiError } from "@/lib/api";

export const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/jpg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/pjpeg",
  "image/x-png",
]);

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

/** Aligné sur le backend (_resolve_upload_image_type). */
export function isAllowedImageFile(file) {
  if (!file) return false;
  const type = (file.type || "").toLowerCase().split(";")[0].trim();
  if (type === "image/heic" || type === "image/heif") return false;
  if (ALLOWED_MIME.has(type)) return true;
  const ext = (file.name || "").toLowerCase().split(".").pop();
  return ALLOWED_EXT.has(ext);
}

export function imageUploadErrorMessage(err, fallback = "Échec de l'import") {
  return formatApiError(err) || fallback;
}

export async function uploadProfileAvatar(file, { targetUserId, isStaffEdit } = {}) {
  const fd = new FormData();
  fd.append("file", file);
  const endpoint = isStaffEdit && targetUserId
    ? `/admin/users/${targetUserId}/avatar/upload`
    : "/profile/avatar/upload";
  const { data } = await api.post(endpoint, fd);
  return data.avatar_url || data.url;
}
