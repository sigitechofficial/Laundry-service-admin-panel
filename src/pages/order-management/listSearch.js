/** Client-side search used by Action Required and Payment Failures (API is unfiltered). */
export function matchesOrderListSearch(row, term) {
  if (!term) return true;
  const q = String(term).trim().toLowerCase();
  if (!q) return true;
  return Object.entries(row).some(([key, value]) => {
    if (
      key.startsWith("_") ||
      key === "actions" ||
      key === "raw" ||
      key === "reasonKeys"
    ) {
      return false;
    }
    if (Array.isArray(value)) {
      return value.some((item) => String(item ?? "").toLowerCase().includes(q));
    }
    if (value && typeof value === "object") return false;
    return String(value ?? "").toLowerCase().includes(q);
  });
}
