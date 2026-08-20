/**
 * Unwrap `GET admin/getAdminEmployess` from RTK Query `data`.
 * Prefer `data.adminEmployees`; accept common envelope shapes after cache/remount.
 */
export function extractAdminEmployees(payload) {
  if (Array.isArray(payload?.data?.adminEmployees)) return payload.data.adminEmployees;
  if (Array.isArray(payload?.adminEmployees)) return payload.adminEmployees;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}
