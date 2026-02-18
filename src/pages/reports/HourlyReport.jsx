import { useState } from "react";
import { Box } from "@mui/material";
import DataTable from "../../components/ui/DataTable";
import DashboardFilter from "../dashboard/DashboardFilter";
import { Delay } from "../../components/shared/Loaders";

export default function HourlyReport() {
  const [dateRange, setDateRange] = useState(null);

  const reportData = [
    { id: 1, sl: 1, hour: "00:00 - 01:00", orders: 0, revenue: "—" },
    { id: 2, sl: 2, hour: "01:00 - 02:00", orders: 0, revenue: "—" },
    { id: 3, sl: 3, hour: "06:00 - 07:00", orders: 0, revenue: "—" },
    { id: 4, sl: 4, hour: "12:00 - 13:00", orders: 0, revenue: "—" },
    { id: 5, sl: 5, hour: "18:00 - 19:00", orders: 0, revenue: "—" },
  ];

  const columns = [
    { field: "sl", headerName: "SL", flex: 0.1, minWidth: 60 },
    { field: "hour", headerName: "Hour", flex: 0.3, minWidth: 160 },
    { field: "orders", headerName: "Orders", flex: 0.25, minWidth: 100 },
    { field: "revenue", headerName: "Revenue", flex: 0.25, minWidth: 120 },
  ];

  return (
    <div className="!space-y-6">
      <Box className="flex justify-end">
        <DashboardFilter />
      </Box>
      <div className="w-full overflow-auto">
        <DataTable
          data={reportData}
          columns={columns}
          searchPlaceholder="Search by hour..."
          height={500}
        />
      </div>
    </div>
  );
}
