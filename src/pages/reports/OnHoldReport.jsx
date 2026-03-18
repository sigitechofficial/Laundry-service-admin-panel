import { useMemo, useState } from "react";
import { Typography } from "@mui/material";
import DataTable from "../../components/ui/DataTable";
import { useReportsOnHoldQuery } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import { buildReportParams } from "./reportQueryUtils";

export default function OnHoldReport() {
  const [period, setPeriod] = useState("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const params = buildReportParams({
    period,
    search,
    page,
    limit,
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
  });
  const { data, isLoading } = useReportsOnHoldQuery(params);
  const reportData = useMemo(
    () =>
      (data?.data?.data || []).map((row, idx) => ({
        id: `${row.orderId || idx}-${idx}`,
        sl: row.sl ?? idx + 1,
        orderId: row.orderId ?? "—",
        customerName: row.customerName ?? "—",
        email: row.email ?? "—",
        phone: row.phone ?? "—",
        items: row.items ?? 0,
        onHoldReason: row.onHoldReason ?? "—",
        status: row.status ?? "—",
        resolution: row.resolution ?? "—",
      })),
    [data]
  );

  const totalRows = Number(data?.data?.total || reportData.length || 0);

  const columns = [
    { field: "sl", headerName: "SL", flex: 0.1, minWidth: 60 },
    { field: "orderId", headerName: "Order ID", flex: 0.2, minWidth: 120 },
    { field: "customerName", headerName: "Customer", flex: 0.18, minWidth: 140 },
    { field: "email", headerName: "Email", flex: 0.22, minWidth: 170 },
    { field: "phone", headerName: "Phone", flex: 0.16, minWidth: 130 },
    { field: "items", headerName: "Items", flex: 0.1, minWidth: 80 },
    {
      field: "onHoldReason",
      headerName: "On Hold Reason",
      flex: 0.35,
      minWidth: 250,
      renderCell: (row) => (
        <Typography sx={{ fontSize: 13, color: "#475569", whiteSpace: "normal", lineHeight: 1.4 }}>
          {row.onHoldReason}
        </Typography>
      ),
    },
    { field: "status", headerName: "Status", flex: 0.1, minWidth: 90 },
    { field: "resolution", headerName: "Resolution", flex: 0.14, minWidth: 120 },
  ];

  if (isLoading) return <Delay />;

  return (
    <div className="!space-y-6">
      <div className="w-full overflow-auto">
        <DataTable
          data={reportData}
          columns={columns}
          searchPlaceholder="Search by order ID, customer..."
          searchValue={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          dateRangeValue={dateRange}
          onDateRangeChange={(next) => {
            setDateRange(next);
            setPeriod(next?.type || "all");
            setPage(1);
          }}
          serverSidePagination
          totalRows={totalRows}
          currentPage={page}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
          height={500}
        />
      </div>
    </div>
  );
}
