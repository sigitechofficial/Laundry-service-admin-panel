/** Bearer token for API (admin + zone admin). */
export const LS_ACCESS_TOKEN = "accessToken";

/**
 * Comma-separated feature ids from zone-admin login `permissions[]`
 * (fallback for `featureid` request header when no active route feature is set).
 */
export const LS_EMPLOYEE_FEATURE_IDS = "employeeFeatureIds";

/** JSON array of zone-admin `permissions[]` (feature keys + CRUD + featureId). */
export const LS_EMPLOYEE_PERMISSIONS = "employeePermissions";

/** Single feature id for current sidebar section / route (request header). */
export const LS_ACTIVE_FEATURE_ID = "activeEmployeeFeatureId";

/** JSON: { firstName, lastName, email, zoneName?, roleLabel } for header / UI. */
export const LS_USER_PROFILE = "userProfile";

export function clearAuthTokens() {
  localStorage.removeItem(LS_ACCESS_TOKEN);
  localStorage.removeItem(LS_EMPLOYEE_FEATURE_IDS);
  localStorage.removeItem(LS_EMPLOYEE_PERMISSIONS);
  localStorage.removeItem(LS_ACTIVE_FEATURE_ID);
  localStorage.removeItem(LS_USER_PROFILE);
}

export function getUserProfile() {
  try {
    const raw = localStorage.getItem(LS_USER_PROFILE);
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
export function persistUserProfile(data, options = {}) {
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

    const raw = localStorage.getItem(LS_EMPLOYEE_PERMISSIONS);
    return Boolean(raw && raw !== "[]");
  } catch {
    return false;
  }
}

export function getEmployeePermissions() {
  try {
    const raw = localStorage.getItem(LS_EMPLOYEE_PERMISSIONS);
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
    const v = localStorage.getItem(LS_ACTIVE_FEATURE_ID);
    return v && v.trim() !== "" ? v.trim() : null;
  } catch {
    return null;
  }
}

/** After full admin sign-in: store token if present; strip zone-admin feature header state. */
export function persistAdminLoginSession(data) {
  if (data?.accessToken) {
    localStorage.setItem(LS_ACCESS_TOKEN, data.accessToken);
  }
  localStorage.removeItem(LS_EMPLOYEE_FEATURE_IDS);
  localStorage.removeItem(LS_EMPLOYEE_PERMISSIONS);
  localStorage.removeItem(LS_ACTIVE_FEATURE_ID);
  persistUserProfile(data, { isZoneAdmin: false });
}

/**
 * Zone admin sign-in: store token + feature ids from permissions for headers.
 */
export function persistZoneAdminLoginSession(data) {
  if (data?.accessToken) {
    localStorage.setItem(LS_ACCESS_TOKEN, data.accessToken);
  }
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
}
