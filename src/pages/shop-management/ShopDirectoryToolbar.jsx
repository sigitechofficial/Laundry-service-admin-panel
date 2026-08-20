import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Field, Input, Select } from "../../design-system";
import { useGetAllZonesQuery } from "../../store/services/api";
import {
  DirectoryClearButton,
  DirectoryMorePanel,
  DirectorySearch,
  DirectoryTool,
  DirectoryToolSelect,
  DirectoryToolbar,
  DirectoryToolbarEnd,
} from "../directory-table/directoryTable";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function toDateInput(value) {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
}

function normalizeZones(data) {
  const raw = Array.isArray(data) ? data : data?.zones ?? data?.data ?? [];
  return Array.isArray(raw) ? raw : [];
}

export default function ShopDirectoryToolbar({
  searchInput,
  onSearchInputChange,
  zoneId,
  onZoneIdChange,
  statusId,
  onStatusIdChange,
  dateRange,
  onDateRangeChange,
  onClearFilters,
  hasActiveFilters,
  isRefreshing = false,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(toDateInput(dateRange?.startDate));
  const [draftEnd, setDraftEnd] = useState(toDateInput(dateRange?.endDate));
  const { data: zonesRes } = useGetAllZonesQuery();

  useEffect(() => {
    setDraftStart(toDateInput(dateRange?.startDate));
    setDraftEnd(toDateInput(dateRange?.endDate));
  }, [dateRange]);

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

  const commitDates = (start, end) => {
    setDraftStart(start);
    setDraftEnd(end);
    if (start && end) {
      onDateRangeChange?.({ startDate: start, endDate: end });
    } else {
      onDateRangeChange?.(null);
    }
  };

  const datesActive = Boolean(dateRange?.startDate && dateRange?.endDate);

  return (
    <div>
      <DirectoryToolbar>
        <DirectorySearch
          id="shop-directory-search"
          value={searchInput ?? ""}
          onChange={onSearchInputChange}
          placeholder="Shop name, email, or address"
        />
        <DirectoryToolSelect>
          <Select
            aria-label="Shop status"
            value={statusId || ""}
            onChange={(value) => onStatusIdChange?.(value)}
            options={STATUS_OPTIONS}
            placeholder="All statuses"
          />
        </DirectoryToolSelect>
        <DirectoryToolSelect>
          <Select
            aria-label="Zone"
            value={zoneId || ""}
            onChange={(value) => onZoneIdChange?.(value)}
            options={zoneOptions}
            placeholder={zoneOptions.length <= 1 ? "No zones loaded" : "All zones"}
          />
        </DirectoryToolSelect>
        <DirectoryTool
          as="button"
          type="button"
          active={datesActive || moreOpen}
          onClick={() => setMoreOpen((v) => !v)}
        >
          {datesActive ? "Registered dates · on" : "Registered dates"}
        </DirectoryTool>
        <DirectoryToolbarEnd>
          {hasActiveFilters ? <DirectoryClearButton onClick={onClearFilters} /> : null}
          {isRefreshing ? <span style={{ fontSize: 13, color: "#5c6673" }}>Refreshing…</span> : null}
        </DirectoryToolbarEnd>
      </DirectoryToolbar>

      {moreOpen ? (
        <DirectoryMorePanel>
          <Field label="Registered from" htmlFor="shop-directory-start">
            <Input
              id="shop-directory-start"
              type="date"
              value={draftStart}
              onChange={(e) => commitDates(e.target.value, draftEnd)}
            />
          </Field>
          <Field label="Registered to" htmlFor="shop-directory-end">
            <Input
              id="shop-directory-end"
              type="date"
              value={draftEnd}
              onChange={(e) => commitDates(draftStart, e.target.value)}
            />
          </Field>
        </DirectoryMorePanel>
      ) : null}
    </div>
  );
}
