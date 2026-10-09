import { useSearchParams } from "react-router-dom";
import { DEFAULT_REPORT_PERIOD } from "./reportQueryUtils";

/**
 * Extra URL filters for the Promotions / Campaigns spend reports (on top of
 * useReportFilters: period, dates, zone, search, page, limit).
 */
export function useSpendReportExtras(f, keys) {
  const [searchParams] = useSearchParams();
  const values = Object.fromEntries(keys.map((k) => [k, searchParams.get(k) || ""]));
  const set = (key) => (value) => f.patchFilters({ [key]: value, page: 1 });
  // One URL update (two setSearchParams calls in a row would overwrite each other).
  const clearAll = () =>
    f.patchFilters({
      period: DEFAULT_REPORT_PERIOD,
      startDate: "",
      endDate: "",
      zoneId: "",
      search: "",
      page: 1,
      ...Object.fromEntries(keys.map((k) => [k, ""])),
    });
  const active = keys.some((k) => values[k]);
  return { values, set, clearAll, active };
}

/** Mirrors ReportToolbar: when true it already shows its own Clear button. */
export function builtinFiltersActive(f) {
  return Boolean(f.search || (f.period && f.period !== DEFAULT_REPORT_PERIOD) || f.startDate || f.endDate || f.zoneId);
}

/** "cost_desc" → { sort: "cost", dir: "desc" } */
export function splitSort(value, fallback = "cost_desc") {
  const raw = value || fallback;
  const i = raw.lastIndexOf("_");
  return { sort: raw.slice(0, i), dir: raw.slice(i + 1) };
}

export const YES_NO_USED = [
  { value: "", label: "All (used or not)" },
  { value: "1", label: "Used in period only" },
];
