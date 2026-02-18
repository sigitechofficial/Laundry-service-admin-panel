import { useState } from "react";
import { Box } from "@mui/material";
import DataTable from "../../components/ui/DataTable";
import DashboardFilter from "../dashboard/DashboardFilter";

export default function DailyEarningReport() {
  const [dateRange, setDateRange] = useState(null);

  const reportData = [];

  const columns = [
    { field: "sl", headerName: "SL", flex: 0.1, minWidth: 60 },
    { field: "date", headerName: "Date", flex: 0.25, minWidth: 140 },
    { field: "orders", headerName: "Orders", flex: 0.2, minWidth: 100 },
    { field: "earnings", headerName: "Earnings", flex: 0.25, minWidth: 140 },
    { field: "avgOrderValue", headerName: "Avg. order value", flex: 0.2, minWidth: 130 },
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
          searchPlaceholder="Search by date..."
          height={500}
        />
      </div>
    </div>
  );
}
