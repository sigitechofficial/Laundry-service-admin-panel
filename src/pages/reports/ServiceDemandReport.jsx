import { useMemo, useState } from "react";
import DataTable from "../../components/ui/DataTable";
import { useReportsServiceDemandQuery } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import { buildReportParams } from "./reportQueryUtils";

export default function ServiceDemandReport() {
  const [period, setPeriod] = useState("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState(null);

  const params = buildReportParams({
    period,
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
  });
  const { data, isLoading } = useReportsServiceDemandQuery(params);
  const reportData = useMemo(
    () =>
      (data?.data?.data || [])
        .map((row, idx) => ({
          id: `${row.sl || idx + 1}-${idx}`,
          sl: row.sl ?? idx + 1,
          category: row.category ?? "—",
          totalOrders: row.totalOrders ?? 0,
          percentOfTotal: row.percentOfTotal ?? "0%",
          revenue: row.revenue ?? "0.00",
          status: row.status ? "Active" : "Inactive",
        }))
        .filter((row) =>
          search
            ? String(row.category).toLowerCase().includes(search.toLowerCase())
            : true
        ),
    [data, search]
  );

  const columns = [
    { field: "sl", headerName: "SL", flex: 0.1, minWidth: 60 },
    { field: "category", headerName: "Category", flex: 0.3, minWidth: 170 },
    { field: "totalOrders", headerName: "Total Orders", flex: 0.16, minWidth: 120 },
    { field: "percentOfTotal", headerName: "% of Total", flex: 0.16, minWidth: 120 },
    { field: "revenue", headerName: "Revenue", flex: 0.2, minWidth: 120 },
    { field: "status", headerName: "Status", flex: 0.12, minWidth: 100 },
  ];

  if (isLoading) return <Delay />;

  return (
    <div className="!space-y-6">
      <div className="w-full overflow-auto">
        <DataTable
          data={reportData}
          columns={columns}
          searchPlaceholder="Search by service..."
          searchValue={search}
          onSearchChange={setSearch}
          dateRangeValue={dateRange}
          onDateRangeChange={(next) => {
            setDateRange(next);
            setPeriod(next?.type || "all");
          }}
          height={500}
          showFilters={false}
          showDownload={false}
        />
      </div>
    </div>
  );
}
