/**
 * Match backend `isUserBlocked` (BOOLEAN / TINYINT 0/1 / '0').
 * Prefer an explicit `blocked` flag when the API sends one.
 */
export function isAccountBlocked(value) {
  if (value && typeof value === "object") {
    if (value.blocked === true) return true;
    if (value.blocked === false) return false;
    return isAccountBlocked(value.status);
  }
  return value === false || value === 0 || value === "0";
}
