import { useState } from "react";
import { Button } from "../../design-system";
import ServicesCard from "./ServicesCard";
import CatalogChrome, { useCatalogScope } from "./catalogChrome";
import ZoneModeGuard from "./ZoneModeGuard";

export default function ServicesPage() {
  const { isZoneMode } = useCatalogScope();
  const [triggerAdd, setTriggerAdd] = useState(0);

  return (
    <CatalogChrome
      section="services"
      title="Services"
      description="Catalog services shown to customers, including pricing and turnaround. Categories and items live under each service in Catalog."
      breadcrumb={["Catalog", "Services"]}
      actions={
        isZoneMode ? null : (
        <Button onClick={() => setTriggerAdd((prev) => prev + 1)}>
          Add Service
        </Button>
        )
      }
    >
      {isZoneMode ? <ZoneModeGuard sectionName="Services" /> : <ServicesCard triggerAdd={triggerAdd} />}
    </CatalogChrome>
  );
}
