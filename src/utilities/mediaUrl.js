import { BASE_URL } from "./URL";

function isAbsoluteMediaUrl(value) {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("//") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  );
}

/**
 * Join a stage/API relative image path to the API host.
 * Passes through absolute http(s), protocol-relative, blob, and data URLs.
 * File objects are left to the caller (object URLs) — returns "".
 *
 * @param {string|null|undefined} path
 * @param {string} [base] defaults to BASE_URL
 */
export function joinMediaUrl(path, base = BASE_URL) {
  if (path == null || path === "") return "";
  if (typeof path !== "string") return "";

  const value = path.trim();
  if (!value) return "";
  if (isAbsoluteMediaUrl(value)) return value;

  const root = String(base || "").replace(/\/+$/, "");
  const rel = value.replace(/^\/+/, "");
  if (!root) return rel ? `/${rel}` : "";
  return rel ? `${root}/${rel}` : root;
}
