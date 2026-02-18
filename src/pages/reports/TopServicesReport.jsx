import { useState } from "react";
import { Box } from "@mui/material";
import DataTable from "../../components/ui/DataTable";
import DashboardFilter from "../dashboard/DashboardFilter";
import {
  useGetAllCustomersQuery,
} from "../../store/services/api";
import { useSelector } from "react-redux";
import { Delay } from "../../components/shared/Loaders";

export default function TopServicesReport() {
  const [dateRange, setDateRange] = useState(null);
  const { isLoading } = useGetAllCustomersQuery();
  const customers = useSelector((state) => state.apiData.customers);

  const reportData = (customers || []).map((cus, index) => ({
    id: cus.id,
    sl: index + 1,
    rank: cus.id,
    service: [cus?.firstName, cus?.lastName].filter(Boolean).join(" ") || "—",
    noOfOrders: cus?.email ?? "—",
    totalRevenue: cus?.email ?? "—",
  }));

  const columns = [
    { field: "sl", headerName: "SL", flex: 0.15, minWidth: 80 },
    { field: "rank", headerName: "Rank", flex: 0.12, minWidth: 100 },
    { field: "service", headerName: "Service", flex: 0.22, minWidth: 150 },
    { field: "noOfOrders", headerName: "No. of Orders", flex: 0.2, minWidth: 130 },
    { field: "totalRevenue", headerName: "Total Revenue", flex: 0.2, minWidth: 140 },
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
          searchPlaceholder="Search by service, rank..."
          height={500}
        />
      </div>
    </div>
  );
}
