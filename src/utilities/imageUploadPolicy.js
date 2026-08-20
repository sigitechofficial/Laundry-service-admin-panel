/** Shared admin image upload rules — banners, blogs, services, categories. */

export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/gif,image/webp";
export const IMAGE_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const IMAGE_UPLOAD_MESSAGES = {
  required: "Please select an image.",
  type: "Use a JPEG, PNG, GIF, or WebP image.",
  size: "Image must be 5MB or smaller.",
};

export function isAllowedImageType(file) {
  if (!file) return false;
  const type = String(file.type || "").toLowerCase();
  return IMAGE_UPLOAD_MIME_TYPES.includes(type);
}

/**
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateImageFile(
  file,
  { required = false, allowExistingUrl = false } = {}
) {
  if (file == null || file === "") {
    return required
      ? { ok: false, message: IMAGE_UPLOAD_MESSAGES.required }
      : { ok: true };
  }
  if (typeof file === "string") {
    return allowExistingUrl
      ? { ok: true }
      : { ok: false, message: IMAGE_UPLOAD_MESSAGES.required };
  }
  if (typeof file.size !== "number" || typeof file.type !== "string") {
    return { ok: false, message: IMAGE_UPLOAD_MESSAGES.required };
  }
  if (!isAllowedImageType(file)) {
    return { ok: false, message: IMAGE_UPLOAD_MESSAGES.type };
  }
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    return { ok: false, message: IMAGE_UPLOAD_MESSAGES.size };
  }
  return { ok: true };
}

/**
 * Accept a newly chosen File or reject with a message. Empty selection → null.
 */
export function acceptImageFile(file, onReject) {
  if (!file) return null;
  const result = validateImageFile(file);
  if (!result.ok) {
    onReject?.(result.message);
    return null;
  }
  return file;
}
