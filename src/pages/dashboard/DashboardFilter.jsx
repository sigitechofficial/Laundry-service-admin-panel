import { useState } from "react";
import SelectField from "../../components/ui/SelectField";

const DEFAULT_PERIOD_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

export default function DashboardFilter({
  value,
  onChange,
  zoneOptions = [],
  cityOptions = [],
  countryOptions = [],
  periodOptions = DEFAULT_PERIOD_OPTIONS,
}) {
  const [selectedFilters, setSelectedFilters] = useState({
    zoneId: "",
    cityId: "",
    countryId: "",
    period: "all",
  });
  const state = value || selectedFilters;

  const handleFilterChange = (e) => {
    const next = {
      ...state,
      [e.target.name]: e.target.value,
    };
    setSelectedFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (onChange) onChange(next);
  };

  return (
    <div className="flex items-center gap-4">
      <SelectField
        onChange={(e) => handleFilterChange(e)}
        options={zoneOptions}
        value={state.zoneId || ""}
        placeholder="Zone"
        width={"120px"}
        radius="4px"
        height="44px"
        bgcolor={"white"}
        name="zoneId"
      />

      <SelectField
        onChange={(e) => handleFilterChange(e)}
        options={cityOptions}
        value={state.cityId || ""}
        placeholder="City"
        width={"120px"}
        radius="4px"
        height="44px"
        bgcolor={"white"}
        name="cityId"
      />

      <SelectField
        onChange={(e) => handleFilterChange(e)}
        options={countryOptions}
        value={state.countryId || ""}
        placeholder="Country"
        width={"120px"}
        radius="4px"
        height="44px"
        bgcolor={"white"}
        name="countryId"
      />

      <SelectField
        onChange={(e) => handleFilterChange(e)}
        options={periodOptions}
        value={state.period || "all"}
        placeholder="All Time"
        width={"120px"}
        radius="4px"
        height="44px"
        bgcolor={"white"}
        name="period"
      />
    </div>
  );
}
