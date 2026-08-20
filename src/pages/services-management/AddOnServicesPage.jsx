import { useState } from "react";
import { Button } from "../../design-system";
import AddOnServicesCard from "./AddOnServicesCard";
import AddOnCategoriesModal from "./AddOnCategoriesModal";
import CatalogChrome from "./catalogChrome";

export default function AddOnServicesPage() {
  const [triggerAdd, setTriggerAdd] = useState(0);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  return (
    <CatalogChrome
      section="addons"
      title="Add-ons"
      description="Optional extras grouped by add-on category. Link a category to an item from Categories so customers see the same extras."
      breadcrumb={["Catalog", "Add-ons"]}
      actions={
        <>
          <Button variant="secondary" onClick={() => setCategoriesOpen(true)}>
            Manage Categories
          </Button>
          <Button onClick={() => setTriggerAdd((prev) => prev + 1)}>
            Add Add-on
          </Button>
        </>
      }
    >
      <AddOnServicesCard triggerAdd={triggerAdd} />
      <AddOnCategoriesModal
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
      />
    </CatalogChrome>
  );
}
