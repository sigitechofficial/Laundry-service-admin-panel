/** Add-on linking uses add-on.subCategoryIds (item ids). No service-wide bleed. */

export function normalizeAddOnServicesList(payload) {
  const raw =
    payload?.data?.addOnServices ?? payload?.data ?? payload ?? [];
  return Array.isArray(raw) ? raw : [];
}

function linkedSubCategoryIds(svc) {
  return (svc?.subCategoryIds || [])
    .map((id) => Number(id))
    .filter((id) => !Number.isNaN(id));
}

export function isLinkableAddOnService(svc) {
  return linkedSubCategoryIds(svc).length > 0;
}

/** Add-ons whose subCategoryIds include this exact item id. */
export function getAddOnsForSubCategory(subCategoryId, addOnsList) {
  const subId = Number(subCategoryId);
  if (!subId || Number.isNaN(subId)) return [];

  return (addOnsList || []).filter((svc) => {
    if (!isLinkableAddOnService(svc)) return false;
    return linkedSubCategoryIds(svc).includes(subId);
  });
}

export function addOnCategoryLabel(svc) {
  return (
    svc?.category?.name ||
    (svc?.addOnCategoryId != null ? `Category #${svc.addOnCategoryId}` : "Unassigned")
  );
}

/** Group add-ons by their own add-on category name. */
export function groupAddOnsByCategory(addOns) {
  const groups = new Map();
  for (const svc of addOns) {
    const key = addOnCategoryLabel(svc);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(svc);
  }
  return groups;
}

function linkedAddOnCategoryIds(subCategories) {
  const ids = new Set();
  (subCategories || []).forEach((sub) => {
    (sub?.addOnCategories || []).forEach((cat) => {
      const id = Number(cat?.id ?? cat);
      if (id && !Number.isNaN(id)) ids.add(id);
    });
  });
  return ids;
}

/** Unique add-ons linked to any item in this category. */
export function getAddOnsForCategoryItems(subCategories, addOnsList) {
  const itemIds = new Set(
    (subCategories || [])
      .map((sub) => Number(sub?.id))
      .filter((id) => id && !Number.isNaN(id))
  );
  const addOnCategoryIds = linkedAddOnCategoryIds(subCategories);
  if (!itemIds.size && !addOnCategoryIds.size) return [];

  const seen = new Set();
  const merged = [];
  for (const svc of addOnsList || []) {
    if (seen.has(svc.id)) continue;
    const linked = linkedSubCategoryIds(svc);
    const categoryId = Number(svc?.addOnCategoryId ?? svc?.category?.id);
    const byItem = linked.some((id) => itemIds.has(id));
    const byAddOnCategory =
      categoryId && !Number.isNaN(categoryId)
        ? addOnCategoryIds.has(categoryId)
        : false;
    if (!byItem && !byAddOnCategory) continue;
    seen.add(svc.id);
    merged.push(svc);
  }
  return merged;
}

/** Unique add-ons across all items in a category row. */
export function getAddOnsForCategoryRow(row, addOnsList) {
  return getAddOnsForCategoryItems(row?.subCategories, addOnsList);
}

/** Kept for callers that still pass the unused service map. */
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
