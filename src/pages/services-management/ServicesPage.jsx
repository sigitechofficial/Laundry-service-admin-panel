import { useState } from "react";
import { Button } from "../../design-system";
import ServicesCard from "./ServicesCard";
import CatalogChrome from "./catalogChrome";

export default function ServicesPage() {
  const [triggerAdd, setTriggerAdd] = useState(0);

  return (
    <CatalogChrome
      section="services"
      title="Services"
      description="Catalog services shown to customers, including pricing and turnaround. Categories and items live under each service in Catalog."
      breadcrumb={["Catalog", "Services"]}
      actions={
        <Button onClick={() => setTriggerAdd((prev) => prev + 1)}>
          Add Service
        </Button>
      }
    >
      <ServicesCard triggerAdd={triggerAdd} />
    </CatalogChrome>
  );
}
