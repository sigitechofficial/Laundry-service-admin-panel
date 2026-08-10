import dayjs from "dayjs";

/** Query object for RTK order list endpoints (page, limit, zoneId, status, startDate, endDate). */
export function buildOrderListApiParams({
  page,
  limit,
  zoneId,
  statusId,
  dateRange,
  search,
}) {
  const params = { page, limit };
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
  });
  const { page, limit, ...rest } = full;
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
