/** Mirrors agent/customer add-on catalog linking (see addons_controller.dart). */

export function normalizeAddOnServicesList(payload) {
  const raw =
    payload?.data?.addOnServices ?? payload?.data ?? payload ?? [];
  return Array.isArray(raw) ? raw : [];
}

export function isLinkableAddOnService(svc) {
  const category = svc?.category;
  const ids = svc?.subCategoryIds ?? [];
  return Boolean(category && Array.isArray(ids) && ids.length > 0);
}

/** serviceId → Set of subCategory ids under that service (from serviceCategoriesData). */
export function buildSubCategoriesByServiceId(serviceCategoriesData) {
  const map = new Map();
  if (!Array.isArray(serviceCategoriesData)) return map;

  for (const row of serviceCategoriesData) {
    const serviceId = Number(row?.serviceId);
    if (!serviceId || Number.isNaN(serviceId)) continue;
    if (!map.has(serviceId)) map.set(serviceId, new Set());
    const subs = row?.category?.subCategories ?? [];
    for (const sub of subs) {
      const id = Number(sub?.id);
      if (!Number.isNaN(id)) map.get(serviceId).add(id);
    }
  }
  return map;
}

export function getAddOnsForSubCategory(
  subCategoryId,
  addOnsList,
  subCategoriesByServiceId
) {
  const subId = Number(subCategoryId);
  let serviceId = null;
  for (const [sid, set] of subCategoriesByServiceId.entries()) {
    if (set.has(subId)) {
      serviceId = sid;
      break;
    }
  }
  const serviceSubIds =
    serviceId != null ? subCategoriesByServiceId.get(serviceId) : null;

  return (addOnsList || []).filter((svc) => {
    if (!isLinkableAddOnService(svc)) return false;
    const linked = (svc.subCategoryIds || []).map((x) => Number(x));
    if (linked.includes(subId)) return true;
    if (serviceSubIds?.has(subId)) {
      return linked.some((id) => serviceSubIds.has(id));
    }
    return false;
  });
}

/** Group add-ons by add-on category name for display. */
export function groupAddOnsByCategory(addOns) {
  const groups = new Map();
  for (const svc of addOns) {
    const key =
      svc?.category?.name ||
      (svc?.addOnCategoryId ? `Category #${svc.addOnCategoryId}` : "Other");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(svc);
  }
  return groups;
}

/** Unique add-ons across all sub-categories in a category row (by service id). */
export function getAddOnsForCategoryRow(row, addOnsList, subCategoriesByServiceId) {
  const subs = row?.subCategories ?? [];
  const seen = new Set();
  const merged = [];
  for (const sub of subs) {
    const list = getAddOnsForSubCategory(
      sub.id,
      addOnsList,
      subCategoriesByServiceId
    );
    for (const svc of list) {
      if (seen.has(svc.id)) continue;
      seen.add(svc.id);
      merged.push(svc);
    }
  }
  return merged;
}
