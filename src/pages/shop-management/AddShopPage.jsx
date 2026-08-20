import { PageHeader } from "../../design-system";
import AddShop from "./AddShop";

export default function AddShopPage() {
  return (
    <div>
      <PageHeader
        title="Add shop"
        description="Onboard a shop in four steps: owner account, location, operations, then review. Account and address are saved as you continue."
      />
      <AddShop />
    </div>
  );
}
