import { useMemo, useState } from "react";
import DataTable from "../../components/ui/DataTable";
import { useReportsTopServicesQuery } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import { buildReportParams } from "./reportQueryUtils";

export default function TopServicesReport() {
  const [period, setPeriod] = useState("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const queryState = {
    period,
    search,
    page,
    limit,
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
  };
  const params = buildReportParams(queryState);
  const { data, isLoading } = useReportsTopServicesQuery(params);

  const reportData = useMemo(
    () =>
      (data?.data?.data || []).map((row, idx) => ({
        id: `${row.sl || idx + 1}-${idx}`,
        sl: row.sl ?? idx + 1,
        rank: row.rank ?? "—",
        service: row.service ?? "—",
        noOfOrders: row.numberOfOrders ?? 0,
        totalRevenue: row.totalRevenue ?? "0.00",
      })),
    [data]
  );

  const totalRows = Number(data?.data?.total || reportData.length || 0);

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
      <div className="w-full overflow-auto">
        <DataTable
          data={reportData}
          columns={columns}
          searchPlaceholder="Search by service, rank..."
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
