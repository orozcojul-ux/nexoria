import api, { formatApiError } from "@/lib/api";

export const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/jpg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp";

/** Limite côté serveur ; les photos brutes peuvent être plus lourdes (compression auto avant envoi). */
export const IMAGE_UPLOAD_MAX_RAW_BYTES = 15 * 1024 * 1024;

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

const AVATAR_MAX_DIM = 512;
/** Sous la limite courante des reverse proxies (~1 Mo). */
const AVATAR_MAX_BYTES = 900 * 1024;

/** Aligné sur le backend (_resolve_upload_image_type). */
export function isAllowedImageFile(file) {
  if (!file) return false;
  const type = (file.type || "").toLowerCase().split(";")[0].trim();
  if (type === "image/heic" || type === "image/heif") return false;
  if (ALLOWED_MIME.has(type)) return true;
  const ext = (file.name || "").toLowerCase().split(".").pop();
  return ALLOWED_EXT.has(ext);
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de lire l'image"));
    };
    img.src = url;
  });
}

async function readImageSource(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fallback Image() */
    }
  }
  return loadImageElement(file);
}

function encodeCanvas(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encodage impossible"))),
      mime,
      quality,
    );
  });
}

async function compressCanvas(canvas) {
  const codecs = ["image/webp", "image/jpeg"];
  for (const mime of codecs) {
    let quality = 0.85;
    let lastBlob = null;
    while (quality >= 0.45) {
      const blob = await encodeCanvas(canvas, mime, quality);
      lastBlob = blob;
      if (blob.size <= AVATAR_MAX_BYTES) return blob;
      quality -= 0.08;
    }
    if (lastBlob && mime === "image/jpeg") return lastBlob;
  }
  throw new Error("Image trop lourde après compression");
}

/**
 * Redimensionne et compresse une photo avant upload (évite les 413 du proxy).
 */
export async function prepareAvatarForUpload(file) {
  if (!isAllowedImageFile(file)) {
    throw new Error("Format non supporté (JPG, PNG, GIF, WebP)");
  }
  if (file.size > IMAGE_UPLOAD_MAX_RAW_BYTES) {
    throw new Error("Image trop lourde (max 15 Mo)");
  }

  const source = await readImageSource(file);
  const srcW = source.width ?? source.naturalWidth;
  const srcH = source.height ?? source.naturalHeight;
  const scale = Math.min(1, AVATAR_MAX_DIM / Math.max(srcW, srcH, 1));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de préparer l'image");
  ctx.drawImage(source, 0, 0, w, h);
  source.close?.();

  const blob = await compressCanvas(canvas);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const baseName = ((file.name || "avatar").replace(/\.[^.]+$/, "") || "avatar").slice(0, 80);
  return new File([blob], `${baseName}.${ext}`, { type: blob.type });
}

export function imageUploadErrorMessage(err, fallback = "Échec de l'import") {
  if (err?.response?.status === 413) {
    return "Image trop volumineuse pour l'envoi. Choisissez une photo plus légère ou réessayez.";
  }
  if (typeof err?.message === "string" && !err?.response) return err.message;
  return formatApiError(err) || fallback;
}

export async function uploadProfileAvatar(file, { targetUserId, isStaffEdit } = {}) {
  const prepared = await prepareAvatarForUpload(file);
  const fd = new FormData();
  fd.append("file", prepared);
  const endpoint = isStaffEdit && targetUserId
    ? `/admin/users/${targetUserId}/avatar/upload`
    : "/profile/avatar/upload";
  const { data } = await api.post(endpoint, fd);
  return data.avatar_url || data.url;
}
