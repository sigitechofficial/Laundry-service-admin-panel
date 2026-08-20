import { useNavigate } from "react-router-dom";
import { Button, PageHeader } from "../../design-system";
import Shops from "./Shops";

export default function ShopsPage() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader
        title="All shops"
        description="Find a shop by name or zone, read trading health, then open the record."
        actions={
          <Button onClick={() => navigate("/shop-management/add-shop")}>Add shop</Button>
        }
      />
      <Shops />
    </div>
  );
}
