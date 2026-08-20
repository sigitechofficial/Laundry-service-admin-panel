import dayjs from "dayjs";

/** Allowlisted sortBy keys only — never send raw SQL columns. */
export const ORDER_LIST_SORT_BY = Object.freeze({
  id: "id",
  createdAt: "createdAt",
  totalItems: "totalItems",
  collectionDate: "collectionDate",
  deliveryDate: "deliveryDate",
  bookingStatusId: "bookingStatusId",
  updatedAt: "updatedAt",
  orderAmount: "orderAmount",
});

export const PAYMENT_FAILURE_SORT_BY = Object.freeze({
  ...ORDER_LIST_SORT_BY,
  lastPaymentFailureAt: "lastPaymentFailureAt",
});

/** Newest first: createdAt DESC + id DESC (server always appends id DESC). */
export const DEFAULT_ORDER_LIST_SORT_BY = "createdAt";
export const DEFAULT_PAYMENT_FAILURE_SORT_BY = "lastPaymentFailureAt";
export const DEFAULT_ORDER_LIST_SORT_DIR = "desc";

/** Same left-to-right sense as All Orders columns (shop name is not SQL-safe). */
export const ORDER_LIST_SORT_OPTIONS = [
  { value: "id", label: "Order ID" },
  { value: "createdAt", label: "Order placed" },
  { value: "totalItems", label: "Items" },
  { value: "collectionDate", label: "Pickup" },
  { value: "deliveryDate", label: "Delivery" },
  { value: "bookingStatusId", label: "Status" },
  { value: "updatedAt", label: "Last updated" },
  { value: "orderAmount", label: "Amount" },
];

export const PAYMENT_FAILURE_SORT_OPTIONS = [
  { value: "lastPaymentFailureAt", label: "Failed at" },
  ...ORDER_LIST_SORT_OPTIONS,
];

export function normalizeOrderListSortDir(dir) {
  return String(dir || "").trim().toLowerCase() === "asc" ? "asc" : "desc";
}

export function normalizeOrderListSortBy(
  sortBy,
  allowlist = ORDER_LIST_SORT_BY,
  fallback = DEFAULT_ORDER_LIST_SORT_BY
) {
  const key = String(sortBy || "").trim();
  return allowlist[key] ? key : fallback;
}

/** Query object for RTK order list endpoints (page, limit, zoneId, status, startDate, endDate, sort). */
export function buildOrderListApiParams({
  page,
  limit,
  zoneId,
  statusId,
  dateRange,
  search,
  includeCounts = true,
  sortBy,
  sortDir,
  sortAllowlist = ORDER_LIST_SORT_BY,
  defaultSortBy = DEFAULT_ORDER_LIST_SORT_BY,
}) {
  const params = { page, limit };
  params.sortBy = normalizeOrderListSortBy(sortBy, sortAllowlist, defaultSortBy);
  params.sortDir = normalizeOrderListSortDir(sortDir);
  if (zoneId != null && String(zoneId).trim() !== "") {
    params.zoneId = String(zoneId);
  }
  if (statusId != null && String(statusId).trim() !== "") {
    params.status = String(statusId);
  }
  if (dateRange?.startDate && dateRange?.endDate) {
    params.startDate = dayjs(dateRange.startDate).format("YYYY-MM-DD");
    params.endDate = dayjs(dateRange.endDate).format("YYYY-MM-DD");
  }
  if (search != null && String(search).trim() !== "") {
    params.search = String(search).trim();
  }
  if (includeCounts) {
    params.includeCounts = 1;
  }
  return params;
}

/** Filter-only params for ordersCount (zone, status, dates, search — no pagination). */
export function buildOrderStatsQueryParams({
  zoneId,
  statusId,
  dateRange,
  search,
}) {
  const full = buildOrderListApiParams({
    page: 1,
    limit: 1,
    zoneId,
    statusId,
    dateRange,
    search,
    includeCounts: false,
  });
  const {
    page: _page,
    limit: _limit,
    sortBy: _sortBy,
    sortDir: _sortDir,
    ...rest
  } = full;
  return rest;
}

export function orderListHasActiveFilters({
  zoneId,
  statusId,
  dateRange,
  search,
}) {
  return Boolean(
    (zoneId != null && String(zoneId).trim() !== "") ||
      (statusId != null && String(statusId).trim() !== "") ||
      (dateRange?.startDate && dateRange?.endDate) ||
      (search != null && String(search).trim() !== "")
  );
}
