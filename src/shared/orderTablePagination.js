/**
 * Footer total for order/shop list tables — always from the list API, not client row count.
 * @param {object} apiResponse - RTK query response (`{ data: { ... } }`)
 * @param {string} [listCountField] - e.g. `"total"`
 * @param {string} [listArrayField] - e.g. `"AllShopsData"`; used only when API omits total/pagination (legacy)
 */
export function getBackendTableTotal(apiResponse, listCountField, listArrayField) {
  const body = apiResponse?.data;
  if (!body || typeof body !== "object") return 0;

  const pagination = body.pagination;
  if (pagination != null && typeof pagination === "object") {
    if (pagination.totalRecords != null) {
      return toCount(pagination.totalRecords);
    }
    if (pagination.total != null) {
      return toCount(pagination.total);
    }
  }

  if (listCountField && body[listCountField] != null) {
    return toCount(body[listCountField]);
  }

  if (body.totalRecords != null) {
    return toCount(body.totalRecords);
  }

  // Legacy APIs that return the full list without pagination meta
  if (
    listArrayField &&
    Array.isArray(body[listArrayField]) &&
    body.pagination == null &&
    body.total == null &&
    body.totalRecords == null
  ) {
    return body[listArrayField].length;
  }

  return 0;
}

function toCount(value) {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}
