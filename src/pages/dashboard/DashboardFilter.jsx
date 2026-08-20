import { useMemo, useState } from "react";
import { Input, Select } from "../../design-system";
import {
  useGetAllZonesQuery,
  useGetAllCountriesQuery,
  useGetCitiesByCountryIdQuery,
} from "../../store/services/api";

const DEFAULT_PERIOD_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "Last 7 days" },
  { value: "this_month", label: "This month" },
  { value: "custom", label: "Custom range" },
];

function normalizeZones(data) {
  const raw = Array.isArray(data) ? data : data?.zones ?? data?.data ?? [];
  return Array.isArray(raw) ? raw : [];
}

function normalizeCountries(data) {
  const raw = Array.isArray(data) ? data : data?.countries ?? [];
  return Array.isArray(raw) ? raw : [];
}

function normalizeCities(data) {
  const raw = data?.cities ?? data;
  return Array.isArray(raw) ? raw : [];
}

export default function DashboardFilter({
  value,
  onChange,
  periodOptions = DEFAULT_PERIOD_OPTIONS,
}) {
  const [selectedFilters, setSelectedFilters] = useState({
    zoneId: "",
    cityId: "",
    countryId: "",
    period: "all",
    startDate: "",
    endDate: "",
  });

  const filters = value !== undefined ? value : selectedFilters;
  const isCustom = filters.period === "custom";

  const { data: zonesRes } = useGetAllZonesQuery();
  const { data: countriesRes } = useGetAllCountriesQuery();
  const { data: citiesRes, isFetching: citiesLoading } = useGetCitiesByCountryIdQuery(
    filters.countryId,
    { skip: !filters.countryId }
  );

  const allZones = useMemo(() => normalizeZones(zonesRes?.data), [zonesRes?.data]);

  const zoneOptions = useMemo(() => {
    return allZones
      .filter((z) => {
        const zCity = z.cityId ?? z.city?.id;
        const zCountry = z.countryId ?? z.city?.countryId ?? z.country?.id ?? null;

        if (filters.cityId) {
          return zCity == null || String(zCity) === String(filters.cityId);
        }
        if (filters.countryId) {
          if (zCountry != null) {
            return String(zCountry) === String(filters.countryId);
          }
          if (zCity == null) return true;
          const cities = normalizeCities(citiesRes?.data);
          if (!cities.length) return true;
          return cities.some((c) => String(c.id) === String(zCity));
        }
        return true;
      })
      .map((z) => ({
        value: String(z.id ?? z.zoneId ?? ""),
        label: z.name ?? z.zoneName ?? String(z.id ?? z.zoneId ?? ""),
      }))
      .filter((opt) => opt.value !== "");
  }, [allZones, filters.cityId, filters.countryId, citiesRes?.data]);

  const countryOptions = useMemo(() => {
    const countries = normalizeCountries(countriesRes?.data);
    return countries.map((c) => ({
      value: String(c.id),
      label: c.name ?? c.shortName ?? String(c.id),
    }));
  }, [countriesRes?.data]);

  const cityOptions = useMemo(() => {
    const cities = normalizeCities(citiesRes?.data);
    return cities.map((c) => ({
      value: String(c.id),
      label: c.name ?? c.cityName ?? String(c.id),
    }));
  }, [citiesRes?.data]);

  const commit = (next) => {
    if (value === undefined) {
      setSelectedFilters(next);
    }
    onChange?.(next);
  };

  const handleFilterChange = (field) => (val) => {
    let next = { ...filters, [field]: val };
    if (field === "countryId") {
      next = { ...next, cityId: "", zoneId: "" };
    }
    if (field === "cityId") {
      next = { ...next, zoneId: "" };
    }
    if (field === "period") {
      if (!val) next = { ...next, period: "all" };
      if (val !== "custom") {
        next = { ...next, startDate: "", endDate: "" };
      }
    }
    commit(next);
  };

  const handleDateChange = (field) => (event) => {
    commit({ ...filters, [field]: event.target.value });
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="w-[148px] min-w-[136px]">
        <Select
          aria-label="Country"
          onChange={handleFilterChange("countryId")}
          options={[{ value: "", label: "All countries" }, ...countryOptions]}
          value={filters.countryId || ""}
          placeholder="All countries"
        />
      </div>

      <div className="w-[148px] min-w-[136px]">
        <Select
          aria-label="City"
          onChange={handleFilterChange("cityId")}
          options={[{ value: "", label: "All cities" }, ...cityOptions]}
          value={filters.cityId || ""}
          placeholder={
            !filters.countryId ? "All cities" : citiesLoading ? "Loading…" : "All cities"
          }
          disabled={!filters.countryId || citiesLoading}
        />
      </div>

      <div className="w-[148px] min-w-[136px]">
        <Select
          aria-label="Zone"
          onChange={handleFilterChange("zoneId")}
          options={[{ value: "", label: "All zones" }, ...zoneOptions]}
          value={filters.zoneId || ""}
          placeholder="All zones"
        />
      </div>

      <div className="w-[148px] min-w-[136px]">
        <Select
          aria-label="Period"
          onChange={handleFilterChange("period")}
          options={periodOptions}
          value={filters.period || "all"}
          placeholder="All time"
        />
      </div>

      {isCustom ? (
        <>
          <div className="w-[148px] min-w-[136px]">
            <Input
              type="date"
              aria-label="Start date"
              value={filters.startDate || ""}
              onChange={handleDateChange("startDate")}
            />
          </div>
          <div className="w-[148px] min-w-[136px]">
            <Input
              type="date"
              aria-label="End date"
              value={filters.endDate || ""}
              min={filters.startDate || undefined}
              onChange={handleDateChange("endDate")}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
