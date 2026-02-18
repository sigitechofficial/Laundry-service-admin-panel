import { useState } from "react";
import { Box } from "@mui/material";
import DataTable from "../../components/ui/DataTable";
import DashboardFilter from "../dashboard/DashboardFilter";

export default function OnHoldReport() {
  const [dateRange, setDateRange] = useState(null);

  const reportData = [];

  const columns = [
    { field: "sl", headerName: "SL", flex: 0.1, minWidth: 60 },
    { field: "orderId", headerName: "Order ID", flex: 0.2, minWidth: 120 },
    { field: "customer", headerName: "Customer", flex: 0.22, minWidth: 140 },
    { field: "onHoldSince", headerName: "On hold since", flex: 0.22, minWidth: 140 },
    { field: "reason", headerName: "Reason", flex: 0.26, minWidth: 160 },
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
          searchPlaceholder="Search by order ID, customer..."
          height={500}
        />
      </div>
    </div>
  );
}
