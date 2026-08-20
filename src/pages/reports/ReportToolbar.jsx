import { useMemo } from "react";
import { Button, Select } from "../../design-system";
import { useGetAllZonesQuery, useGetShopsDataQuery } from "../../store/services/api";
import {
  DirectoryClearButton,
  DirectoryDateInput,
  DirectorySearch,
  DirectoryToolSelect,
  DirectoryToolbar,
  DirectoryToolbarEnd,
} from "../directory-table/directoryTable";
import { DEFAULT_REPORT_PERIOD, REPORT_PERIOD_OPTIONS } from "./reportQueryUtils";

const PAGE_SIZES = [
  { value: 10, label: "10 / page" },
  { value: 20, label: "20 / page" },
  { value: 25, label: "25 / page" },
  { value: 50, label: "50 / page" },
];

function normalizeZones(data) {
  const raw = Array.isArray(data) ? data : data?.zones ?? data?.data ?? [];
  return Array.isArray(raw) ? raw : [];
}

export function ReportTabs({ tabs, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
      {tabs.map((tab) => {
        const key = tab.value ?? tab.path;
        const active = value === key;
        return (
          <Button
            key={key}
            variant={active ? "primary" : "secondary"}
            size="sm"
            onClick={() => onChange(tab)}
          >
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}

export function ReportPagination({ page, pageSize, totalRows, onPageChange, onPageSizeChange }) {
  const safePageSize = pageSize || 20;
  const totalPages = Math.max(1, Math.ceil((totalRows || 0) / safePageSize));
  const start = totalRows === 0 ? 0 : (page - 1) * safePageSize + 1;
  const end = Math.min(page * safePageSize, totalRows || 0);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
        {totalRows === 0 ? "No rows" : `Showing ${start}–${end} of ${totalRows}`}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <div style={{ minWidth: 130 }}>
          <Select
            aria-label="Rows per page"
            value={safePageSize}
            onChange={(next) => onPageSizeChange?.(Number(next))}
            options={PAGE_SIZES}
          />
        </div>
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>
          Previous
        </Button>
        <span style={{ fontSize: 13, color: "var(--muted)", minWidth: 72, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
          {page} / {totalPages}
        </span>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export default function ReportToolbar({
  search,
  onSearch,
  searchPlaceholder = "Search…",
  hideSearch = false,
  period,
  onPeriodChange,
  startDate = "",
  endDate = "",
  onStartDateChange,
  onEndDateChange,
  zoneId,
  onZoneIdChange,
  shopId,
  onShopIdChange,
  onExport,
  exportDisabled = false,
  extraTools,
  onClear,
}) {
  const { data: zonesRes } = useGetAllZonesQuery();
  const { data: shopsRes } = useGetShopsDataQuery(undefined, { skip: !onShopIdChange });

  const zoneOptions = useMemo(() => {
    const zones = normalizeZones(zonesRes?.data);
    return [
      { value: "", label: "All zones" },
      ...zones
        .map((z) => ({
          value: String(z.id ?? z.zoneId ?? ""),
          label: z.name ?? z.zoneName ?? String(z.id ?? ""),
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
          value: String(s.shopAddressId || ""),
          label: s.shopName || `Shop ${s.id}`,
        }))
        .filter((opt) => opt.value !== ""),
    ];
  }, [shopsRes?.data?.AllShopsData]);

  const hasFilters =
    Boolean(search) ||
    (period && period !== DEFAULT_REPORT_PERIOD) ||
    startDate ||
    endDate ||
    zoneId ||
    shopId;

  return (
    <DirectoryToolbar>
      {hideSearch ? null : (
        <DirectorySearch
          id="report-search"
          value={search}
          onChange={onSearch}
          placeholder={searchPlaceholder}
        />
      )}
      {period != null ? (
        <DirectoryToolSelect>
          <Select
            aria-label="Report period"
            value={period}
            onChange={(next) => onPeriodChange?.(next)}
            options={REPORT_PERIOD_OPTIONS}
          />
        </DirectoryToolSelect>
      ) : null}
      {period === "custom" ? (
        <>
          <DirectoryDateInput
            id="report-start-date"
            value={startDate}
            onChange={(value) => onStartDateChange?.(value)}
            aria-label="Start date"
            title="Start date"
          />
          <DirectoryDateInput
            id="report-end-date"
            value={endDate}
            onChange={(value) => onEndDateChange?.(value)}
            aria-label="End date"
            title="End date"
          />
        </>
      ) : null}
      {onZoneIdChange ? (
        <DirectoryToolSelect>
          <Select
            aria-label="Zone"
            value={zoneId || ""}
            onChange={(next) => onZoneIdChange?.(next)}
            options={zoneOptions}
          />
        </DirectoryToolSelect>
      ) : null}
      {onShopIdChange ? (
        <DirectoryToolSelect>
          <Select
            aria-label="Shop"
            value={shopId || ""}
            onChange={(next) => onShopIdChange?.(next)}
            options={shopOptions}
          />
        </DirectoryToolSelect>
      ) : null}
      {extraTools}
      {onExport ? (
        <Button variant="secondary" size="sm" onClick={onExport} disabled={exportDisabled}>
          Export
        </Button>
      ) : null}
      {hasFilters ? (
        <DirectoryToolbarEnd>
          <DirectoryClearButton
            onClick={() => {
              if (onClear) {
                onClear();
                return;
              }
              onSearch?.("");
              if (period && period !== DEFAULT_REPORT_PERIOD) onPeriodChange?.(DEFAULT_REPORT_PERIOD);
              if (startDate) onStartDateChange?.("");
              if (endDate) onEndDateChange?.("");
              if (zoneId) onZoneIdChange?.("");
              if (shopId) onShopIdChange?.("");
            }}
          />
        </DirectoryToolbarEnd>
      ) : null}
    </DirectoryToolbar>
  );
}
