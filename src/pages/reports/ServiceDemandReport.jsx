import { useState } from "react";
import { Box } from "@mui/material";
import DataTable from "../../components/ui/DataTable";
import DashboardFilter from "../dashboard/DashboardFilter";

export default function ServiceDemandReport() {
  const [dateRange, setDateRange] = useState(null);

  const reportData = [];

  const columns = [
    { field: "sl", headerName: "SL", flex: 0.1, minWidth: 60 },
    { field: "service", headerName: "Service", flex: 0.25, minWidth: 160 },
    { field: "demandCount", headerName: "Demand count", flex: 0.2, minWidth: 120 },
    { field: "period", headerName: "Period", flex: 0.25, minWidth: 140 },
    { field: "trend", headerName: "Trend", flex: 0.2, minWidth: 100 },
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
          searchPlaceholder="Search by service..."
          height={500}
        />
      </div>
    </div>
  );
}
