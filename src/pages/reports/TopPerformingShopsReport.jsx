import { useMemo, useState } from "react";
import DataTable from "../../components/ui/DataTable";
import { useReportsTopShopsQuery } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import { buildReportParams } from "./reportQueryUtils";

export default function TopPerformingShopsReport() {
  const [period, setPeriod] = useState("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState(null);

  const params = buildReportParams({
    period,
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
  });
  const { data, isLoading } = useReportsTopShopsQuery(params);

  const reportData = useMemo(
    () =>
      (data?.data?.data || [])
        .map((shop, index) => ({
          id: `${shop.sl || index + 1}-${index}`,
          sl: shop.sl ?? index + 1,
          rank: shop.rank ?? "—",
          shopName: shop.shopName ?? "—",
          city: shop.city ?? "—",
          country: shop.country ?? "—",
          location: shop.location ?? "—",
          zone: shop.zone ?? "—",
          ordersCompleted: shop.ordersCompleted ?? 0,
          grossRevenue: shop.grossRevenue ?? "0.00",
          commissionPercent: shop.commissionPercent ?? "—",
          commissionAmount: shop.commissionAmount ?? "0.00",
          driversCommission: shop.driversCommission ?? "0.00",
          deduction: shop.deduction ?? "0.00",
          netPayout: shop.netPayout ?? "0.00",
        }))
        .filter((row) =>
          search
            ? `${row.shopName} ${row.zone}`.toLowerCase().includes(search.toLowerCase())
            : true
        ),
    [data, search]
  );

  const columns = [
    { field: "sl", headerName: "SL", flex: 0.08, minWidth: 60 },
    { field: "rank", headerName: "Rank", flex: 0.08, minWidth: 70 },
    { field: "shopName", headerName: "Shop Name", flex: 0.2, minWidth: 170 },
    { field: "city", headerName: "City", flex: 0.12, minWidth: 110 },
    { field: "country", headerName: "Country", flex: 0.12, minWidth: 110 },
    { field: "zone", headerName: "Zone", flex: 0.12, minWidth: 110 },
    { field: "ordersCompleted", headerName: "Orders", flex: 0.12, minWidth: 90 },
    { field: "grossRevenue", headerName: "Gross Revenue", flex: 0.14, minWidth: 130 },
    { field: "netPayout", headerName: "Net Payout", flex: 0.14, minWidth: 120 },
  ];

  if (isLoading) return <Delay />;

  return (
    <div className="!space-y-6">
      <div className="w-full overflow-auto">
        <DataTable
          data={reportData}
          columns={columns}
          searchPlaceholder="Search by shop name..."
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
