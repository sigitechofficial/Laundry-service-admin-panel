import { useMemo, useState } from "react";
import { Table } from "../../design-system";
import {
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryMoney,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import {
  useReportsDailyEarningsByShopQuery,
  useReportsDailyEarningsByZoneQuery,
  useReportsDailyEarningsQuery,
} from "../../store/services/api";
import ReportToolbar, { ReportPagination, ReportTabs } from "./ReportToolbar";
import { useReportFilters } from "./reportQueryUtils";
import { downloadReportCsv, ReportInfo, reportMoney, ReportQueryState, unwrapReport } from "./reportUi.js";
import { formatDate } from "../../utilities/formatters";

const EARNING_TABS = [
  { value: "daily", label: "Daily Earnings" },
  { value: "zone", label: "Daily Earnings by Zone" },
  { value: "shop", label: "Daily Earnings by Shop" },
];

export default function DailyEarningReport() {
  const [activeTab, setActiveTab] = useState("daily");
  const f = useReportFilters();

  const dailyQ = useReportsDailyEarningsQuery(f.params, { skip: activeTab !== "daily" });
  const zoneQ = useReportsDailyEarningsByZoneQuery(f.params, { skip: activeTab !== "zone" });
  const shopQ = useReportsDailyEarningsByShopQuery(f.params, { skip: activeTab !== "shop" });

  const active = activeTab === "zone" ? zoneQ : activeTab === "shop" ? shopQ : dailyQ;
  const { rows, total, summary, currency } = unwrapReport(active.data);

  const reportData = useMemo(
    () =>
      rows.map((row, idx) => ({
        ...row,
        id: `${row.sl || idx + 1}-${row.shopName || row.zoneName || ""}-${idx}`,
        sl: row.sl ?? idx + 1,
        date: formatDate(row.date),
        dayOfWeek: row.dayOfWeek ?? "—",
        ordersCompleted: row.ordersCompleted ?? null,
        avgOrderValue: row.avgOrderValue ?? null,
        zoneName: row.zoneName ?? "—",
        shopName: row.shopName ?? "—",
        revenue: row.revenue ?? row.grossRevenue ?? null,
        grossRevenue: row.grossRevenue ?? row.revenue ?? null,
      })),
    [rows]
  );

  const columns = useMemo(() => {
    if (activeTab === "zone") {
      return [
        { key: "date", header: "Date", render: (row) => <DirectoryIdentity name={row.date} /> },
        { key: "dayOfWeek", header: "Day", render: (row) => row.dayOfWeek },
        { key: "zoneName", header: "Zone", render: (row) => <DirectoryIdentity name={row.zoneName} /> },
        {
          key: "ordersCompleted",
          header: "Orders",
          render: (row) => <DirectoryMetric value={row.ordersCompleted ?? "—"} />,
        },
        {
          key: "revenue",
          header: "Revenue",
          render: (row) => <DirectoryMoney>{reportMoney(row.revenue, currency)}</DirectoryMoney>,
        },
      ];
    }
    if (activeTab === "shop") {
      return [
        { key: "date", header: "Date", render: (row) => <DirectoryIdentity name={row.date} /> },
        { key: "dayOfWeek", header: "Day", render: (row) => row.dayOfWeek },
        { key: "shopName", header: "Shop", render: (row) => <DirectoryIdentity name={row.shopName} /> },
        { key: "zoneName", header: "Zone", render: (row) => row.zoneName },
        {
          key: "ordersCompleted",
          header: "Orders",
          render: (row) => <DirectoryMetric value={row.ordersCompleted ?? "—"} />,
        },
        {
          key: "revenue",
          header: "Revenue",
          render: (row) => <DirectoryMoney>{reportMoney(row.revenue, currency)}</DirectoryMoney>,
        },
      ];
    }
    return [
      { key: "date", header: "Date", render: (row) => <DirectoryIdentity name={row.date} /> },
      { key: "dayOfWeek", header: "Day", render: (row) => row.dayOfWeek },
      {
        key: "ordersCompleted",
        header: "Orders",
        render: (row) => <DirectoryMetric value={row.ordersCompleted ?? 0} />,
      },
      {
        key: "avgOrderValue",
        header: "Avg order",
        render: (row) => <DirectoryMoney>{reportMoney(row.avgOrderValue, currency)}</DirectoryMoney>,
      },
      {
        key: "grossRevenue",
        header: "Revenue",
        render: (row) => <DirectoryMoney>{reportMoney(row.grossRevenue, currency)}</DirectoryMoney>,
      },
    ];
  }, [activeTab, currency]);

  const exportColumns = useMemo(() => {
    if (activeTab === "zone") {
      return [
        { key: "date", header: "Date" },
        { key: "dayOfWeek", header: "Day" },
        { key: "zoneName", header: "Zone" },
        { key: "ordersCompleted", header: "Orders" },
        { key: "revenue", header: "Revenue" },
      ];
    }
    if (activeTab === "shop") {
      return [
        { key: "date", header: "Date" },
        { key: "dayOfWeek", header: "Day" },
        { key: "shopName", header: "Shop" },
        { key: "zoneName", header: "Zone" },
        { key: "ordersCompleted", header: "Orders" },
        { key: "revenue", header: "Revenue" },
      ];
    }
    return [
      { key: "date", header: "Date" },
      { key: "dayOfWeek", header: "Day" },
      { key: "ordersCompleted", header: "Orders" },
      { key: "avgOrderValue", header: "Avg order" },
      { key: "grossRevenue", header: "Revenue" },
    ];
  }, [activeTab]);

  const summaryItems = useMemo(() => {
    const items = [
      { label: activeTab === "daily" ? "Days" : "Rows", value: summary.days ?? summary.rows ?? total, tone: "brand" },
    ];
    if (summary.orders != null) {
      items.push({ label: "Orders", value: summary.orders, tone: "navy" });
    }
    items.push({ label: "Revenue", value: reportMoney(summary.revenue, currency), tone: "success" });
    return items;
  }, [activeTab, currency, summary.days, summary.orders, summary.revenue, summary.rows, total]);

  return (
    <ReportQueryState
      isLoading={active.isLoading}
      isError={active.isError}
      error={active.error}
      onRetry={active.refetch}
    >
      <div>
        <ReportInfo>
          {activeTab === "daily"
            ? "Gross completed-order revenue by collection date. Search does not apply on this tab."
            : activeTab === "zone"
              ? "Daily revenue grouped by zone. Zone names are labels only — the API does not return zone IDs for drill-down."
              : "Daily revenue grouped by shop. Search matches shop name. Shop names are labels only until the API returns shop IDs."}
        </ReportInfo>
        <ReportTabs
          tabs={EARNING_TABS}
          value={activeTab}
          onChange={(tab) => {
            setActiveTab(tab.value);
            f.setPage(1);
          }}
        />
        <DirectoryMetrics items={summaryItems} />
        <DirectoryTableWrap
          toolbar={
            <ReportToolbar
              search={f.search}
              onSearch={f.setSearch}
              searchPlaceholder={activeTab === "shop" ? "Search by shop…" : "Search…"}
              hideSearch={activeTab === "daily" || activeTab === "zone"}
              period={f.period}
              onPeriodChange={f.setPeriod}
              startDate={f.startDate}
              endDate={f.endDate}
              onStartDateChange={f.setStartDate}
              onEndDateChange={f.setEndDate}
              zoneId={f.zoneId}
              onZoneIdChange={f.setZoneId}
              shopId={f.shopId}
              onShopIdChange={f.setShopId}
              onClear={f.clearFilters}
              onExport={() => downloadReportCsv(`daily-earnings-${activeTab}.csv`, exportColumns, reportData)}
              exportDisabled={!reportData.length}
            />
          }
          footer={
            <ReportPagination
              page={f.page}
              pageSize={f.limit}
              totalRows={total}
              onPageChange={f.setPage}
              onPageSizeChange={f.setLimit}
            />
          }
        >
          <Table columns={columns} rows={reportData} rowKey={(row) => row.id} empty="No earnings in this period" />
        </DirectoryTableWrap>
      </div>
    </ReportQueryState>
  );
}
