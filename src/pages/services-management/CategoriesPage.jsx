import { useState } from "react";
import { Button } from "../../design-system";
import ItemCategoriesCard from "./ItemCategoriesCard";
import CatalogChrome from "./catalogChrome";

export default function CategoriesPage() {
  const [triggerAdd, setTriggerAdd] = useState(0);

  return (
    <CatalogChrome
      section="categories"
      title="Categories"
      description="Item types under a parent service. Link add-ons on a category for all items, or on each item individually."
      breadcrumb={["Catalog", "Categories"]}
      actions={
        <Button onClick={() => setTriggerAdd((prev) => prev + 1)}>
          Add Category
        </Button>
      }
    >
      <ItemCategoriesCard triggerAdd={triggerAdd} />
    </CatalogChrome>
  );
}
