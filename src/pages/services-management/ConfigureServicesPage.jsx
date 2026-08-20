import { useState } from "react";
import { Button } from "../../design-system";
import ConfigureService from "./ConfigureService";
import CatalogChrome from "./catalogChrome";

export default function ConfigureServicesPage() {
  const [triggerConfigure, setTriggerConfigure] = useState(0);

  return (
    <CatalogChrome
      section="configure"
      title="Configure"
      description="Link item categories and preference types to a service. This is the join between the catalogs — it does not create new items."
      breadcrumb={["Catalog", "Configure"]}
      actions={
        <Button onClick={() => setTriggerConfigure((prev) => prev + 1)}>
          Configure Service
        </Button>
      }
    >
      <ConfigureService triggerConfigure={triggerConfigure} />
    </CatalogChrome>
  );
}
