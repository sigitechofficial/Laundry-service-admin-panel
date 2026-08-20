import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";

export const REPORT_PERIOD_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

const PERIOD_VALUES = new Set(REPORT_PERIOD_OPTIONS.map((option) => option.value));
const LIMIT_VALUES = new Set([10, 20, 25, 50]);
const FILTER_KEYS = ["period", "startDate", "endDate", "zoneId", "shopId", "search", "page", "limit"];

export const DEFAULT_REPORT_PERIOD = "this_month";
export const DEFAULT_REPORT_LIMIT = 20;

export const toDateString = (value) => {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
};

function readPeriod(params, fallback) {
  const value = params.get("period");
  return PERIOD_VALUES.has(value) ? value : fallback;
}

function readPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

function writeParams(prev, patch, { defaultPeriod, defaultLimit, paginated }) {
  const next = new URLSearchParams(prev);
  Object.entries(patch).forEach(([key, value]) => {
    const empty = value == null || value === "";
    const isDefaultPeriod = key === "period" && value === defaultPeriod;
    const isDefaultPage = key === "page" && Number(value) === 1;
    const isDefaultLimit = key === "limit" && Number(value) === defaultLimit;
    if (empty || isDefaultPeriod || isDefaultPage || isDefaultLimit) {
      next.delete(key);
      return;
    }
    next.set(key, String(value));
  });
  if (!paginated) {
    next.delete("page");
    next.delete("limit");
  }
  if (next.get("period") !== "custom") {
    next.delete("startDate");
    next.delete("endDate");
  }
  return next;
}

export const buildReportParams = (queryState) => {
  const params = {
    period: queryState.period || DEFAULT_REPORT_PERIOD,
  };

  if (queryState.zoneId) params.zoneId = queryState.zoneId;
  if (queryState.shopId) params.shopId = queryState.shopId;
  if (queryState.search) params.search = String(queryState.search).slice(0, 80);
  if (queryState.page) params.page = queryState.page;
  if (queryState.limit) params.limit = queryState.limit;

  if (params.period === "custom") {
    if (queryState.startDate) params.startDate = toDateString(queryState.startDate);
    if (queryState.endDate) params.endDate = toDateString(queryState.endDate);
  }

  return params;
};

export function useReportFilters({
  paginated = true,
  defaultLimit = DEFAULT_REPORT_LIMIT,
  defaultPeriod = DEFAULT_REPORT_PERIOD,
} = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const period = readPeriod(searchParams, defaultPeriod);
  const search = (searchParams.get("search") || "").slice(0, 80);
  const startDate = toDateString(searchParams.get("startDate") || "");
  const endDate = toDateString(searchParams.get("endDate") || "");
  const zoneId = searchParams.get("zoneId") || "";
  const shopId = searchParams.get("shopId") || "";
  const page = paginated ? readPositiveInt(searchParams.get("page"), 1) : 1;
  const limit = paginated && LIMIT_VALUES.has(Number(searchParams.get("limit")))
    ? Number(searchParams.get("limit"))
    : defaultLimit;

  const update = (patch) => {
    setSearchParams(
      (prev) => writeParams(prev, patch, { defaultPeriod, defaultLimit, paginated }),
      { replace: true }
    );
  };

  const setPeriod = (next) => {
    update({
      period: next,
      page: 1,
      ...(next !== "custom" ? { startDate: "", endDate: "" } : {}),
    });
  };

  const clearFilters = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        FILTER_KEYS.forEach((key) => next.delete(key));
        return next;
      },
      { replace: true }
    );
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
    setPeriod,
    search,
    setSearch: (value) => update({ search: value, page: 1 }),
    startDate,
    setStartDate: (value) => update({ startDate: value, period: "custom", page: 1 }),
    endDate,
    setEndDate: (value) => update({ endDate: value, period: "custom", page: 1 }),
    zoneId,
    setZoneId: (value) => update({ zoneId: value, page: 1 }),
    shopId,
    setShopId: (value) => update({ shopId: value, page: 1 }),
    page,
    setPage: (value) => update({ page: value }),
    limit,
    setLimit: (value) => update({ limit: value, page: 1 }),
    params,
    clearFilters,
    patchFilters: update,
  };
}

export function useReportView(allowed, fallback) {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("view");
  const view = allowed.includes(raw) ? raw : fallback;

  const setView = (next) => {
    setSearchParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        if (!next || next === fallback) updated.delete("view");
        else updated.set("view", next);
        updated.delete("page");
        return updated;
      },
      { replace: true }
    );
  };

  return [view, setView];
}

export function preserveReportSearch(search, { resetPage = true, dropView = false } = {}) {
  const next = new URLSearchParams(search);
  if (resetPage) next.delete("page");
  if (dropView) next.delete("view");
  const serialized = next.toString();
  return serialized ? `?${serialized}` : "";
}
