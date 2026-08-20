import { useMemo, useState } from "react";
import dayjs from "dayjs";

export const REPORT_PERIOD_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

export const toDateString = (value) => {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
};

export const buildReportParams = (queryState) => {
  const params = {
    period: queryState.period || "all",
  };

  if (queryState.zoneId) params.zoneId = queryState.zoneId;
  if (queryState.shopId) params.shopId = queryState.shopId;
  if (queryState.search) params.search = queryState.search;
  if (queryState.page) params.page = queryState.page;
  if (queryState.limit) params.limit = queryState.limit;

  if (params.period === "custom") {
    if (queryState.startDate) params.startDate = toDateString(queryState.startDate);
    if (queryState.endDate) params.endDate = toDateString(queryState.endDate);
  }

  return params;
};

export function useReportFilters({ paginated = true, defaultLimit = 20 } = {}) {
  const [period, setPeriod] = useState("all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [shopId, setShopId] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultLimit);

  const resetPage = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setPeriod("all");
    setStartDate("");
    setEndDate("");
    setZoneId("");
    setShopId("");
    setPage(1);
  };

  const params = useMemo(
    () =>
      buildReportParams({
        period,
        search,
        page: paginated ? page : undefined,
        limit: paginated ? limit : undefined,
        startDate,
        endDate,
        zoneId,
        shopId,
      }),
    [period, search, page, limit, startDate, endDate, zoneId, shopId, paginated]
  );

  return {
    period,
    setPeriod: resetPage(setPeriod),
    search,
    setSearch: resetPage(setSearch),
    startDate,
    setStartDate: (value) => {
      setStartDate(value);
      setPeriod("custom");
      setPage(1);
    },
    endDate,
    setEndDate: (value) => {
      setEndDate(value);
      setPeriod("custom");
      setPage(1);
    },
    zoneId,
    setZoneId: resetPage(setZoneId),
    shopId,
    setShopId: resetPage(setShopId),
    page,
    setPage,
    limit,
    setLimit: (next) => {
      setLimit(next);
      setPage(1);
    },
    params,
    clearFilters,
  };
}
