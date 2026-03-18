import { useMemo, useState } from "react";
import { Tabs, Tab } from "@mui/material";
import DataTable from "../../components/ui/DataTable";
import {
  useReportsDailyEarningsByShopQuery,
  useReportsDailyEarningsByZoneQuery,
  useReportsDailyEarningsQuery,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import { buildReportParams } from "./reportQueryUtils";

export default function DailyEarningReport() {
  const [activeTab, setActiveTab] = useState("daily");
  const [period, setPeriod] = useState("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState(null);

  const params = buildReportParams({
    period,
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
  });

  const { data: dailyData, isLoading: isDailyLoading } = useReportsDailyEarningsQuery(params, {
    skip: activeTab !== "daily",
  });
  const { data: zoneData, isLoading: isZoneLoading } = useReportsDailyEarningsByZoneQuery(params, {
    skip: activeTab !== "zone",
  });
  const { data: shopData, isLoading: isShopLoading } = useReportsDailyEarningsByShopQuery(params, {
    skip: activeTab !== "shop",
  });

  const reportData = useMemo(() => {
    const source =
      activeTab === "zone"
        ? zoneData?.data?.data || []
        : activeTab === "shop"
          ? shopData?.data?.data || []
          : dailyData?.data?.data || [];

    return source
      .map((row, idx) => ({
        id: `${row.sl || idx + 1}-${idx}`,
        sl: row.sl ?? idx + 1,
        date: row.date ?? "—",
        dayOfWeek: row.dayOfWeek ?? "—",
        ordersCompleted: row.ordersCompleted ?? 0,
        grossRevenue: row.grossRevenue ?? "0.00",
        avgOrderValue: row.avgOrderValue ?? "0.00",
        zoneName: row.zoneName ?? "—",
        shopName: row.shopName ?? "—",
        revenue: row.revenue ?? "0.00",
      }))
      .filter((row) =>
        search
          ? `${row.date} ${row.dayOfWeek} ${row.zoneName} ${row.shopName}`
            .toLowerCase()
            .includes(search.toLowerCase())
          : true
      );
  }, [activeTab, dailyData, zoneData, shopData, search]);

  const columns = useMemo(() => {
    if (activeTab === "zone") {
      return [
        { field: "sl", headerName: "SL", flex: 0.08, minWidth: 60 },
        { field: "date", headerName: "Date", flex: 0.16, minWidth: 120 },
        { field: "dayOfWeek", headerName: "Day", flex: 0.15, minWidth: 110 },
        { field: "zoneName", headerName: "Zone", flex: 0.3, minWidth: 180 },
        { field: "revenue", headerName: "Revenue", flex: 0.2, minWidth: 130 },
      ];
    }

    if (activeTab === "shop") {
      return [
        { field: "sl", headerName: "SL", flex: 0.08, minWidth: 60 },
        { field: "date", headerName: "Date", flex: 0.14, minWidth: 120 },
        { field: "dayOfWeek", headerName: "Day", flex: 0.14, minWidth: 100 },
        { field: "shopName", headerName: "Shop Name", flex: 0.24, minWidth: 170 },
        { field: "zoneName", headerName: "Zone", flex: 0.18, minWidth: 120 },
        { field: "revenue", headerName: "Revenue", flex: 0.16, minWidth: 120 },
      ];
    }

    return [
      { field: "sl", headerName: "SL", flex: 0.08, minWidth: 60 },
      { field: "date", headerName: "Date", flex: 0.16, minWidth: 120 },
      { field: "dayOfWeek", headerName: "Day", flex: 0.14, minWidth: 100 },
      { field: "ordersCompleted", headerName: "Orders Completed", flex: 0.2, minWidth: 140 },
      { field: "grossRevenue", headerName: "Gross Revenue", flex: 0.2, minWidth: 130 },
      { field: "avgOrderValue", headerName: "Avg. Order Value", flex: 0.18, minWidth: 130 },
    ];
  }, [activeTab]);

  const isLoading = isDailyLoading || isZoneLoading || isShopLoading;
  if (isLoading) return <Delay />;

  return (
    <div className="!space-y-6">
      <Tabs
        value={activeTab}
        onChange={(_, next) => setActiveTab(next)}
        sx={{ borderBottom: "1px solid #E5E7EB", "& .MuiTab-root": { textTransform: "none" } }}
      >
        <Tab value="daily" label="Daily Earnings" />
        <Tab value="zone" label="Daily Earnings by Zone" />
        <Tab value="shop" label="Daily Earnings by Shop" />
      </Tabs>
      <div className="w-full overflow-auto">
        <DataTable
          data={reportData}
          columns={columns}
          searchPlaceholder="Search by date..."
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
