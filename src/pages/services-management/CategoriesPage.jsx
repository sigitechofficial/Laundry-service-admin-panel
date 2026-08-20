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
      description="Item types grouped under a parent service. Expand a category to price and link add-ons on each item."
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
