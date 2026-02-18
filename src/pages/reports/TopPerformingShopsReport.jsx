import { useState } from "react";
import { Box } from "@mui/material";
import DataTable from "../../components/ui/DataTable";
import DashboardFilter from "../dashboard/DashboardFilter";
import { useGetShopsDataQuery } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";

export default function TopPerformingShopsReport() {
  const [dateRange, setDateRange] = useState(null);
  const { data: shopsResponse, isLoading } = useGetShopsDataQuery();
  const shops = shopsResponse?.data?.AllShopsData || shopsResponse?.data?.topPerformingShops || [];

  const reportData = (Array.isArray(shops) ? shops : []).slice(0, 20).map((shop, index) => ({
    id: shop.id,
    sl: index + 1,
    shopName: shop.shopName ?? shop.name ?? "—",
    orders: shop.orderCount ?? shop.totalOrders ?? "—",
    revenue: shop.totalRevenue ?? "—",
    zone: shop.addressDb?.zone?.name ?? "—",
  }));

  const columns = [
    { field: "sl", headerName: "SL", flex: 0.08, minWidth: 60 },
    { field: "shopName", headerName: "Shop Name", flex: 0.28, minWidth: 180 },
    { field: "orders", headerName: "Orders", flex: 0.18, minWidth: 100 },
    { field: "revenue", headerName: "Revenue", flex: 0.2, minWidth: 120 },
    { field: "zone", headerName: "Zone", flex: 0.2, minWidth: 120 },
  ];

  if (isLoading) return <Delay />;

  return (
    <div className="!space-y-6">
      <Box className="flex justify-end">
        <DashboardFilter />
      </Box>
      <div className="w-full overflow-auto">
        <DataTable
          data={reportData}
          columns={columns}
          searchPlaceholder="Search by shop name..."
          height={500}
        />
      </div>
    </div>
  );
}
