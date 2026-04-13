/** Normalize list endpoints that return { data: { policies } } or variants */
export function parsePoliciesListPayload(response) {
  if (!response) return [];
  const inner = response.data !== undefined ? response.data : response;
  if (Array.isArray(inner)) return inner;
  if (Array.isArray(inner?.policies)) return inner.policies;
  return [];
}

/** Treat missing isActive as active when list was fetched with isActive=1 */
export function isPolicyConsideredActive(p) {
  const v = p?.isActive;
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (v === undefined || v === null) return true;
  const s = String(v).toLowerCase();
  if (s === "0" || s === "false" || s === "no") return false;
  return s === "1" || s === "true" || s === "yes";
}
