import { useState } from "react";
import SelectField from "../../components/ui/SelectField";

export default function DashboardFilter() {
  const [selectedFilters, setSelectedFilters] = useState({
    zone: "",
    city: "",
    country: "",
    time: "",
  });

  const handleFilterChange = (e) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };
  return (
    <div className="flex items-center gap-4">
      <SelectField
        onChange={(e) => handleFilterChange(e)}
        options={[
          { value: "admin", label: "Admin" },
          { value: "manager", label: "Manager" },
        ]}
        value={selectedFilters.zone}
        placeholder="Zone"
        width={"120px"}
        radius="4px"
        height="44px"
        bgcolor={"white"}
        name="zone"
      />
      <SelectField
        onChange={(e) => handleFilterChange(e)}
        options={[
          { value: "admin", label: "Admin" },
          { value: "manager", label: "Manager" },
        ]}
        value={selectedFilters.zone}
        placeholder="City"
        width={"120px"}
        radius="4px"
        height="44px"
        bgcolor={"white"}
        name="zone"
      />
      <SelectField
        onChange={(e) => handleFilterChange(e)}
        options={[
          { value: "admin", label: "Admin" },
          { value: "manager", label: "Manager" },
        ]}
        value={selectedFilters.zone}
        placeholder="Country"
        width={"120px"}
        radius="4px"
        height="44px"
        bgcolor={"white"}
        name="zone"
      />
      <SelectField
        onChange={(e) => handleFilterChange(e)}
        options={[
          { value: "admin", label: "Admin" },
          { value: "manager", label: "Manager" },
        ]}
        value={selectedFilters.zone}
        placeholder="All Time"
        width={"120px"}
        radius="4px"
        height="44px"
        bgcolor={"white"}
        name="zone"
      />
    </div>
  );
}
