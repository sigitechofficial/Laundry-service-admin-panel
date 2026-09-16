import { useState } from "react";
import { Button } from "../../design-system";
import ItemCategoriesCard from "./ItemCategoriesCard";
import CatalogChrome, { useCatalogScope } from "./catalogChrome";
import ZoneModeGuard from "./ZoneModeGuard";

export default function CategoriesPage() {
  const { isZoneMode } = useCatalogScope();
  const [triggerAdd, setTriggerAdd] = useState(0);

  return (
    <CatalogChrome
      section="categories"
      title="Categories"
      description="Item types under a parent service. Link add-ons on a category for all items, or on each item individually."
      breadcrumb={["Catalog", "Categories"]}
      actions={
        isZoneMode ? null : (
        <Button onClick={() => setTriggerAdd((prev) => prev + 1)}>
          Add Category
        </Button>
        )
      }
    >
      {isZoneMode ? <ZoneModeGuard sectionName="Categories" /> : <ItemCategoriesCard triggerAdd={triggerAdd} />}
    </CatalogChrome>
  );
}
