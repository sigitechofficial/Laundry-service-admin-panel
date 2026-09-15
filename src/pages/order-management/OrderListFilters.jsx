import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { Field, Input, Modal, Select } from "../../design-system";
import { useGetAllZonesQuery, useGetShopsDataQuery } from "../../store/services/api";
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

function normalizeZones(data) {
  const raw = Array.isArray(data) ? data : data?.zones ?? data?.data ?? [];
  return Array.isArray(raw) ? raw : [];
}

function ChoiceChip({ selected, children, onPick }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`${styles.filterChip} ${selected ? styles.filterChipOn : ""}`}
    >
      {children}
    </button>
  );
}

function snapshotFromProps({
  zoneId,
  shopId,
  statusId,
  recurringType,
  dateRange,
  sortBy,
  sortDir,
  defaultSortBy,
}) {
  const preset = presetFromRange(dateRange);
  return {
    zoneId: zoneId ?? "",
    shopId: shopId ?? "",
    statusId: statusId ?? "",
    recurringType: recurringType ?? "",
    datePreset: preset === "custom" ? "custom" : preset,
    startDate: toDateInput(dateRange?.startDate),
    endDate: toDateInput(dateRange?.endDate),
    sortBy: sortBy || defaultSortBy,
    sortDir: sortDir || DEFAULT_ORDER_LIST_SORT_DIR,
  };
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
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() =>
    snapshotFromProps({
      zoneId,
      shopId,
      statusId,
      recurringType,
      dateRange,
      sortBy,
      sortDir,
      defaultSortBy,
    })
  );

  const { data: zonesRes } = useGetAllZonesQuery(undefined, {
    skip: !onZoneIdChange,
  });
  const { data: shopsRes } = useGetShopsDataQuery(undefined, {
    skip: !onShopIdChange,
  });

  const zoneOptions = useMemo(() => {
    const zones = normalizeZones(zonesRes?.data);
    return [
      { value: "", label: "All zones" },
      ...zones
        .map((z) => ({
          value: String(z.id ?? z.zoneId ?? ""),
          label: z.name ?? z.zoneName ?? String(z.id ?? z.zoneId ?? ""),
        }))
        .filter((opt) => opt.value !== ""),
    ];
  }, [zonesRes?.data]);

  const shopOptions = useMemo(() => {
    const shops = shopsRes?.data?.AllShopsData || [];
    return [
      { value: "", label: "All shops" },
      ...shops
        .map((s) => ({
          value: String(s.shopAddressId ?? ""),
          label: s.shopName || `Shop ${s.id}`,
        }))
        .filter((opt) => opt.value !== ""),
    ];
  }, [shopsRes?.data?.AllShopsData]);

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

  const sortIsCustom =
    String(sortBy || defaultSortBy) !== String(defaultSortBy) ||
    String(sortDir || DEFAULT_ORDER_LIST_SORT_DIR) !== DEFAULT_ORDER_LIST_SORT_DIR;

  const modalActiveCount =
    (onZoneIdChange && zoneId ? 1 : 0) +
    (onShopIdChange && shopId ? 1 : 0) +
    (onDateRangeChange && dateRange?.startDate ? 1 : 0) +
    (showStatusFilter && statusId ? 1 : 0) +
    (showStatusFilter && recurringType ? 1 : 0) +
    (showSort && onSortByChange && sortIsCustom ? 1 : 0);

  const openModal = () => {
    setDraft(
      snapshotFromProps({
        zoneId,
        shopId,
        statusId,
        recurringType,
        dateRange,
        sortBy,
        sortDir,
        defaultSortBy,
      })
    );
    setOpen(true);
  };

  const patchDraft = (partial) => setDraft((prev) => ({ ...prev, ...partial }));

  const pickDatePreset = (preset) => {
    if (!preset.days) {
      patchDraft({ datePreset: "", startDate: "", endDate: "" });
      return;
    }
    const range = rangeForDays(preset.days);
    patchDraft({
      datePreset: preset.days,
      startDate: range.startDate,
      endDate: range.endDate,
    });
  };

  const applyDraft = () => {
    onZoneIdChange?.(draft.zoneId);
    onShopIdChange?.(draft.shopId);
    if (showStatusFilter) {
      onStatusIdChange?.(draft.statusId);
      onRecurringTypeChange?.(draft.recurringType);
    }
    if (onDateRangeChange) {
      if (draft.startDate && draft.endDate) {
        onDateRangeChange({ startDate: draft.startDate, endDate: draft.endDate });
      } else {
        onDateRangeChange(null);
      }
    }
    if (showSort) {
      onSortByChange?.(draft.sortBy);
      onSortDirChange?.(draft.sortDir);
    }
    setOpen(false);
  };

  const clearDraftAndApply = () => {
    const empty = {
      zoneId: "",
      shopId: "",
      statusId: "",
      recurringType: "",
      datePreset: "",
      startDate: "",
      endDate: "",
      sortBy: defaultSortBy,
      sortDir: DEFAULT_ORDER_LIST_SORT_DIR,
    };
    setDraft(empty);
    onZoneIdChange?.("");
    onShopIdChange?.("");
    if (showStatusFilter) {
      onStatusIdChange?.("");
      onRecurringTypeChange?.("");
    }
    onDateRangeChange?.(null);
    if (showSort) {
      onSortByChange?.(defaultSortBy);
      onSortDirChange?.(DEFAULT_ORDER_LIST_SORT_DIR);
    }
    setOpen(false);
  };

  const draftDateOn = (preset) =>
    preset.days === ""
      ? !draft.startDate && !draft.endDate && draft.datePreset !== "custom"
      : draft.datePreset === preset.days;

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
            className={styles.searchInput}
          />
        </label>
      ) : null}

      <div className={styles.toolbarActions}>
        {hasActiveFilters && onClearFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-[13px] font-semibold text-[#5c6673] hover:text-[#0e131c]"
          >
            Clear
          </button>
        ) : null}
        <button
          type="button"
          onClick={openModal}
          className={`${styles.tool} ${
            modalActiveCount ? "border-[#2c3ba0] bg-[#eef0fb] text-[#20307f]" : ""
          } hover:bg-[#f4f5f8]`}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-[#5c6673]">
            <path d="M3 5h18l-7 8v6l-4-2v-4z" />
          </svg>
          Filters
          {modalActiveCount ? (
            <span className="min-w-[18px] rounded-full bg-[#2c3ba0] px-1.5 text-center text-[11px] font-bold text-white">
              {modalActiveCount}
            </span>
          ) : null}
        </button>
        {onDownload ? (
          <button
            type="button"
            onClick={onDownload}
            className={`${styles.tool} ${styles.iconTool} hover:bg-[#f4f5f8]`}
            aria-label="Download"
            title="Download"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-[#5c6673]">
              <path d="M12 3v12M8 11l4 4 4-4M4 21h16" />
            </svg>
          </button>
        ) : null}
        {extra}
      </div>

      <Modal
        open={open}
        title="Filters"
        description="Set zone, shop, dates, status and sort, then apply."
        onClose={() => setOpen(false)}
        primaryLabel="Apply"
        secondaryLabel="Cancel"
        onPrimary={applyDraft}
        size="md"
        maxHeight="80vh"
      >
        <div className={styles.filterModal}>
          {onZoneIdChange ? (
            <Field label="Zone">
              <Select
                aria-label="Zone"
                value={draft.zoneId}
                onChange={(value) => patchDraft({ zoneId: value })}
                options={zoneOptions}
              />
            </Field>
          ) : null}

          {onShopIdChange ? (
            <Field label="Shop">
              <Select
                aria-label="Shop"
                value={draft.shopId}
                onChange={(value) => patchDraft({ shopId: value })}
                options={shopOptions}
              />
            </Field>
          ) : null}

          {onDateRangeChange ? (
            <div>
              <p className={styles.filterSectionLabel}>Order placed</p>
              <div className={styles.filterChipRow}>
                {DATE_PRESETS.map((preset) => (
                  <ChoiceChip
                    key={preset.label}
                    selected={draftDateOn(preset)}
                    onPick={() => pickDatePreset(preset)}
                  >
                    {preset.label}
                  </ChoiceChip>
                ))}
                <ChoiceChip
                  selected={draft.datePreset === "custom"}
                  onPick={() =>
                    patchDraft({
                      datePreset: "custom",
                      startDate: draft.startDate,
                      endDate: draft.endDate,
                    })
                  }
                >
                  Custom range
                </ChoiceChip>
              </div>
              {draft.datePreset === "custom" ? (
                <div className={styles.filterDateGrid}>
                  <Field label="Start" htmlFor="order-list-start">
                    <Input
                      id="order-list-start"
                      type="date"
                      value={draft.startDate}
                      onChange={(e) =>
                        patchDraft({
                          datePreset: "custom",
                          startDate: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="End" htmlFor="order-list-end">
                    <Input
                      id="order-list-end"
                      type="date"
                      value={draft.endDate}
                      onChange={(e) =>
                        patchDraft({
                          datePreset: "custom",
                          endDate: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
              ) : null}
            </div>
          ) : null}

          {showStatusFilter ? (
            <>
              <Field label="Status">
                <Select
                  aria-label="Status"
                  value={draft.statusId}
                  onChange={(value) => patchDraft({ statusId: value })}
                  options={statusOptions}
                />
              </Field>
              <Field label="Type">
                <Select
                  aria-label="Order type"
                  value={draft.recurringType}
                  onChange={(value) => patchDraft({ recurringType: value })}
                  options={RECURRING_OPTIONS}
                />
              </Field>
            </>
          ) : null}

          {showSort && onSortByChange ? (
            <div className={styles.filterSortRow}>
              <Field label="Sort by">
                <Select
                  aria-label="Sort by"
                  value={draft.sortBy}
                  onChange={(value) => patchDraft({ sortBy: value })}
                  options={sortOptions}
                />
              </Field>
              <div>
                <p className={styles.filterSectionLabel}>Direction</p>
                <div className={styles.sortDir} role="group" aria-label="Sort direction">
                  <button
                    type="button"
                    aria-pressed={draft.sortDir === "asc"}
                    className={draft.sortDir === "asc" ? styles.sortDirOn : undefined}
                    onClick={() => patchDraft({ sortDir: "asc" })}
                  >
                    Asc
                  </button>
                  <button
                    type="button"
                    aria-pressed={draft.sortDir === "desc"}
                    className={draft.sortDir === "desc" ? styles.sortDirOn : undefined}
                    onClick={() => patchDraft({ sortDir: "desc" })}
                  >
                    Desc
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {modalActiveCount ? (
            <button
              type="button"
              onClick={clearDraftAndApply}
              className={styles.filterClear}
            >
              Clear all filters
            </button>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
