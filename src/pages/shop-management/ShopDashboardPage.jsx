import { PageHeader } from "../../design-system";
import ShopDashboard from "./ShopDashboard";

export default function ShopDashboardPage() {
  return (
    <div>
      <PageHeader
        title="Shop Dashboard"
        description="Revenue, orders, and employee totals across shops"
      />
      <ShopDashboard />
    </div>
  );
}
