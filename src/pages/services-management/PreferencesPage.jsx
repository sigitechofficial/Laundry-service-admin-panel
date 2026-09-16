import { useState } from "react";
import { Button } from "../../design-system";
import PreferencesCard from "./PreferencesCard";
import CatalogChrome, { useCatalogScope } from "./catalogChrome";
import ZoneModeGuard from "./ZoneModeGuard";

export default function PreferencesPage() {
  const { isZoneMode } = useCatalogScope();
  const [triggerAdd, setTriggerAdd] = useState(0);

  return (
    <CatalogChrome
      section="preferences"
      title="Preferences"
      description="Preference types and values customers choose. Attach them to a service from Configure — Catalog shows the link on each service."
      breadcrumb={["Catalog", "Preferences"]}
      actions={
        isZoneMode ? null : (
        <Button onClick={() => setTriggerAdd((prev) => prev + 1)}>
          Add Preference
        </Button>
        )
      }
    >
      {isZoneMode ? <ZoneModeGuard sectionName="Preferences" /> : <PreferencesCard triggerAdd={triggerAdd} />}
    </CatalogChrome>
  );
}
