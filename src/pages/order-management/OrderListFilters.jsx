import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Field, Input, Select } from "../../design-system";
import FilterDetails from "./FilterDetails";
import OrderZoneFilter from "./OrderZoneFilter";
import OrderShopFilter from "./OrderShopFilter";
import {
  DEFAULT_ORDER_LIST_SORT_BY,
  DEFAULT_ORDER_LIST_SORT_DIR,
  ORDER_LIST_SORT_OPTIONS,
} from "./orderListQuery";
import styles from "./orderList.module.css";

function toDateInput(value) {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
}

const DATE_PRESETS = [
  { days: "", label: "All dates" },
  { days: 1, label: "Latest day" },
  { days: 3, label: "Last 3 days" },
  { days: 7, label: "Last 7 days" },
  { days: 14, label: "Last 14 days" },
];

const RECURRING_OPTIONS = [
  { value: "", label: "All orders" },
  { value: "recurring", label: "Recurring only" },
  { value: "manual", label: "Manual only" },
];

function presetFromRange(dateRange) {
  if (!dateRange?.startDate || !dateRange?.endDate) return "";
  const start = dayjs(dateRange.startDate).startOf("day");
  const end = dayjs(dateRange.endDate).startOf("day");
  const today = dayjs().startOf("day");
  if (!end.isSame(today, "day")) return "custom";
  const days = end.diff(start, "day") + 1;
  return DATE_PRESETS.some((p) => p.days === days) ? days : "custom";
}

function rangeForDays(days) {
  const end = dayjs().format("YYYY-MM-DD");
  const start = dayjs()
    .subtract(Math.max(1, days) - 1, "day")
    .format("YYYY-MM-DD");
  return { startDate: start, endDate: end };
}

export default function OrderListFilters({
  searchInput,
  onSearchInputChange,
  searchPlaceholder = "Search by order ID, shop or service…",
  zoneId,
  onZoneIdChange,
  shopId,
  onShopIdChange,
  statusId,
  onStatusIdChange,
  recurringType,
  onRecurringTypeChange,
  orderStatuses = [],
  statusOptions: statusOptionsProp,
  showStatusFilter = false,
  dateRange,
  onDateRangeChange,
  onClearFilters,
  hasActiveFilters,
  onDownload,
  extra,
  showSort = true,
  sortBy = DEFAULT_ORDER_LIST_SORT_BY,
  onSortByChange,
  sortDir = DEFAULT_ORDER_LIST_SORT_DIR,
  onSortDirChange,
  sortOptions = ORDER_LIST_SORT_OPTIONS,
  defaultSortBy = DEFAULT_ORDER_LIST_SORT_BY,
}) {
  const [draftStart, setDraftStart] = useState(toDateInput(dateRange?.startDate));
  const [draftEnd, setDraftEnd] = useState(toDateInput(dateRange?.endDate));
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    setDraftStart(toDateInput(dateRange?.startDate));
    setDraftEnd(toDateInput(dateRange?.endDate));
  }, [dateRange]);

  const statusOptions = useMemo(() => {
    if (Array.isArray(statusOptionsProp) && statusOptionsProp.length) {
      return statusOptionsProp;
    }
    return [
      { value: "", label: "All statuses" },
      ...orderStatuses
        .map((s) => ({
          value: String(s.id ?? s.statusId ?? ""),
          label: s.title ?? s.name ?? s.status ?? String(s.id ?? ""),
        }))
        .filter((opt) => opt.value !== ""),
    ];
  }, [orderStatuses, statusOptionsProp]);

  const commitDates = (start, end) => {
    setDraftStart(start);
    setDraftEnd(end);
    if (start && end) {
      onDateRangeChange?.({ startDate: start, endDate: end });
    } else {
      onDateRangeChange?.(null);
    }
  };

  const activePreset = presetFromRange(dateRange);
  const dateLabel =
    activePreset === "custom"
      ? "Date range"
      : DATE_PRESETS.find((p) => p.days === activePreset)?.label || "All dates";
  const advancedCount =
    (showStatusFilter && statusId ? 1 : 0) +
    (showStatusFilter && recurringType ? 1 : 0);
  const sortIsCustom =
    String(sortBy || defaultSortBy) !== String(defaultSortBy) ||
    String(sortDir || DEFAULT_ORDER_LIST_SORT_DIR) !== DEFAULT_ORDER_LIST_SORT_DIR;

  return (
    <div className={styles.toolbar}>
      {onSearchInputChange ? (
        <label className={styles.search}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[17px] w-[17px] text-[#8a94a2]" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
          <input
            id="order-list-search"
            type="search"
            value={searchInput ?? ""}
            onChange={(e) => onSearchInputChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] text-[#0e131c] outline-none placeholder:text-[#8a94a2]"
          />
        </label>
      ) : null}

      {onZoneIdChange ? <OrderZoneFilter value={zoneId} onChange={onZoneIdChange} /> : null}

      {onShopIdChange ? <OrderShopFilter value={shopId} onChange={onShopIdChange} /> : null}

      {onDateRangeChange ? (
        <FilterDetails
          summary={
            <summary
              className={`${styles.tool} list-none cursor-pointer hover:bg-[#f4f5f8] [&::-webkit-details-marker]:hidden ${
                dateRange?.startDate
                  ? "border-[#2c3ba0] bg-[#eef0fb] text-[#20307f]"
                  : ""
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-[#5c6673]">
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M3 9h18M8 2v4M16 2v4" />
              </svg>
              {dateLabel}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 text-[#8a94a2] transition group-open:rotate-180">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
          }
          panelClassName="absolute right-0 z-30 mt-2 min-w-[220px] rounded-xl border border-[#e6e9f0] bg-white p-1.5 shadow-[0_20px_48px_-16px_rgba(16,21,31,.34)]"
        >
          <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#5c6673]">
            Order placed
          </p>
          {DATE_PRESETS.map((preset) => {
            const on = activePreset === preset.days;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={(e) => {
                  setShowCustom(false);
                  if (!preset.days) onDateRangeChange?.(null);
                  else onDateRangeChange?.(rangeForDays(preset.days));
                  e.currentTarget.closest("details")?.removeAttribute("open");
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] ${
                  on ? "bg-[#eef0fb] font-semibold text-[#20307f]" : "text-[#38424f] hover:bg-[#f4f5f8]"
                }`}
              >
                <span className="flex-1">{preset.label}</span>
                {on ? <span className="font-bold text-[#2c3ba0]">✓</span> : null}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className={`flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[13.5px] ${
              activePreset === "custom" || showCustom
                ? "bg-[#eef0fb] font-semibold text-[#20307f]"
                : "text-[#38424f] hover:bg-[#f4f5f8]"
            }`}
          >
            Custom range
          </button>
          {showCustom || activePreset === "custom" ? (
            <div className="grid grid-cols-1 gap-2 border-t border-[#e6e9f0] p-2 sm:grid-cols-2">
              <Field label="Start" htmlFor="order-list-start">
                <Input
                  id="order-list-start"
                  type="date"
                  value={draftStart}
                  onChange={(e) => commitDates(e.target.value, draftEnd)}
                />
              </Field>
              <Field label="End" htmlFor="order-list-end">
                <Input
                  id="order-list-end"
                  type="date"
                  value={draftEnd}
                  onChange={(e) => commitDates(draftStart, e.target.value)}
                />
              </Field>
            </div>
          ) : null}
        </FilterDetails>
      ) : null}

      {showStatusFilter ? (
        <FilterDetails
          summary={
            <summary
              className={`${styles.tool} list-none cursor-pointer hover:bg-[#f4f5f8] [&::-webkit-details-marker]:hidden ${
                advancedCount
                  ? "border-[#2c3ba0] bg-[#eef0fb] text-[#20307f]"
                  : ""
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-[#5c6673]">
                <path d="M3 5h18l-7 8v6l-4-2v-4z" />
              </svg>
              Filters
              {advancedCount ? (
                <span className="min-w-[18px] rounded-full bg-[#2c3ba0] px-1.5 text-center text-[11px] font-bold text-white">
                  {advancedCount}
                </span>
              ) : null}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 text-[#8a94a2] transition group-open:rotate-180">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
          }
          panelClassName="absolute right-0 z-30 mt-2 w-[260px] rounded-xl border border-[#e6e9f0] bg-white p-4 shadow-[0_20px_48px_-16px_rgba(16,21,31,.34)]"
        >
          <Field label="Status">
            <Select
              aria-label="Order status"
              value={statusId || ""}
              onChange={(value) => onStatusIdChange?.(value)}
              options={statusOptions}
              placeholder="All statuses"
            />
          </Field>
          <Field label="Type">
            <Select
              aria-label="Order type"
              value={recurringType || ""}
              onChange={(value) => onRecurringTypeChange?.(value)}
              options={RECURRING_OPTIONS}
              placeholder="All orders"
            />
          </Field>
          {hasActiveFilters && onClearFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-3 text-xs font-semibold text-[#5c6673] hover:text-[#0e131c]"
            >
              Clear all
            </button>
          ) : null}
        </FilterDetails>
      ) : null}

      {showSort && onSortByChange ? (
        <>
          <div
            className={`${styles.sortBy} ${
              sortIsCustom ? "border-[#2c3ba0] bg-[#eef0fb] text-[#20307f]" : ""
            }`}
          >
            <span className={styles.sortByLabel}>Sort by</span>
            <div className={styles.sortSelect}>
              <Select
                aria-label="Sort by"
                value={sortBy || defaultSortBy}
                onChange={(value) => onSortByChange(value)}
                options={sortOptions}
                placeholder="Sort by"
              />
            </div>
          </div>
          <div className={styles.sortDir} role="group" aria-label="Sort direction">
            <button
              type="button"
              aria-pressed={sortDir === "asc"}
              className={sortDir === "asc" ? styles.sortDirOn : undefined}
              onClick={() => onSortDirChange?.("asc")}
            >
              Asc
            </button>
            <button
              type="button"
              aria-pressed={sortDir === "desc"}
              className={sortDir === "desc" ? styles.sortDirOn : undefined}
              onClick={() => onSortDirChange?.("desc")}
            >
              Desc
            </button>
          </div>
        </>
      ) : null}

      <div className={styles.toolbarActions}>
        {hasActiveFilters && onClearFilters && !showStatusFilter ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-[13px] font-semibold text-[#5c6673] hover:text-[#0e131c]"
          >
            Clear
          </button>
        ) : null}
        {onDownload ? (
          <button
            type="button"
            onClick={onDownload}
            className={`${styles.tool} hover:bg-[#f4f5f8]`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-[#5c6673]">
              <path d="M12 3v12M8 11l4 4 4-4M4 21h16" />
            </svg>
            Download
          </button>
        ) : null}
        {extra}
      </div>
    </div>
  );
}
