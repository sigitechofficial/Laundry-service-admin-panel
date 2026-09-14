import { sidebarList, labelToFeatureKey } from "../components/shared/constants";
import { getEmployeePermissions } from "./authStorage";

/**
 * Sidebar parent whose path best matches pathname (longest prefix wins).
 */
function findSidebarParentForPathname(pathname) {
  let best = null;
  let bestLen = -1;
  for (const item of sidebarList) {
    if (!item.path) continue;
    const p = item.path;
    let match = false;
    if (pathname === p) match = true;
    else if (p !== "/" && pathname.startsWith(`${p}/`)) match = true;
    if (match && p.length > bestLen) {
      bestLen = p.length;
      best = item;
    }
  }
  return best;
}

/**
 * Build feature.key -> featureId from zone-admin permissions payload.
 */
function buildFeatureKeyToIdMap(permissions) {
  const map = new Map();
  const list = Array.isArray(permissions) ? permissions : [];
  for (const p of list) {
    const key = p?.feature?.key || p?.key;
    const id = p?.featureId ?? p?.feature?.id;
    if (key && id != null && String(id).trim() !== "") {
      map.set(String(key), String(id).trim());
    }
  }
  return map;
}

/**
 * Allowed feature keys for read access (zone employee sidebar filter).
 */
export function getAllowedFeatureKeysFromPermissions(permissions) {
  const keys = new Set();
  const list = Array.isArray(permissions) ? permissions : [];
  for (const p of list) {
    const key = p?.feature?.key || p?.key;
    if (key && p?.read === true) keys.add(String(key));
  }
  return keys;
}

export function canEmployeeReadPathname(pathname) {
  const perms = getEmployeePermissions();
  const allowed = getAllowedFeatureKeysFromPermissions(perms);
  const parent = findSidebarParentForPathname(pathname);
  if (!parent) return true;
  const key = labelToFeatureKey(parent.label);
  if (!key) return true;
  return allowed.has(key);
}

export function firstAllowedEmployeePath() {
  const perms = getEmployeePermissions();
  const allowed = getAllowedFeatureKeysFromPermissions(perms);
  for (const item of sidebarList) {
    if (!item.path) continue;
    const key = labelToFeatureKey(item.label);
    if (key && allowed.has(key)) return item.path;
  }
  return null;
}

/**
 * Resolve single featureId header value for current route (matches API feature.key to sidebar section).
 */
export function resolveEmployeeFeatureIdForPathname(pathname) {
  const perms = getEmployeePermissions();
  if (!perms.length) return null;
  const keyToId = buildFeatureKeyToIdMap(perms);
  const parent = findSidebarParentForPathname(pathname);
  if (!parent) return null;
  const key = labelToFeatureKey(parent.label);
  if (!key) return null;
  const id = keyToId.get(key);
  return id ?? null;
}
