import { useMemo, useState } from "react";
import SelectField from "../../components/ui/SelectField";
import {
  useGetAllZonesQuery,
  useGetAllCountriesQuery,
  useGetCitiesByCountryIdQuery,
} from "../../store/services/api";

const DEFAULT_PERIOD_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

function normalizeZones(data) {
  const raw = Array.isArray(data)
    ? data
    : data?.zones ?? data?.data ?? [];
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
  });

  const filters = value !== undefined ? value : selectedFilters;

  const { data: zonesRes } = useGetAllZonesQuery();
  const { data: countriesRes } = useGetAllCountriesQuery();
  const { data: citiesRes, isFetching: citiesLoading } = useGetCitiesByCountryIdQuery(
    filters.countryId,
    { skip: !filters.countryId }
  );

  const zoneOptions = useMemo(() => {
    const zones = normalizeZones(zonesRes?.data);
    return zones
      .map((z) => ({
        value: String(z.id ?? z.zoneId ?? ""),
        label: z.name ?? z.zoneName ?? String(z.id ?? z.zoneId ?? ""),
      }))
      .filter((opt) => opt.value !== "");
  }, [zonesRes?.data]);

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

  const handleFilterChange = (field) => (e) => {
    const val = e.target.value;
    let next = { ...filters, [field]: val };
    if (field === "countryId") {
      next = { ...next, cityId: "" };
    }
    if (value === undefined) {
      setSelectedFilters(next);
    }
    onChange?.(next);
  };

  return (
    <div className="flex items-center gap-4">
      <SelectField
        onChange={handleFilterChange("countryId")}
        options={countryOptions}
        value={filters.countryId || ""}
        placeholder="Country"
        width={"140px"}
        radius="4px"
        height="44px"
        bgcolor={"white"}
      />

      <SelectField
        onChange={handleFilterChange("cityId")}
        options={cityOptions}
        value={filters.cityId || ""}
        placeholder={filters.countryId ? (citiesLoading ? "Loading…" : "City") : "City"}
        width={"140px"}
        radius="4px"
        height="44px"
        bgcolor={"white"}
        disabled={!filters.countryId || citiesLoading}
      />

      <SelectField
        onChange={handleFilterChange("zoneId")}
        options={zoneOptions}
        value={filters.zoneId || ""}
        placeholder="Zone"
        width={"140px"}
        radius="4px"
        height="44px"
        bgcolor={"white"}
      />

      <SelectField
        onChange={handleFilterChange("period")}
        options={periodOptions}
        value={filters.period || "all"}
        placeholder="All Time"
        width={"120px"}
        radius="4px"
        height="44px"
        bgcolor={"white"}
      />
    </div>
  );
}
