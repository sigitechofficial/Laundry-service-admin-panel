import dayjs from "dayjs";

/** Query object for RTK getShopsData (page, limit, zoneId, status, startDate, endDate, search). */
export function buildShopListApiParams({
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

export function shopListHasActiveFilters({
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
