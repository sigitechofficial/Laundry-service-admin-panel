/** Bearer token for API (admin + zone admin). Single source of truth for a valid session. */
export const LS_ACCESS_TOKEN = "accessToken";

/** Optional companion token if the sign-in response already includes it. Not a session flag. */
export const LS_REFRESH_TOKEN = "refreshToken";

/**
 * Comma-separated feature ids from zone-admin login `permissions[]`
 * (fallback for `featureid` request header when no active route feature is set).
 */
export const LS_EMPLOYEE_FEATURE_IDS = "employeeFeatureIds";

/** JSON array of zone-admin `permissions[]` (feature keys + CRUD + featureId). */
const LS_EMPLOYEE_PERMISSIONS = "employeePermissions";

/** Single feature id for current sidebar section / route (request header). */
const LS_ACTIVE_FEATURE_ID = "activeEmployeeFeatureId";

/** JSON: { firstName, lastName, email, zoneName?, roleLabel } for header / UI. */
const LS_USER_PROFILE = "userProfile";

/** Retired dual-flag keys. Cleared on every logout so stale values cannot reopen a session. */
const LS_LEGACY_LOGIN_STATUS = "login_status";
const LS_LEGACY_USER_EMAIL = "userEmail";

const AUTH_STORAGE_KEYS = [
  LS_ACCESS_TOKEN,
  LS_REFRESH_TOKEN,
  LS_EMPLOYEE_FEATURE_IDS,
  LS_EMPLOYEE_PERMISSIONS,
  LS_ACTIVE_FEATURE_ID,
  LS_USER_PROFILE,
  LS_LEGACY_LOGIN_STATUS,
  LS_LEGACY_USER_EMAIL,
];

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

/** Non-empty persisted token; expired JWTs are treated as invalid. */
export function isAccessTokenValid(token) {
  if (typeof token !== "string") return false;
  const t = token.trim();
  if (!t || t === "undefined" || t === "null") return false;

  const payload = decodeJwtPayload(t);
  if (payload?.exp != null) {
    const expMs = Number(payload.exp) * 1000;
    if (Number.isFinite(expMs) && expMs <= Date.now()) return false;
  }

  return true;
}

export function getAccessToken() {
  return readStorage(LS_ACCESS_TOKEN);
}

export function getRefreshToken() {
  return readStorage(LS_REFRESH_TOKEN);
}

/** Valid session = persisted accessToken (refresh is stored only when the API already issued one). */
export function hasValidSession() {
  return isAccessTokenValid(getAccessToken());
}

function persistRefreshToken(data) {
  const rt = data?.refreshToken;
  if (typeof rt === "string" && rt.trim() && rt.trim() !== "undefined" && rt.trim() !== "null") {
    localStorage.setItem(LS_REFRESH_TOKEN, rt.trim());
  } else {
    localStorage.removeItem(LS_REFRESH_TOKEN);
  }
}

export function clearAuthTokens() {
  AUTH_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
  try {
    document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  } catch {
    /* ignore cookie write failures (SSR / restricted document) */
  }
}

export function getUserProfile() {
  try {
    const raw = readStorage(LS_USER_PROFILE);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p && typeof p === "object" ? p : null;
  } catch {
    return null;
  }
}

/**
 * Store display fields after login. `isZoneAdmin` drives subtitle (Zone Admin vs Admin).
 */
function persistUserProfile(data, options = {}) {
  const { isZoneAdmin = false } = options;
  const firstName = data?.firstName != null ? String(data.firstName).trim() : "";
  const lastName = data?.lastName != null ? String(data.lastName).trim() : "";
  const email = data?.email != null ? String(data.email).trim() : "";
  const zoneName = data?.zoneName != null ? String(data.zoneName).trim() : "";
  const roleLabel = isZoneAdmin
    ? zoneName
      ? `Zone Admin · ${zoneName}`
      : "Zone Admin"
    : "Admin";
  localStorage.setItem(
    LS_USER_PROFILE,
    JSON.stringify({ firstName, lastName, email, zoneName, roleLabel })
  );
}

/** Zone employee session: permissions JSON is present. */
export function isEmployeePermissionSession() {
  try {
    const profile = getUserProfile();
    const isZoneAdmin =
      typeof profile?.roleLabel === "string" &&
      profile.roleLabel.toLowerCase().includes("zone admin");
    if (!isZoneAdmin) return false;

    const raw = readStorage(LS_EMPLOYEE_PERMISSIONS);
    return Boolean(raw && raw !== "[]");
  } catch {
    return false;
  }
}

export function getEmployeePermissions() {
  try {
    const raw = readStorage(LS_EMPLOYEE_PERMISSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setActiveEmployeeFeatureId(id) {
  if (id != null && String(id).trim() !== "") {
    localStorage.setItem(LS_ACTIVE_FEATURE_ID, String(id).trim());
  } else {
    localStorage.removeItem(LS_ACTIVE_FEATURE_ID);
  }
}

export function getActiveEmployeeFeatureId() {
  try {
    const v = readStorage(LS_ACTIVE_FEATURE_ID);
    return v && v.trim() !== "" ? v.trim() : null;
  } catch {
    return null;
  }
}

/** After full admin sign-in: store token if present; strip zone-admin feature header state. */
export function persistAdminLoginSession(data) {
  if (!isAccessTokenValid(data?.accessToken)) {
    clearAuthTokens();
    return false;
  }
  localStorage.setItem(LS_ACCESS_TOKEN, String(data.accessToken).trim());
  persistRefreshToken(data);
  localStorage.removeItem(LS_EMPLOYEE_FEATURE_IDS);
  localStorage.removeItem(LS_EMPLOYEE_PERMISSIONS);
  localStorage.removeItem(LS_ACTIVE_FEATURE_ID);
  persistUserProfile(data, { isZoneAdmin: false });
  return true;
}

/**
 * Zone admin sign-in: store token + feature ids from permissions for headers.
 */
export function persistZoneAdminLoginSession(data) {
  if (!isAccessTokenValid(data?.accessToken)) {
    clearAuthTokens();
    return false;
  }
  localStorage.setItem(LS_ACCESS_TOKEN, String(data.accessToken).trim());
  persistRefreshToken(data);
  const perms = Array.isArray(data?.permissions) ? data.permissions : [];
  const ids = [
    ...new Set(
      perms
        .map((p) => p?.featureId ?? p?.feature?.id)
        .filter((id) => id != null && String(id).trim() !== "")
        .map((id) => String(id).trim())
    ),
  ];
  if (ids.length) {
    localStorage.setItem(LS_EMPLOYEE_FEATURE_IDS, ids.join(","));
  } else {
    localStorage.removeItem(LS_EMPLOYEE_FEATURE_IDS);
  }

  if (perms.length) {
    localStorage.setItem(LS_EMPLOYEE_PERMISSIONS, JSON.stringify(perms));
  } else {
    localStorage.removeItem(LS_EMPLOYEE_PERMISSIONS);
  }

  persistUserProfile(data, { isZoneAdmin: true });
  return true;
}
