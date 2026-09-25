/** Shared helpers for role → screen access (employee directory + forms). */

export const CRUD_ACTIONS = ["read", "create", "update", "delete"];

export const CRUD_LABEL = {
  read: "View",
  create: "Create",
  update: "Edit",
  delete: "Delete",
};

export const CRUD_INITIAL = {
  read: "V",
  create: "C",
  update: "E",
  delete: "D",
};

export function emptyCrud() {
  return CRUD_ACTIONS.reduce((acc, action) => ({ ...acc, [action]: false }), {});
}

export function pickCrud(obj) {
  return {
    create: Boolean(obj?.create),
    read: Boolean(obj?.read),
    update: Boolean(obj?.update),
    delete: Boolean(obj?.delete),
  };
}

export function hasAnyCrud(crud) {
  return CRUD_ACTIONS.some((action) => crud?.[action]);
}

/** Resolve CRUD for one feature from a role (permissions list or nested feature rows). */
export function crudForRoleFeature(role, feature) {
  const perms = Array.isArray(role?.permissions) ? role.permissions : [];
  const byId = perms.find(
    (p) => Number(p?.featureId ?? p?.id) === Number(feature?.id)
  );
  const fromFeature = Array.isArray(feature?.permissions)
    ? feature.permissions.find((p) => Number(p?.roleId) === Number(role?.id))
    : null;
  const source = byId || fromFeature;
  return source ? pickCrud(source) : emptyCrud();
}

/** Map featureId → { create, read, update, delete } for matrix UI. */
export function selectionsFromRole(role, features = []) {
  const map = {};
  (Array.isArray(features) ? features : []).forEach((feature) => {
    map[String(feature.id)] = crudForRoleFeature(role, feature);
  });
  return map;
}

export function summarizeRoleAccess(role) {
  const perms = Array.isArray(role?.permissions) ? role.permissions : [];
  const granted = perms.filter((p) => hasAnyCrud(p));
  const screens = granted.length;
  const full = granted.filter((p) =>
    CRUD_ACTIONS.every((action) => p?.[action])
  ).length;
  return { screens, full, total: perms.length };
}

export function prettyFeatureTitle(value = "") {
  return String(value)
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
