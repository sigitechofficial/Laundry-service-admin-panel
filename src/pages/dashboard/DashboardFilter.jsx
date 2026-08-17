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
  { value: "this_week", label: "Last 7 days" },
  { value: "this_month", label: "This Month" },
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

  const allZones = useMemo(() => normalizeZones(zonesRes?.data), [zonesRes?.data]);

  const zoneOptions = useMemo(() => {
    return allZones
      .filter((z) => {
        const zCity = z.cityId ?? z.city?.id;
        const zCountry =
          z.countryId ?? z.city?.countryId ?? z.country?.id ?? null;

        if (filters.cityId) {
          return zCity == null || String(zCity) === String(filters.cityId);
        }
        if (filters.countryId) {
          // Prefer zone.countryId; fall back to matching city list when present
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

  const handleFilterChange = (field) => (e) => {
    const val = e.target.value;
    let next = { ...filters, [field]: val };
    if (field === "countryId") {
      next = { ...next, cityId: "", zoneId: "" };
    }
    if (field === "cityId") {
      next = { ...next, zoneId: "" };
    }
    // Period placeholder "" → treat as all time
    if (field === "period" && !val) {
      next = { ...next, period: "all" };
    }
    if (value === undefined) {
      setSelectedFilters(next);
    }
    onChange?.(next);
  };

  return (
    <div className="flex items-center gap-4 flex-wrap justify-end">
      <SelectField
        onChange={handleFilterChange("countryId")}
        options={countryOptions}
        value={filters.countryId || ""}
        placeholder="All countries"
        width={"150px"}
        radius="4px"
        height="44px"
        bgcolor={"white"}
      />

      <SelectField
        onChange={handleFilterChange("cityId")}
        options={cityOptions}
        value={filters.cityId || ""}
        placeholder={
          !filters.countryId
            ? "All cities"
            : citiesLoading
              ? "Loading…"
              : "All cities"
        }
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
        placeholder="All zones"
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
        width={"130px"}
        radius="4px"
        height="44px"
        bgcolor={"white"}
      />
    </div>
  );
}
