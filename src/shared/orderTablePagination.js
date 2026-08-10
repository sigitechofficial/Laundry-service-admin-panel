/**
 * Footer total for order list tables — always from the list API, not client row count.
 */
export function getBackendTableTotal(apiResponse, listCountField) {
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

  return 0;
}

function toCount(value) {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}
