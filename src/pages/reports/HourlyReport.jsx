import { useMemo, useState } from "react";
import DataTable from "../../components/ui/DataTable";
import { Delay } from "../../components/shared/Loaders";
import { useReportsHourlyQuery } from "../../store/services/api";
import { buildReportParams } from "./reportQueryUtils";

export default function HourlyReport() {
  const [period, setPeriod] = useState("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState(null);

  const params = buildReportParams({
    period,
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
  });
  const { data, isLoading } = useReportsHourlyQuery(params);

  const reportData = useMemo(
    () =>
      (data?.data?.data || [])
        .map((row, idx) => ({
          id: `${row.sl || idx + 1}-${idx}`,
          sl: row.sl ?? idx + 1,
          hours: row.hours ?? "—",
          pickupOrders: row.pickupOrders ?? 0,
          deliveryOrders: row.deliveryOrders ?? 0,
          totalActivity: row.totalActivity ?? 0,
        }))
        .filter((row) =>
          search
            ? String(row.hours).toLowerCase().includes(search.toLowerCase())
            : true
        ),
    [data, search]
  );

  const columns = [
    { field: "sl", headerName: "SL", flex: 0.1, minWidth: 60 },
    { field: "hours", headerName: "Hours", flex: 0.3, minWidth: 160 },
    { field: "pickupOrders", headerName: "Pickup Orders", flex: 0.2, minWidth: 130 },
    { field: "deliveryOrders", headerName: "Delivery Orders", flex: 0.2, minWidth: 130 },
    { field: "totalActivity", headerName: "Total Activity", flex: 0.2, minWidth: 120 },
  ];

  if (isLoading) return <Delay />;

  return (
    <div className="!space-y-6">
      <div className="w-full overflow-auto">
        <DataTable
          data={reportData}
          columns={columns}
          searchPlaceholder="Search by hour..."
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
